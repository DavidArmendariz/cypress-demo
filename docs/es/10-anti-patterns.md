# 10. Antipatrones

*[English](../en/10-anti-patterns.md) · [Español](../es/10-anti-patterns.md)*

- Casi toda la inestabilidad en Cypress es una de una docena de costumbres recurrentes.
- Cinco de ellas las detecta la configuración de lint de este repositorio. El resto necesita revisión humana.
- Cada entrada de abajo enlaza al documento y al archivo que muestra la alternativa.

| Antipatrón | En su lugar | Lo detecta |
|---|---|---|
| Hacer login por la UI en cada `beforeEach` | `cy.loginByApi()` + `cy.session` | revisión |
| `cy.wait(2000)` | `cy.wait('@alias')` o una aserción que reintenta | `cypress/no-unnecessary-waiting` |
| `cy.get('.btn-primary')`, `cy.contains('Save')` | `cy.getByData('save')` | revisión |
| `const el = cy.get('#thing')` | alias y closures con `.then()` | `cypress/no-assigning-return-values` |
| `cy.get('x').focus().type('y')` | partir la cadena | `cypress/unsafe-to-chain-command` |
| `it('...', async () => { await cy.get(...) })` | nada de `async` en el cuerpo de la prueba | `cypress/no-async-tests` |
| `Cypress.env('password')` | `cy.env(['password'])` | `no-restricted-syntax` + `allowCypressEnv: false` |
| Limpieza en `after` / `afterEach` | resetear en `before` | revisión |
| Pruebas que dependen de la prueba anterior | que cada prueba prepare su propio estado | revisión |
| Una aserción por prueba | varias aserciones por recorrido | revisión |
| Arrancar servidores con `cy.exec` | `start-server-and-test`, el Makefile, CI | revisión |
| `Cypress.on('uncaught:exception', () => false)` global | dejar que los errores de la app hagan fallar la prueba | revisión |
| Simular todas las peticiones | peticiones reales para el camino feliz | revisión |
| Testing condicional sobre un DOM inestable | hacer la aplicación determinista | revisión |
| Clases page object | comandos personalizados y app actions | revisión |

## Los que necesitan más que una fila de tabla

### `cy.wait(número)`

La fuente más común de lentitud y de inestabilidad, a la vez. Dos segundos son demasiado en una máquina
rápida e insuficientes en un runner de CI cargado, y el número solo crece con el tiempo. Toda espera en
este repositorio es o una petición con alias o una aserción que reintenta. Ver
[05-network-control.md](05-network-control.md).

### Asignar el valor de retorno de un comando

```ts
const button = cy.get('[data-cy="submit"]')   // esto es un chainable, no un elemento
button.click()                                 // a veces funciona, y enseña el modelo mental equivocado
```

Los comandos de Cypress se encolan, no se ejecutan. Usa un alias (`.as('submit')`, luego
`cy.get('@submit')`) o un closure con `.then()`. `cypress/e2e/todos/crud.cy.ts` tiene una prueba escrita
específicamente para demostrar el patrón de alias.

### Testing condicional

```ts
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="cookie-banner"]').length) {
    cy.getByData('dismiss').click()
  }
})
```

Esto es una carrera, no una prueba: puede que el banner simplemente no se haya renderizado todavía, y la
rama se salta en silencio. Solo es legítimo cuando el DOM ya se ha estabilizado de verdad y la condición
es real (una feature flag que llega del servidor, por ejemplo). Si lo necesitas porque no sabes en qué
estado está la aplicación, la solución es controlar el estado, no ramificar sobre él.

### Tragarse las excepciones globalmente

`Cypress.on('uncaught:exception', () => false)` en el archivo de soporte pone una suite roja en verde en
una línea, y de paso hace que deje de reportar errores reales. Si un script de terceros concreto lanza
una excepción, gestiona ese error de forma acotada:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```

`cypress/support/e2e.ts` no tiene ningún handler a propósito, y lo dice en un comentario.

### Page objects

Los page objects centralizan los selectores, lo cual es genuinamente útil, y después tienden a acumular
métodos como `loginPage.loginAsValidUser()` que reintroducen el login por UI en todas partes, más una
capa de indirección que hace difícil leer una prueba que falla. Los comandos personalizados
(`cy.getByData`) y las app actions (`cy.seed`, `cy.loginByApi`) dan la misma reutilización sin modelar el
navegador como un grafo de objetos. Ver [02-selectors.md](02-selectors.md).

### Probar sitios de terceros

No conduzcas por el navegador la página de login, el formulario de pago ni el cliente de correo de otra
empresa. No controlas su marcado, ni su disponibilidad, ni su detección de bots. Llama a su API con
`cy.request`, simula el callback, o usa un modo de pruebas. Esta aplicación no tiene dependencias de
terceros, lo cual es en sí mismo una simplificación que un proyecto real rara vez tiene.

## Cumplimiento

```js
// eslint.config.js
{
  files: ['cypress/**/*.{ts,tsx}'],
  ...cypress.configs.recommended,
  rules: {
    'cypress/no-unnecessary-waiting': 'error',
    'cypress/no-assigning-return-values': 'error',
    'cypress/unsafe-to-chain-command': 'error',
    'cypress/no-async-tests': 'error',
    // ...
  },
}
```

Una regla detecta la costumbre en la revisión, siempre, sin que nadie tenga que acordarse. El resto de
esta lista sigue necesitando a una persona, y para eso están estos documentos.
