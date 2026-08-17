# 1. Configuración del proyecto

*[English](../en/01-project-setup.md) · [Español](../es/01-project-setup.md)*

- Un solo `baseUrl`, un solo origen, un solo archivo de configuración. Ninguna URL dentro de las specs.
- Reintentos solo en CI. Los timeouts se quedan cerca del valor por defecto.
- La API y el cliente los arranca el gestor de procesos, nunca una spec.

## baseUrl

`cypress.config.ts:9` define `baseUrl: 'http://localhost:5180'`. Cada `cy.visit('/todos')` y cada
`cy.request('/api/todos')` es relativo a ese valor. Apuntar la suite a staging es entonces una sola
variable:

```bash
CYPRESS_BASE_URL=https://staging.example.com make e2e
```

Hay una segunda razón más allá del orden: sin `baseUrl`, Cypress carga primero `about:blank` y
después navega, lo que cuesta una carga de página por spec.

El cliente y la API comparten un solo origen porque Vite hace proxy de `/api` al puerto 3001
(`vite.config.ts`). Eso no es un truco de testing, es como se desplegaría la aplicación. Significa que
la cookie de autenticación es del mismo origen, que `cy.request` no necesita URLs absolutas y que
ninguna spec necesita `cy.origin`.

**Puerto 5180, no el 5173 por defecto de Vite.** El 5173 suele estar ya ocupado por otro servidor de
desarrollo o por el reenvío de puertos de un contenedor. Un puerto a medio enlazar aparece como
`ECONNRESET` dentro de Cypress, lo que se lee como un error de la aplicación sin serlo. Se puede
cambiar con `WEB_PORT`.

## Reintentos

```ts
retries: { runMode: 2, openMode: 0 }
```

Reintentar en local esconde la inestabilidad justo a la única persona que todavía recuerda qué acaba
de cambiar. No reintentar en CI convierte una prueba inestable en una build roja para todo el equipo.
Valores distintos para trabajos distintos es la respuesta correcta, no un término medio.

## Timeouts

`defaultCommandTimeout` se queda en 5000. Subir el timeout global es el reflejo habitual cuando una
spec se vuelve inestable, y funciona, en el sentido de que ahora los fallos tardan cuatro veces más
en aparecer. Si un comando concreto realmente necesita más tiempo, dáselo a ese comando:

```ts
cy.getByData('report-ready', { timeout: 30_000 }).should('be.visible')
```

## TypeScript

Dos proyectos, porque tienen globals distintos:

- `tsconfig.json` cubre `src/`, `server/` y `shared/`.
- `cypress/tsconfig.json` cubre las specs, con `types: ["cypress", "node", "cypress-axe"]`.

`make typecheck` ejecuta ambos. Los comandos personalizados están tipados en
`cypress/support/index.d.ts`, así que `cy.loginByApi()` autocompleta y una errata falla en la
comprobación de tipos en lugar de en la ejecución de las pruebas.

## Rutas de API solo para pruebas

`server/routes/test.ts` exporta una factory, y `server/app.ts` solo la monta cuando
`ENABLE_TEST_ROUTES=1`. Una build de producción no puede exponer un endpoint de "borra la base de
datos" ni aunque alguien adivine la ruta, porque el router nunca llegó a construirse. Compruébalo:

```bash
# sin la variable
npx tsx server/index.ts
curl -X POST localhost:3001/api/test/reset   # 404
```

## Lo que falta a propósito

No hay ningún `Cypress.on('uncaught:exception', () => false)` en `cypress/support/e2e.ts`. Si la
aplicación lanza una excepción, la prueba debe fallar. Tragarse los errores de la aplicación de forma
global es la manera más rápida de tener una suite en verde y sin valor.
