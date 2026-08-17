# 7. Secretos y variables de entorno

*[English](../en/07-secrets-and-env.md) · [Español](../es/07-secrets-and-env.md)*

- `Cypress.env()` está obsoleto desde Cypress 15.10. Usa `cy.env([...])`.
- `cy.env()` para secretos, `Cypress.expose()` para configuración pública.
- `allowCypressEnv: false` convierte la vieja costumbre en un error inmediato.

Casi todo el material que hay en internet es anterior a este cambio, así que vale la pena detallarlo.

## Por qué se marcó como obsoleto `Cypress.env()`

`Cypress.env()` volcaba **todas** las variables de entorno en el navegador. Un `console.log`, un
informe de error, una captura del command log, y una clave de API de staging acaba en un sitio donde no
debería estar.

`cy.env()` expone solo las claves que nombras, es asíncrono para encajar en la cadena de comandos, y
pasa únicamente esas claves a los contextos de `cy.origin()`.

## Los dos accesores

```ts
// Secretos. Asíncrono, entrega solo las claves solicitadas.
cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
  ({ testUserPassword }) => {
    cy.getByData('login-password').type(testUserPassword, { log: false })
  },
)

// Configuración pública, no sensible. Sincrónico.
const apiVersion = Cypress.expose('apiVersion')
```

Configúralos por separado, porque tienen perfiles de riesgo distintos:

```ts
export default defineConfig({
  expose: { apiVersion: 'v2', environment: 'staging' },  // seguro en el navegador
  allowCypressEnv: false,                                // bloquea el accesor obsoleto
})
```

## De dónde vienen los secretos

Nunca de la configuración versionada. Dos orígenes, leídos de forma idéntica por `cy.env()`:

- **`cypress.env.json`** en local, en el gitignore. Versiona un `cypress.env.example.json` con
  placeholders para que un clon nuevo sepa qué rellenar, y que tu script de instalación lo copie en su
  sitio.
- **Variables de entorno `CYPRESS_*`** en CI, alimentadas desde tu gestor de secretos:

```yaml
env:
  CYPRESS_testUserEmail: qa-user@example.com
  CYPRESS_testUserPassword: ${{ secrets.TEST_USER_PASSWORD }}
```

Ninguna spec se ramifica según el entorno. El mismo `cy.env(['testUserPassword'])` funciona en los dos.

## Qué hacer con el valor una vez lo tienes

`cy.env()` registra los nombres de las claves, nunca los valores. Esa protección termina en el límite
del comando, así que:

- **Mantén el secreto dentro del callback `.then()`.** No lo asignes a una variable de módulo que algo
  más pueda registrar.
- **No uses `.its()` ni `.invoke()` sobre el objeto entregado.** Los dos escriben el sujeto y el
  resultado en la salida de consola.
- **No afirmes directamente sobre el secreto.** Las aserciones siempre se registran y no aceptan opción
  de logging. Afirma sobre una consecuencia: la petición devolvió 200, la página navegó.
- **Pasa `{ log: false }` a los comandos posteriores.** `cy.request` y `.type()` lo aceptan. Ojo: eso
  oculta la entrada del command log, no censura el valor en ningún otro sitio.

## Los ids de sesión se registran

```ts
cy.session(['api-login', email], /* ... */)
```

El id de sesión aparece en el reporter y en la salida de CI. Un email está bien. Una contraseña no.

## Cumplimiento

Dos capas, porque una convención que nadie puede incumplir vale más que una con la que todo el mundo
está de acuerdo:

1. `allowCypressEnv: false` hace que `Cypress.env()` falle en tiempo de ejecución, y además bloquea
   definir variables de entorno desde la configuración por prueba.
2. Una regla de lint lo detecta antes incluso de ejecutar el código:

```js
'no-restricted-syntax': [
  'error',
  {
    selector: "CallExpression[callee.object.name='Cypress'][callee.property.name='env']",
    message: 'Cypress.env() está obsoleto. Usa cy.env([...]) o Cypress.expose().',
  },
],
```

## Cuentas de prueba

Unas cuantas costumbres que evitan los incidentes habituales:

- Las cuentas de prueba existen solo en entornos que no son producción, y sus credenciales rotan como
  cualquier otro secreto.
- No apuntes nunca una suite que llama a `resetDb` a un entorno con datos de personas reales. Haz que
  los endpoints solo de pruebas sean imposibles de activar allí, como se describe en
  [01-project-setup.md](01-project-setup.md).
- Si una spec necesita datos parecidos a producción, usa fixtures anonimizados. No copies registros
  reales a un entorno de pruebas.
