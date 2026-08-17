# 7. Secretos y variables de entorno

*[English](../en/07-secrets-and-env.md) · [Español](../es/07-secrets-and-env.md)*

- `Cypress.env()` está obsoleto desde Cypress 15.10. Usa `cy.env([...])`.
- `cy.env()` para secretos, `Cypress.expose()` para configuración pública.
- `allowCypressEnv: false` convierte la vieja costumbre en un error inmediato.

Casi todo el material que hay en internet es anterior a este cambio, así que vale la pena detallarlo.

## Por qué desapareció `Cypress.env()`

`Cypress.env()` volcaba **todas** las variables de entorno en el navegador. Un `console.log`, un
informe de error, una captura del command log, y tu clave de API de staging está en algún sitio donde
no debería. `cy.env()` expone solo las claves que nombras, es asíncrono para encajar en la cadena de
comandos, y pasa únicamente esas claves a los contextos de `cy.origin()`.

## Los dos accesores

```ts
// Secretos. Asíncrono, entrega solo las claves solicitadas.
cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
  ({ testUserPassword }) => {
    cy.getByData('login-password').type(testUserPassword, { log: false })
  },
)

// Configuración pública, no sensible. Sincrónico.
const apiUrl = Cypress.expose('apiUrl')
```

`cypress.config.ts` en este repositorio:

```ts
expose: { apiUrl: API_URL },   // se puede filtrar al navegador sin riesgo
allowCypressEnv: false,        // bloquea por completo el accesor obsoleto
```

Los secretos **no** están en la configuración versionada. Vienen de:

- `cypress.env.json`, que está en el gitignore. `make install` copia `cypress.env.example.json` en su
  sitio para que un clon nuevo funcione al momento con valores de desarrollo.
- Variables de entorno `CYPRESS_*` en CI, alimentadas desde los secretos de GitHub. Ver
  `.github/workflows/ci.yml`.

`cy.env()` lee ambas de la misma manera, así que ninguna spec sabe ni le importa en qué entorno está.

## Qué hacer con el valor una vez lo tienes

`cy.env()` registra los nombres de las claves, nunca los valores. Esa protección termina en el límite
del comando, así que:

- **Mantén el secreto dentro del callback `.then()`.** No lo asignes a una variable de módulo que algo
  más pueda registrar.
- **No uses `.its()` ni `.invoke()` sobre el objeto entregado.** Ambos escriben el sujeto y el
  resultado en la salida de consola.
- **No afirmes directamente sobre el secreto.** Las aserciones siempre se registran y no aceptan opción
  de logging. Afirma sobre una consecuencia: la petición devolvió 200, la página navegó.
- **Pasa `{ log: false }` a los comandos posteriores.** `cy.request` y `.type()` lo aceptan. Ojo: eso
  oculta la entrada del command log, no censura el valor en ningún otro sitio.

Las cuatro reglas se ven en `cypress/support/commands.ts`.

## Los ids de sesión se registran

```ts
cy.session(['api-login', user], /* ... */)
```

El id de sesión aparece en el reporter y en la salida de CI. Pon el email si quieres. La contraseña
nunca.

## Cumplimiento

Dos capas, porque una convención que nadie puede incumplir vale más que una convención con la que todo
el mundo está de acuerdo:

1. `allowCypressEnv: false` en `cypress.config.ts` hace que `Cypress.env()` falle en tiempo de
   ejecución, y también bloquea definir variables de entorno desde la configuración de una prueba.
2. Una regla `no-restricted-syntax` en `eslint.config.js` lo detecta en el lint con un mensaje que dice
   qué usar en su lugar.

## En un proyecto real

La contraseña de demo vive en `cypress.env.example.json` y es también el valor que siembra
`server/store.ts`, lo cual está bien para un store en memoria desechable y mal para cualquier otra
cosa. En un proyecto real ambos lados leen de un gestor de secretos, el archivo de ejemplo versionado
contiene placeholders y CI inyecta los valores reales. El patrón es idéntico; solo cambia el origen del
valor.
