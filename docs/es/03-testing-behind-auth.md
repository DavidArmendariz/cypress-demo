# 3. Probar detrás de la autenticación

*[English](../en/03-testing-behind-auth.md) · [Español](../es/03-testing-behind-auth.md)*

- Prueba el formulario de login por la UI una sola vez. En el resto, inicia sesión por API y cachéala.
- `cy.session` con un callback `validate` es todo el mecanismo.
- Las specs que verifican la barrera de autenticación deben, explícitamente, *no* usar la sesión cacheada.

Aquí es donde se gana o se pierde una suite con autenticación. Una suite de 25 specs que hace login
por formulario en cada `beforeEach` gasta la mayor parte de su tiempo tecleando una contraseña.

## Iniciar sesión por API

```ts
// cypress/support/commands.ts
Cypress.Commands.add('loginByApi', (email?: string, password?: string) => {
  cy.env<{ testUserEmail: string; testUserPassword: string }>(
    ['testUserEmail', 'testUserPassword'],
    { log: false },
  ).then(({ testUserEmail, testUserPassword }) => {
    const user = email ?? testUserEmail
    const secret = password ?? testUserPassword

    cy.session(
      ['api-login', user],
      () => {
        cy.request({
          method: 'POST',
          url: '/api/auth/login',
          body: { email: user, password: secret },
          log: false,
        })
          .its('status')
          .should('eq', 200)
      },
      {
        validate() {
          cy.request({ url: '/api/auth/me', failOnStatusCode: false })
            .its('status')
            .should('eq', 200)
        },
        cacheAcrossSpecs: true,
      },
    )
  })
})
```

Aquí hay cinco cosas que sostienen todo lo demás:

1. **El id de la sesión contiene el email, nunca la contraseña.** Ese id se imprime en el command log
   y en la salida de CI.
2. **`setup` afirma.** `cy.session` cachea el estado que exista cuando termina el setup. Sin el
   `.should('eq', 200)`, un login fallido se cachea como si hubiera funcionado.
3. **`validate` llama a un endpoint autenticado barato.** Si la API se reinició, o el token expiró, o
   un `cy.resetDb()` recreó al usuario con un id nuevo, la validación falla y el setup se vuelve a
   ejecutar automáticamente. Eso es lo que hace seguro a `cacheAcrossSpecs`.
4. **`cacheAcrossSpecs: true`** significa que el login ocurre una vez por ejecución, no una vez por
   archivo de spec. Todas las llamadas deben pasar exactamente el mismo `id`, `setup`, `validate` y
   `cacheAcrossSpecs`, y por eso esto vive en un solo comando en lugar de copiarse y pegarse.
5. **No hay ningún `cy.visit()` dentro del comando.** De eso se encarga quien lo llama:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginByApi()
  cy.visit('/todos')   // aquí, una vez, después del login
})
```

Si pones el visit dentro del comando de login, visitas dos veces por prueba. Si lo omites del todo y
el aislamiento de pruebas está activo, la prueba empieza en una página en blanco y todo comando
posterior falla.

## Por qué el token es una cookie

`server/auth.ts` guarda el JWT en una cookie httpOnly. Dos ventajas:

- Un script inyectado en la página no puede leerlo.
- Cypress cachea y restaura cookies de forma nativa, así que `cy.session` no necesita fontanería
  extra. Si tu aplicación guarda un token en `localStorage`, la función de setup tiene que escribirlo
  ella misma, y eso es más delicado de lo que parece. Prefiere la cookie.

El estado de UI no sensible sí puede vivir en `localStorage`; `src/pages/TodosPage.tsx` guarda ahí el
filtro seleccionado, y `cypress/e2e/todos/filters.cy.ts` verifica que sobrevive a un reload.

## La única spec de login por UI

`cypress/e2e/auth/login-ui.cy.ts` conduce el formulario real: éxito, contraseña incorrecta, cuenta
inexistente, validación en cliente y el estado deshabilitado mientras se envía. Esa spec es toda la
justificación para saltarse el formulario en el resto de la suite. `cy.loginByUi` existe en
`commands.ts` para ella, y no lo usa nada más, a propósito.

## Specs que no deben usar la caché

`cypress/e2e/auth/route-guard.cy.ts` prueba la barrera en sí, así que la mitad sin sesión lo dice de
forma explícita:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.clearAllCookies()
  cy.clearAllLocalStorage()
})
```

Como las sesiones con `cacheAcrossSpecs` sobreviven entre archivos de spec, una spec que necesita un
navegador realmente deslogueado tiene que pedirlo. Esa spec cubre además los estados intermedios: un
`/api/auth/me` con retraso debe mostrar `auth-loading` y nunca debe renderizar datos de todos antes de
que la comprobación termine.

## Expiración de sesión

No puedes esperar a que caduque un token dentro de una spec, y no deberías reiniciar la API desde una.
Simula el 401, que es lo único a lo que el cliente reacciona de verdad:

```ts
// cypress/e2e/auth/session-expiry.cy.ts
cy.intercept('GET', '/api/todos', {
  statusCode: 401,
  body: { error: { message: 'Session expired', code: 'session_expired' } },
}).as('expiredTodos')
```

Y después verifica la barrera de seguridad real contra el servidor real, sin navegador de por medio:

```ts
cy.clearCookie('todo_demo_token')
cy.request({ url: '/api/todos', failOnStatusCode: false }).then((response) => {
  expect(response.status).to.eq(401)
})
```

## Antipatrón que reemplaza

```ts
// No hagas esto en 25 archivos de spec.
beforeEach(() => {
  cy.visit('/login')
  cy.get('#email').type('demo@example.com')
  cy.get('#password').type('Password123!')
  cy.get('button[type=submit]').click()
  cy.wait(2000)
})
```

Lento, y además todas esas pruebas fallan cuando cambia el formulario de login, por motivos que no
tienen nada que ver con lo que estaban probando.
