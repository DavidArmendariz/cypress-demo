# 4. Estado y aislamiento de pruebas

*[English](../en/04-state-and-isolation.md) · [Español](../es/04-state-and-isolation.md)*

- Toda prueba debe pasar ejecutándose sola. Cualquier prueba, en cualquier orden, en cualquier momento.
- Prepara el estado por API. Nunca construyas datos de prueba haciendo clic por la UI.
- Resetea antes, no después.

## El contrato

```bash
make e2e CYPRESS_SPEC=cypress/e2e/todos/crud.cy.ts
```

Si eso falla pero la ejecución completa pasa, hay una prueba apoyándose en el estado que dejó otra. La
suite de este repositorio está verificada en orden y en orden inverso de specs.

## Preparar datos por API

`cypress/support/commands.ts` ofrece dos comandos:

```ts
cy.resetDb()                      // POST /api/test/reset  -> store vacío + usuario por defecto
cy.seed({ todos: [/* ... */] })   // POST /api/test/seed   -> datos exactos, devuelve ids reales
```

`cy.seed` devuelve los registros creados, así que una spec puede afirmar contra el id real generado
por el servidor en lugar de adivinarlo:

```ts
// cypress/e2e/todos/crud.cy.ts
cy.seed({ todos: [{ email: 'demo@example.com', title: 'Aliased' }] }).then((seeded) => {
  cy.wrap(seeded.todos[0]).as('seededTodo')
})
```

Construir esos mismos datos escribiendo en el formulario de alta haría que una prueba de filtrado
fallara cada vez que se rompiera el formulario de *creación*. Dos funcionalidades sin relación, un
fallo, y encima engañoso.

Los conjuntos de datos más grandes vienen de un archivo, así que la spec se lee como comportamiento y
no como un montón de literales:

```ts
// cypress/e2e/todos/filters.cy.ts
cy.fixture<TodoFixture[]>('todos').then((todos) => {
  cy.seed({ todos: todos.map((todo) => ({ email: 'demo@example.com', ...todo })) })
  cy.wrap(todos).as('todos')
})
```

## `before`, no `after`

```ts
// cypress/support/e2e.ts
before(() => {
  cy.task('db:reset')
})
```

La limpieza en `after`/`afterEach` no se ejecuta cuando una prueba revienta, cuando paras el runner a
media prueba o cuando muere el navegador. Peor aún, cuando sí se ejecuta destruye justo el estado que
querrías inspeccionar para depurar el fallo que tienes delante. Resetea al principio y deja en paz el
estado final.

## `cy.task` frente a `cy.request`

Aquí ambos resetean la API, a propósito:

- `cy.resetDb()` usa `cy.request`. Corre en el contexto del navegador, aparece en el command log y es
  lo que usan las specs.
- `cy.task('db:reset')` corre en Node (`cypress.config.ts`). Es la vía de escape para todo lo que el
  navegador no puede hacer: hablar directamente con una base de datos, leer un archivo, llamar a una
  CLI.

Recurre primero a `cy.request`. A `cy.task` cuando el navegador realmente no llega.

## Aislamiento de pruebas

`testIsolation` está activo (es el valor por defecto). Antes de cada prueba Cypress limpia cookies,
`localStorage`, `sessionStorage` y la página. Eso es lo que hace que la independencia sea el
comportamiento por defecto y no una disciplina.

`cy.session` es el contrapeso: restaura solo el estado de autenticación, y barato, así que el
aislamiento cuesta una consulta a caché en lugar de un login completo.

Desactivar el aislamiento (`describe('...', { testIsolation: false }, ...)`) es correcto de vez en
cuando, para un asistente lineal largo donde cada paso se construye de verdad sobre el anterior. El
precio es que esas pruebas ya solo pueden ejecutarse en bloque y en orden, y que un fallo en el paso 2
arrastra a los pasos 3 al 9. Ninguna spec de este repositorio lo necesita.

## Varias aserciones por prueba

```ts
cy.location('pathname').should('eq', '/todos')
cy.getByData('todos-page').should('be.visible')
cy.getByData('nav-user').should('have.text', 'Demo User')
cy.getByData('logout').should('be.visible')
```

Una prueba, cuatro aserciones. Partirlas en cuatro pruebas repetiría el login y la carga de página
cuatro veces sin cubrir nada nuevo. Las pruebas end to end no son pruebas unitarias; el coste del
setup domina, así que hay que amortizarlo. La regla de "una aserción por prueba" viene de un mundo
donde el setup era gratis.

## Antipatrones que reemplaza

- Un `beforeEach` que crea datos haciendo clic por la UI.
- Pruebas escritas para ejecutarse en un orden fijo, donde la prueba 3 depende del registro que creó la 1.
- `after(() => cy.request('DELETE', '/api/everything'))`.
- Una "cuenta de pruebas" compartida cuyos datos van derivando durante meses hasta que nadie se atreve a resetearla.
