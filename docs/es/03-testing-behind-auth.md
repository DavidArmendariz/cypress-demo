# 3. Probar detrás de la autenticación

*[English](../en/03-testing-behind-auth.md) · [Español](../es/03-testing-behind-auth.md)*

- Prueba el formulario de login por la UI una sola vez. En el resto, inicia sesión por API y cachea la sesión.
- `cy.session` con un callback `validate` es todo el mecanismo.
- Las specs que verifican la barrera de autenticación deben, explícitamente, *no* usar la sesión cacheada.

Aquí se gana o se pierde una suite para una aplicación con sesión. Una suite de 25 specs que hace
login por formulario en cada `beforeEach` gasta la mayor parte de su tiempo tecleando una contraseña, y
todas esas pruebas se rompen cuando cambia el formulario de login.

## Iniciar sesión por API

```ts
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

Cinco detalles sostienen todo lo demás:

1. **El id de la sesión contiene el email, nunca la contraseña.** Ese id se imprime en el command log
   y en la salida de CI.
2. **La función de setup afirma.** `cy.session` cachea el estado que exista cuando termina el setup.
   Sin el `.should('eq', 200)`, un login fallido se cachea como si hubiera funcionado, y todas las
   pruebas siguientes fallan en algún punto confuso.
3. **`validate` llama a un endpoint autenticado barato.** Si la API se reinició, el token expiró, o un
   reset de base de datos recreó al usuario con un id nuevo, la validación falla y el setup se vuelve
   a ejecutar automáticamente. Eso es lo que hace seguro el cacheo entre specs.
4. **`cacheAcrossSpecs: true`** significa que el login ocurre una vez por ejecución y no una vez por
   archivo de spec. Todas las llamadas deben pasar exactamente el mismo `id`, `setup`, `validate` y
   `cacheAcrossSpecs`, y por eso esto pertenece a un solo comando en lugar de copiarse y pegarse.
5. **No hay ningún `cy.visit()` dentro del comando.** De eso se encarga quien lo llama:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginByApi()
  cy.visit('/projects')   // aquí, una vez, después del login
})
```

Si pones el visit dentro del comando de login, visitas dos veces por prueba. Si lo omites del todo y
el aislamiento de pruebas está activo, la prueba empieza en una página en blanco y todo comando
posterior falla.

## Dónde vive el token

Prefiere una **cookie httpOnly** antes que un token en `localStorage`. Dos razones, y la primera
importa más que la de testing:

- Un script inyectado en la página no puede leer una cookie httpOnly.
- Cypress cachea y restaura cookies de forma nativa, así que `cy.session` no necesita fontanería extra.

Si tu aplicación sí guarda un token en `localStorage`, la función de setup tiene que escribirlo ella
misma, y eso es más delicado de lo que parece porque depende de que el navegador ya esté en el origen
correcto. Es viable, simplemente es una razón para preferir la cookie cuando la decisión aún está
abierta.

El estado de UI no sensible puede vivir en `localStorage` sin problema. `cy.session` lo captura y lo
restaura junto con las cookies.

## La única spec de login por UI

Escribe exactamente una spec que conduzca el formulario real: éxito, contraseña incorrecta, cuenta
inexistente, validación en cliente y el estado deshabilitado mientras se envía. Esa spec es toda la
justificación para saltarse el formulario en el resto de la suite.

Mantén un comando `loginByUi` aparte para ella si quieres, pero que no lo llame nada más.

## Specs que no deben usar la caché

Cualquier spec que pruebe la barrera de autenticación necesita un navegador realmente deslogueado, y
como las sesiones con `cacheAcrossSpecs` sobreviven entre archivos de spec, tiene que pedirlo:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.clearAllCookies()
  cy.clearAllLocalStorage()
})

it('redirige un enlace profundo al login y recuerda el destino', () => {
  cy.visit('/projects/abc123')

  cy.location('pathname').should('eq', '/login')
  cy.location('search').should('contain', 'redirect=')
})
```

Cubre también el estado intermedio. Una comprobación de sesión lenta debe mostrar un estado de carga y
nunca debe renderizar datos protegidos antes de resolverse:

```ts
cy.intercept('GET', '/api/auth/me', (req) => {
  req.on('response', (res) => {
    res.setDelay(300)
  })
}).as('me')

