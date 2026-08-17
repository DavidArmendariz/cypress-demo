# 2. Selectores

*[English](../en/02-selectors.md) · [Español](../es/02-selectors.md)*

- Una sola convención: `data-cy`. Un solo helper: `cy.getByData()`.
- Las clases, la estructura de etiquetas y los textos visibles pueden cambiar libremente. Los selectores no.
- Acota las acciones a un contenedor cuando la página tiene filas repetidas.

## La regla

```ts
// cypress/support/commands.ts
Cypress.Commands.add('getByData', (selector, options = {}) =>
  cy.get(`[data-cy="${selector}"]`, options),
)
```

Se usa en todas partes:

```ts
cy.getByData('todo-item').should('have.length', 3)
```

Un atributo `data-cy` existe únicamente para las pruebas. Cambiar uno es un acto deliberado con una
consecuencia evidente. Compara las alternativas:

| Selector | Se rompe cuando |
|---|---|
| `.btn-primary` | Alguien de diseño cambia la variante del botón. |
| `#submit` | Alguien convierte el formulario en un componente que genera ids. |
| `cy.contains('Sign in')` | Cambia el texto, o el producto se lanza en un segundo idioma. |
| `form > div:nth-child(3) input` | Cualquiera añade un div envolvente. |
| `[data-cy="login-submit"]` | Alguien lo elimina a propósito. |

## Cómo nombrarlos

Nombra la cosa, no su posición ni su estilo. `todo-delete`, no `red-button-2`. En este repositorio los
atributos vienen en tres sabores:

- **Acciones y campos**: `login-email`, `add-todo-submit`, `todo-toggle`.
- **Estados**: `todos-loading`, `todos-empty`, `todos-error`, `auth-loading`. Cada uno es un elemento
  direccionable, así que una spec afirma sobre un estado en lugar de dormir hasta que ese estado
  llegue.
- **Colecciones**: `todo-item` en cada fila, con los datos identificativos en atributos reales
  (`data-todo-id`, `data-completed`) para que las aserciones no tengan que parsear texto.

## Acotar, no indexar

`cy.getByData('todo-delete').eq(1)` acopla la prueba al orden de la lista. Busca la fila por su
contenido y trabaja dentro de ella:

```ts
// cypress/e2e/todos/crud.cy.ts
cy.contains('[data-cy="todo-item"]', 'Delete me').find('[data-cy="todo-delete"]').click()
```

Este es uno de los pocos sitios donde `cy.contains` se gana su sitio: localizar una fila *por el dato
que se está probando* es legítimo, porque esa cadena es justo de lo que trata la prueba.

## Dónde sí son correctas las aserciones sobre texto

Seleccionar por el texto es frágil. Afirmar sobre el texto suele ser exactamente el objetivo:

```ts
cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
```

Usa `data-cy` para encontrar el elemento y después afirma sobre lo que de verdad te importa,
incluido su texto.

## Antipatrón que reemplaza

Clases page object llenas de selectores CSS. Centralizan los selectores, lo cual ayuda, pero también
añaden una capa de indirección que oculta lo que hace una prueba y tienden a acumular métodos como
`loginPage.loginAsValidUser()` que reintroducen el login por UI en todas partes. Los comandos
personalizados y las app actions (`cy.seed`, `cy.loginByApi`) dan la misma reutilización sin fingir
que el navegador es un grafo de objetos. Ver [10-anti-patterns.md](10-anti-patterns.md).
