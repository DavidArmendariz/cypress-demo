# 5. Control de la red

*[English](../en/05-network-control.md) · [Español](../es/05-network-control.md)*

- Nunca `cy.wait(número)`. Espera a una petición con alias o afirma sobre un estado.
- Peticiones reales para el camino feliz. Stubs para los fallos y para estados inalcanzables de otro modo.
- Afirma sobre la petición que la aplicación envió de verdad, no sobre la que esperabas que enviara.

## Esperar

```ts
// cypress/e2e/todos/crud.cy.ts
cy.intercept('POST', '/api/todos').as('createTodo')

cy.getByData('new-todo-input').type('Write the docs')
cy.getByData('add-todo-submit').click()

cy.wait('@createTodo').its('response.statusCode').should('eq', 201)
cy.getByData('todo-item').should('have.length', 1)
```

`cy.wait('@alias')` espera exactamente lo que tarde la petición. `cy.wait(2000)` espera dos segundos:
demasiado en una máquina rápida, insuficiente en un runner de CI cargado, y hace la suite más lenta
cada vez que alguien añade uno. La regla `no-unnecessary-waiting` de `eslint-plugin-cypress` lo
convierte en error en este repositorio.

La mayor parte del tiempo no necesitas `cy.wait` en absoluto. Las aserciones reintentan:

```ts
cy.getByData('todo-item').should('have.length', 1)
```

Eso sondea hasta que la lista de elementos coincide o expira el timeout. Usa una espera con alias
cuando quieras afirmar algo sobre la *petición* en sí, o cuando necesites un punto de sincronización
firme antes de cambiar un stub.

Fíjate en que el servidor añade un pequeño retraso deliberado a las escrituras
(`server/routes/todos.ts`). Sin él, las mutaciones se resuelven tan rápido que una spec descuidada
pasa por accidente.

## Real frente a stub

La regla que se usa aquí:

| Situación | Enfoque |
|---|---|
| Camino feliz | Petición real. Es lo único que demuestra que el cliente y la API están de acuerdo. |
| 500, 404, 401 | Stub. No puedes pedirle un error a un servidor sano. |
| Conexión caída | Stub con `forceNetworkError`. |
| Estado de carga | Stub con `delay`, o `res.setDelay()`. |
| Una forma de datos cara de crear | Stub. 50 registros por la UI no es una prueba, es una tarea pesada. |

Los cinco aparecen en `cypress/e2e/todos/network-failures.cy.ts`:

```ts
cy.intercept('GET', '/api/todos', { statusCode: 500, body: { /* ... */ } }).as('failedLoad')
cy.intercept('GET', '/api/todos', { forceNetworkError: true }).as('droppedLoad')
cy.intercept('GET', '/api/todos', (req) => {
  req.reply({ statusCode: 200, body: { todos: [] }, delay: 600 })
}).as('slowLoad')
```

Retrasar una respuesta *real*, en lugar de simular el cuerpo, es una herramienta distinta:

```ts
cy.intercept('POST', '/api/auth/login', (req) => {
  req.on('response', (res) => {
    res.setDelay(400)
  })
}).as('login')
```

La respuesta es genuina; solo se manipula su tiempo. Eso es lo que da sentido a la aserción sobre el
estado deshabilitado mientras se envía en `cypress/e2e/auth/login-ui.cy.ts`.

Si simulas todo acabas con una suite que pasa mientras el producto está roto, porque solo prueba el
cliente contra tus suposiciones sobre la API. De eso protege `cypress/e2e/api/auth-api.cy.ts`: si las
specs de cliente pasan y las de contrato fallan, tus stubs se han desviado.

## Afirmar sobre la petición saliente

```ts
// cypress/e2e/auth/signup.cy.ts
cy.wait('@signup').then(({ request, response }) => {
  expect(request.body).to.include({ email, name: 'Ada Lovelace' })
  expect(response?.statusCode).to.eq(201)
})
```

Y para "esta petición no debe ocurrir nunca", usa un spy en lugar de mirar el reloj:

```ts
cy.intercept('POST', '/api/auth/login', cy.spy().as('loginRequest'))
cy.getByData('login-submit').click()
cy.get('@loginRequest').should('not.have.been.called')
```

Eso es una aserción real sobre la validación en cliente. `cy.wait(1000)` y cruzar los dedos, no.

## Restaurar después de un stub

Los interceptores son por prueba, así que no se filtra nada. Dentro de una prueba puedes superponer un
segundo `cy.intercept` sobre la misma ruta para cambiar el comportamiento a mitad del flujo, que es
como se prueba el camino de reintento:

```ts
cy.intercept('GET', '/api/todos', { statusCode: 500, /* ... */ }).as('failedLoad')
cy.visit('/todos')
cy.wait('@failedLoad')

cy.intercept('GET', '/api/todos', { statusCode: 200, body: { todos: [] } }).as('retriedLoad')
cy.getByData('todos-retry').click()
cy.wait('@retriedLoad')
cy.getByData('todos-error').should('not.exist')
```
