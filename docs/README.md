# Cypress best practices · Buenas prácticas de Cypress

A practical guide to building a Cypress suite for an application where features sit behind a login.
Eleven chapters, each stating the practice, the reasoning, and the anti-pattern it replaces.

Una guía práctica para construir una suite de Cypress en una aplicación cuyas funcionalidades están
detrás de un login. Once capítulos: la práctica, el razonamiento, y el antipatrón que reemplaza.

| # | English (`en/`) | Español (`es/`) |
|---|---|---|
| 1 | [Project setup](en/01-project-setup.md) | [Configuración del proyecto](es/01-project-setup.md) |
| 2 | [Selectors](en/02-selectors.md) | [Selectores](es/02-selectors.md) |
| 3 | [Testing behind auth](en/03-testing-behind-auth.md) | [Probar detrás de la autenticación](es/03-testing-behind-auth.md) |
| 4 | [State and test isolation](en/04-state-and-isolation.md) | [Estado y aislamiento de pruebas](es/04-state-and-isolation.md) |
| 5 | [Network control](en/05-network-control.md) | [Control de la red](es/05-network-control.md) |
| 6 | [Choosing the right level of test](en/06-component-vs-e2e.md) | [Elegir el nivel adecuado de prueba](es/06-component-vs-e2e.md) |
| 7 | [Secrets and environment variables](en/07-secrets-and-env.md) | [Secretos y variables de entorno](es/07-secrets-and-env.md) |
| 8 | [Accessibility](en/08-accessibility.md) | [Accesibilidad](es/08-accessibility.md) |
| 9 | [Continuous integration](en/09-ci.md) | [Integración continua](es/09-ci.md) |
| 10 | [Anti-patterns](en/10-anti-patterns.md) | [Antipatrones](es/10-anti-patterns.md) |
| 11 | [A single task entrypoint](en/11-makefile-as-entrypoint.md) | [Un único punto de entrada de tareas](es/11-makefile-as-entrypoint.md) |

## Where to start · Por dónde empezar

**New suite:** read 1, 2, 3 and 4 in order. Those four decisions determine how much the rest costs you.

**Existing suite:** start with [Anti-patterns](en/10-anti-patterns.md), which ends with a prioritised
sequence for improving a suite you have inherited without rewriting it.

**Suite nueva:** lee 1, 2, 3 y 4 en orden. Esas cuatro decisiones determinan cuánto te cuesta todo lo
demás.

**Suite existente:** empieza por [Antipatrones](es/10-anti-patterns.md), que termina con una secuencia
priorizada para mejorar una suite heredada sin reescribirla.

## Conventions · Convenciones

Examples use one running scenario throughout: users sign in, then manage their **projects**. Substitute
your own domain as you read.

Code, identifiers and Cypress API names are left in English in both languages, because they are what you
actually type. Only the prose is translated.

Los ejemplos usan un escenario común: la persona usuaria inicia sesión y gestiona sus **proyectos**.
Sustituye ese dominio por el tuyo según leas.

El código, los identificadores y los nombres de la API de Cypress se dejan en inglés en los dos idiomas,
porque son lo que de verdad se escribe. Solo se traduce la prosa.

## Versions · Versiones

Written against **Cypress 15**. Two changes in that line matter and are called out where relevant:

- `Cypress.env()` is deprecated as of 15.10, replaced by `cy.env()` and `Cypress.expose()`.
- The three-argument `cy.stub(obj, 'name', fn)` was removed in 15.0.

Escrito para **Cypress 15**. Dos cambios de esa línea importan y se señalan donde corresponde:

- `Cypress.env()` está obsoleto desde 15.10, sustituido por `cy.env()` y `Cypress.expose()`.
- La forma de tres argumentos `cy.stub(obj, 'name', fn)` se eliminó en 15.0.