cy.visit('/projects')

cy.getByData('auth-loading').should('be.visible')
cy.getByData('project-list').should('not.exist')
```

## Expiración de sesión

No puedes esperar a que caduque un token dentro de una spec, y no deberías reiniciar la API desde una.
Simula el 401, que es lo único a lo que el cliente reacciona de verdad:

```ts
cy.intercept('GET', '/api/projects', {
  statusCode: 401,
  body: { error: { message: 'Session expired', code: 'session_expired' } },
}).as('expired')

cy.visit('/projects')

cy.wait('@expired')
cy.location('pathname').should('eq', '/login')
```

Y después verifica la barrera real contra el servidor real, sin navegador de por medio:

```ts
cy.clearCookie('session_token')

cy.request({ url: '/api/projects', failOnStatusCode: false }).then((response) => {
  expect(response.status).to.eq(401)
})
```

## Varias personas usuarias y roles

Casi todas las suites reales necesitan más de una cuenta: administración, miembro, alguien de solo
lectura, alguien de otra organización. `cy.session` lo gestiona bien, pero las reglas sobre la clave
de caché son fáciles de equivocar y el fallo es silencioso.

### El id es la clave de caché

Todo lo que varía entre sesiones tiene que aparecer en el id. Este es el error clásico:

```ts
// Mal. El id ignora el rol, así que la segunda llamada devuelve la sesión de admin.
Cypress.Commands.add('loginAs', (email: string, role: string) => {
  cy.session([email], () => {
    cy.request('POST', '/api/auth/login', { email, role })
  })
})
```

Dos llamadas con el mismo email y distinto rol producen una sola entrada en caché. La segunda prueba
se ejecuta en silencio como la primera persona usuaria, y falla en algún punto lejos de la causa.

Pon en el id todos los parámetros que varían, y **añade un prefijo con el mecanismo de login** para
que dos formas distintas de autenticarse no puedan colisionar:

```ts
cy.session(['loginByApi', email, role], /* ... */)
cy.session(['loginByForm', email], /* ... */)
```

Las constantes que nunca cambian no pertenecen al id. Las contraseñas y los tokens tampoco: el id se
muestra en el reporter y en los logs de CI.

### Define la sesión una sola vez

Con `cacheAcrossSpecs: true`, todos los puntos de llamada deben pasar un `id`, un `setup`, un
`validate` y un `cacheAcrossSpecs` **idénticos**. Si dos specs escriben en línea sus propios bloques
`cy.session` y uno de ellos se desvía, Cypress lanza un error en lugar de restaurar la sesión
cacheada.

Así que poner `cy.session` dentro de un único comando personalizado no es una preferencia de estilo,
es lo que hace que el cacheo entre specs funcione siquiera:

```ts
const CREDENTIALS = {
  admin: 'admin@example.com',
  member: 'member@example.com',
  viewer: 'viewer@example.com',
} as const

type Role = keyof typeof CREDENTIALS

