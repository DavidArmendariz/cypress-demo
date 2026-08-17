# 1. Configuración del proyecto

*[English](../en/01-project-setup.md) · [Español](../es/01-project-setup.md)*

- Un solo `baseUrl`, un solo origen, un solo archivo de configuración. Ninguna URL fija en las specs.
- Reintentos solo en CI. Los timeouts cerca del valor por defecto.
- Los servidores los arranca tu gestor de procesos, nunca una spec.

Los ejemplos de esta documentación usan una aplicación pequeña con sesión: la persona usuaria se
autentica y gestiona sus **proyectos**. Sustituye ese dominio por el tuyo según leas.

## baseUrl

Defínelo una vez:

```ts
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5180',
  },
})
```

A partir de ahí, cada `cy.visit('/projects')` y cada `cy.request('/api/projects')` es relativo a ese
valor, y apuntar la suite a otro entorno es una sola variable:

```bash
CYPRESS_BASE_URL=https://staging.example.com npx cypress run
```

Hay una segunda razón más allá del orden: sin `baseUrl`, Cypress carga primero `about:blank` y
después navega, lo que añade una carga de página en cada spec.

## Un solo origen

Sirve la API y el cliente desde un mismo origen en desarrollo, normalmente haciendo proxy de `/api`
desde el servidor de desarrollo hacia el backend. No es un truco de testing, es como se despliegan
casi todas las aplicaciones. En las pruebas la ganancia es grande:

- `cy.request('/api/...')` se resuelve contra `baseUrl`, así que no hay URLs absolutas en ningún sitio.
- Las cookies de autenticación son del mismo origen en las pruebas igual que para una persona real.
- Ninguna spec necesita `cy.origin`.

**Elige un puerto que no esté ocupado.** Los puertos por defecto más populares chocan con otros
servidores de desarrollo y con reenvíos de puertos de contenedores. Un puerto a medio enlazar aparece
dentro de Cypress como `ECONNRESET`, que se lee como un error de la aplicación sin serlo. Haz el
puerto configurable y elige uno poco común.

## Reintentos

```ts
retries: { runMode: 2, openMode: 0 }
```

Reintentar en local esconde la inestabilidad justo a la única persona que todavía recuerda qué acaba
de cambiar. No reintentar en CI convierte una sola prueba inestable en una build roja para todo el
equipo. Valores distintos para contextos distintos es la respuesta correcta, no un término medio.

Las pruebas reintentadas se marcan en el resumen de la ejecución. Trata esa marca como un informe de
error, no como una build verde.

## Timeouts

Deja `defaultCommandTimeout` cerca de su valor por defecto, entre 4000 y 5000 ms. Subir el timeout
global es el reflejo habitual cuando una spec se vuelve inestable, y funciona, en el sentido de que
ahora los fallos tardan cuatro veces más en aparecer.

Si un comando concreto necesita de verdad más tiempo, dáselo a ese comando:

```ts
cy.get('[data-cy="report-ready"]', { timeout: 30_000 }).should('be.visible')
```

## TypeScript

Dale a las specs su propio `tsconfig.json`. Tienen globals distintos del código de aplicación:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["cypress", "node"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Tipa tus comandos personalizados en un archivo de declaración, para que una errata falle en la
comprobación de tipos en lugar de en la ejecución de las pruebas:

```ts
declare global {
  namespace Cypress {
    interface Chainable {
      getByData(selector: string): Chainable<JQuery<HTMLElement>>
      loginByApi(email?: string, password?: string): Chainable<void>
    }
  }
}
```

Ejecuta la comprobación de tipos como un paso propio en CI. Tarda segundos y detecta la mayoría de
errores antes de que arranque un navegador.

## Endpoints de API solo para pruebas

Las pruebas necesitan resetear y sembrar estado, lo que significa que la API necesita endpoints que
una persona usuaria real nunca debe poder alcanzar. Constrúyelos detrás de una variable que un
despliegue de producción no pueda activar:

```ts
// El router ni siquiera se construye si la variable está desactivada, así que
// una build de producción no puede exponerlo aunque alguien adivine la ruta.
if (process.env.ENABLE_TEST_ROUTES === '1') {
  app.use('/api/test', createTestRouter())
}
```

Verifica esa barrera como parte de tus comprobaciones normales: sin la variable, `POST
/api/test/reset` debe devolver 404, no 200.

## Qué dejar fuera

No añadas un `Cypress.on('uncaught:exception', () => false)` global a tu archivo de soporte. Si la
aplicación lanza una excepción, la prueba debe fallar. Tragarse los errores de la aplicación de forma
global es la manera más rápida de tener una suite en verde que deja de reportar defectos reales.

Si hay un script de terceros concreto que lanza excepciones, gestiona ese caso de forma acotada:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```
