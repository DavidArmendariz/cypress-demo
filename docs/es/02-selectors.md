# 2. Selectores

*[English](../en/02-selectors.md) · [Español](../es/02-selectors.md)*

- Una sola convención: un atributo dedicado a las pruebas. Un solo comando para leerlo.
- Las clases, la estructura del marcado y los textos visibles pueden cambiar libremente. Los selectores no.
- Acota las acciones a un contenedor cuando la página tiene filas repetidas.

## La regla

Elige un atributo, `data-cy` o `data-test`, y envuélvelo en un comando para que la convención no
pueda desviarse:

```ts
// cypress/support/commands.ts
Cypress.Commands.add('getByData', (selector: string, options = {}) =>
  cy.get(`[data-cy="${selector}"]`, options),
)
```

```ts
cy.getByData('project-item').should('have.length', 3)
```

Un atributo de pruebas existe únicamente para las pruebas. Cambiar uno es un acto deliberado con una
consecuencia evidente. Compara las alternativas:

| Selector | Se rompe cuando |
|---|---|
| `.btn-primary` | Alguien de diseño cambia la variante del botón. |
| `#submit` | El formulario pasa a ser un componente que genera ids. |
| `cy.contains('Sign in')` | Cambia el texto, o el producto se lanza en un segundo idioma. |
| `form > div:nth-child(3) input` | Cualquiera añade un elemento envolvente. |
| `[data-cy="login-submit"]` | Alguien lo elimina a propósito. |

Solo la última fila es un cambio que quien desarrolla puede ver venir.

## Cómo nombrarlos

Nombra la cosa, no su posición ni su estilo. `project-delete`, no `red-button-2`. Con tres categorías
se cubre casi todo:

- **Acciones y campos**: `login-email`, `add-project-submit`, `project-toggle`.
- **Estados**: `projects-loading`, `projects-empty`, `projects-error`, `auth-loading`. Dale a cada
  estado relevante su propio elemento direccionable, para que una spec afirme sobre un estado en lugar
  de dormir hasta que ese estado llegue.
- **Colecciones**: el mismo atributo en cada fila, con los datos identificativos en atributos reales
  para que las aserciones no tengan que parsear texto:

```html
<li data-cy="project-item" data-project-id="abc123" data-archived="false">
```

Ese último punto se paga solo de inmediato:

```ts
cy.getByData('project-item').should('have.attr', 'data-archived', 'true')
```

## Acota, no indexes

`cy.getByData('project-delete').eq(1)` acopla la prueba al orden de la lista, así que se rompe el día
en que alguien cambia la ordenación por defecto. Busca la fila por su contenido y trabaja dentro de
ella:

```ts
cy.contains('[data-cy="project-item"]', 'Migration plan')
  .find('[data-cy="project-delete"]')
  .click()
```

Este es uno de los pocos sitios donde `cy.contains` se gana su sitio. Localizar una fila *por el dato
que se está probando* es legítimo, porque esa cadena es de lo que trata la prueba.

## Las aserciones sobre texto siguen valiendo

Seleccionar por el texto es frágil. Afirmar sobre el texto suele ser exactamente el objetivo:

```ts
cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
```

Usa el atributo de pruebas para encontrar el elemento y después afirma sobre lo que de verdad te
importa, incluido su texto.

## Cómo aplicarlo a una aplicación existente

No vas a añadir atributos por todas partes de una sola pasada, y no deberías intentarlo. Añádelos
mientras escribes cada spec, a los elementos que esa spec toca. Dos reglas evitan que esto se
convierta en un desorden:

- No reutilices nunca un valor para dos cosas distintas en la misma página.
- Cuando elimines una funcionalidad, elimina sus atributos. Los atributos de pruebas huérfanos son una
  fuente de confusión que crece despacio sobre qué sigue estando cubierto.

## El antipatrón que reemplaza

Clases page object llenas de selectores CSS. Centralizan los selectores, lo cual ayuda de verdad,
pero también añaden una capa de indirección que oculta lo que hace una prueba, y tienden a acumular
métodos como `loginPage.loginAsValidUser()` que reintroducen el login por UI en todas partes.

Los comandos personalizados y las app actions dan la misma reutilización sin modelar el navegador como
un grafo de objetos. Ver [10-anti-patterns.md](10-anti-patterns.md).