Cypress.Commands.add('loginAs', (role: Role) => {
  cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
    ({ testUserPassword }) => {
      cy.session(
        ['loginByApi', role],
        () => {
          cy.request({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: CREDENTIALS[role], password: testUserPassword },
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
    },
  )
})
```

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginAs('member')
  cy.visit('/projects')
})
```

Cada rol obtiene su propia entrada en caché, y cada uno se crea una vez por ejecución en lugar de una
vez por spec.

### Por qué aquí `validate` no es opcional

Resetea la base de datos y todas las sesiones cacheadas quedan obsoletas a la vez, porque las cuentas
se recrean con ids nuevos mientras los tokens cacheados siguen apuntando a los antiguos.

`validate` es lo que convierte eso en un no-evento: la comprobación falla, el setup se vuelve a
ejecutar, la prueba continúa. Sin él te encuentras una ráfaga de 401 confusos en la spec que toque
ejecutarse después. Cuantas más cuentas cachees, más importa esto.

El orden importa en `beforeEach`: primero el reset, después el login. Al revés, inicias sesión e
inmediatamente invalidas la sesión que acabas de crear.

### Cambiar de persona usuaria dentro de una prueba

A veces el comportamiento bajo prueba *es* el traspaso: alguien hace algo y otra persona ve el
resultado. Puedes cambiar de sesión a mitad de prueba, y no hace falta cerrar la sesión anterior,
porque `cy.session` limpia cookies, almacenamiento y la página antes de ejecutar el setup.

```ts
it('muestra el proyecto a un miembro invitado cuando acepta', () => {
  cy.loginAs('admin')
  cy.visit('/projects/abc123/members')
  cy.getByData('invite-email').type('member@example.com')
  cy.getByData('invite-submit').click()
  cy.wait('@sendInvite')

  cy.loginAs('member')
  cy.visit('/projects/abc123')          // la página se limpió, así que hay que visitar de nuevo

  cy.getByData('project-title').should('have.text', 'Migration plan')
})
```

Lo único que hay que recordar es ese segundo `cy.visit()`. Cambiar de sesión te deja en una página en
blanco, así que todo comando posterior falla hasta que navegues.

### Mejor no cambiar cuando solo necesitas el efecto

Cambiar de sesión cuesta una carga de página. Cuando las acciones de la segunda persona son
preparación y no lo que se está verificando, hazlas por API y quédate con la sesión de quien
realmente protagoniza la prueba:

```ts
it('muestra una notificación cuando otra persona comenta', () => {
  cy.loginAs('member')

  // La otra persona nunca toca el navegador. Actuar en su nombre es otra forma
  // de sembrar datos, así que pasa por el endpoint solo de pruebas.
  cy.seed({
    comments: [{ author: 'admin@example.com', projectId: 'abc123', body: 'Ping' }],
  })

  cy.visit('/projects/abc123')
  cy.getByData('notification-badge').should('have.text', '1')
})
```

Si el efecto tiene que pasar por la lógica real de la aplicación y no por una siembra, dale al router
solo de pruebas un endpoint que ejecute una acción en nombre de una persona concreta, y mantenlo
detrás de la misma variable que todo lo demás en [01-project-setup.md](01-project-setup.md).

Una regla útil: cambia de sesión cuando lo que se prueba es *la experiencia de la segunda persona*.
Usa `cy.request` cuando solo necesitas su efecto.

### Dos personas usuarias a la vez

No puedes tener dos sesiones activas en un mismo navegador de forma simultánea. Si una prueba
necesita concurrencia de verdad, por ejemplo una actualización en tiempo real que llega mientras otra
persona está mirando, conduce al segundo actor íntegramente con `cy.request` mientras el navegador
mantiene la sesión de la primera.

### Vida de la caché

Conviene saberlo para que los números de tus logs de CI tengan sentido:

- La caché vive en memoria durante una ejecución, en una máquina. No se escribe en disco.
- Una ejecución nueva empieza vacía, así que el setup se ejecuta otra vez.
- En CI en paralelo, el setup se ejecuta al menos una vez **por máquina**. Cuatro contenedores
  significan cuatro logins por rol, y eso es lo esperado, no un error.
- Las sesiones cacheadas son inmutables. Para representar un estado distinto, usa un id nuevo en lugar
  de intentar mutar una sesión existente.

Mientras depuras, `Cypress.session.clearAllSavedSessions()` fuerza que todos los setup se repitan.

### Probar permisos

Verifica la barrera en la API además de en la UI. Un botón oculto es una funcionalidad de usabilidad,
no un control de autorización, y las dos cosas se desincronizan a menudo:

```ts
cy.loginAs('viewer')

cy.request({ method: 'DELETE', url: `/api/projects/${id}`, failOnStatusCode: false })
  .its('status')
  .should('eq', 403)
```

Ver [06-component-vs-e2e.md](06-component-vs-e2e.md) para saber por qué estas pruebas pertenecen a las
specs de API.

## El antipatrón que reemplaza

```ts
// No hagas esto en 25 archivos de spec.
beforeEach(() => {
  cy.visit('/login')
  cy.get('#email').type('user@example.com')
  cy.get('#password').type('hunter2')
  cy.get('button[type=submit]').click()
  cy.wait(2000)
})
```

Lento, y ahora todas esas pruebas fallan cuando cambia el formulario de login, por motivos que no
tienen nada que ver con lo que estaban probando.
