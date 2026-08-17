# 5. Control de la red

*[English](../en/05-network-control.md) · [Español](../es/05-network-control.md)*

- Nunca `cy.wait(número)`. Espera a una petición con alias o afirma sobre un estado.
- Peticiones reales para el camino feliz. Stubs para los fallos y para estados inalcanzables de otro modo.
- Afirma sobre la petición que la aplicación envió de verdad, no sobre la que esperabas que enviara.

## Esperar

```ts
cy.intercept('POST', '/api/projects').as('createProject')

cy.getByData('new-project-input').type('Migration plan')
cy.getByData('create-project-submit').click()

cy.wait('@createProject').its('response.statusCode').should('eq', 201)
cy.getByData('project-item').should('have.length', 1)
```

`cy.wait('@alias')` espera exactamente lo que tarde la petición. `cy.wait(2000)` espera dos segundos:
demasiado en una máquina rápida, insuficiente en un runner de CI cargado, y hace la suite más lenta
cada vez que alguien añade uno. Esos números solo crecen.

La mayor parte del tiempo no necesitas ninguna espera explícita, porque las aserciones reintentan:

```ts
cy.getByData('project-item').should('have.length', 1)
```

Eso sondea hasta que la lista coincide o expira el timeout. Usa una espera con alias cuando quieras
afirmar algo sobre la *propia petición*, o cuando necesites un punto de sincronización firme antes de
cambiar un stub.

Un truco útil al construir una suite: si una mutación se resuelve al instante en desarrollo, una spec
descuidada puede pasar por accidente. Introducir una pequeña latencia artificial en las escrituras de
tu entorno de pruebas obliga a las specs a esperar a una señal real.

## Real frente a stub

| Situación | Enfoque |
|---|---|
| Camino feliz | Petición real. Es lo único que demuestra que cliente y API están de acuerdo. |
| 500, 404, 401 | Stub. No puedes pedirle un error a un servidor sano. |
| Conexión caída | Stub con `forceNetworkError`. |
| Estado de carga | Stub con `delay`, o retrasa una respuesta real. |
| Forma de datos cara de crear | Stub. Crear 50 registros por la UI es una tarea pesada, no una prueba. |

```ts
cy.intercept('GET', '/api/projects', {
  statusCode: 500,
  body: { error: { message: 'Server error. Please try again.', code: 'server_error' } },
}).as('failedLoad')

cy.intercept('GET', '/api/projects', { forceNetworkError: true }).as('droppedLoad')

cy.intercept('GET', '/api/projects', (req) => {
  req.reply({ statusCode: 200, body: { projects: [] }, delay: 600 })
}).as('slowLoad')
```

Retrasar una respuesta *real* es una herramienta distinta de simular el cuerpo:

```ts
cy.intercept('POST', '/api/auth/login', (req) => {
  req.on('response', (res) => {
    res.setDelay(400)
  })
}).as('login')
```

La respuesta es genuina, solo se manipula su tiempo. Eso es lo que hace que una aserción sobre el
estado deshabilitado mientras se envía sea significativa y no una carrera.

**No simules todo.** Una suite totalmente simulada pasa mientras el producto está roto, porque solo
prueba el cliente contra tus suposiciones sobre la API. Las pruebas de contrato son la protección
contra esa desviación: ver [06-component-vs-e2e.md](06-component-vs-e2e.md).

## Afirma sobre la petición saliente

```ts
cy.wait('@signup').then(({ request, response }) => {
  expect(request.body).to.include({ email, name: 'Ada Lovelace' })
  expect(response?.statusCode).to.eq(201)
})
```

Para "esta petición no debe ocurrir nunca", usa un spy en lugar de mirar el reloj:

```ts
cy.intercept('POST', '/api/auth/login', cy.spy().as('loginRequest'))

cy.getByData('login-submit').click()

cy.getByData('login-email-error').should('be.visible')
cy.get('@loginRequest').should('not.have.been.called')
```

Eso es una aserción real sobre la validación en cliente. `cy.wait(1000)` y cruzar los dedos, no.

## Superponer stubs dentro de una prueba

Los interceptores están acotados a la prueba, así que no se filtra nada entre ellas. Dentro de una
prueba puedes superponer un segundo `cy.intercept` sobre la misma ruta para cambiar el comportamiento
a mitad del flujo, que es como se prueba un camino de reintento:

```ts
cy.intercept('GET', '/api/projects', { statusCode: 500, body: serverError }).as('failedLoad')
cy.visit('/projects')
cy.wait('@failedLoad')
cy.getByData('projects-error').should('be.visible')

cy.intercept('GET', '/api/projects', { statusCode: 200, body: { projects: [] } }).as('retried')
cy.getByData('projects-retry').click()

cy.wait('@retried')
cy.getByData('projects-error').should('not.exist')
cy.getByData('projects-empty').should('be.visible')
```

Afirmar que el error **desaparece** importa tanto como afirmar que apareció. Los banners de error que
se quedan colgados son un defecto común y fácil de pasar por alto.

## Errores que vale la pena cubrir

Una vez montada la fontanería, estos cuatro cuestan unas diez líneas cada uno y detectan problemas
reales:

- La lista falla al cargar, y el reintento funciona.
- Se cae la conexión, y el mensaje se distingue del de un error de servidor.
- Una escritura falla, y se conserva lo que la persona había escrito en lugar de borrarlo.
- Una respuesta lenta muestra un estado de carga, y los controles quedan deshabilitados mientras está en vuelo.
