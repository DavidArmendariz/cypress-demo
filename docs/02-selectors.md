# 2. Selectors

- One convention: `data-cy`. One helper: `cy.getByData()`.
- Classes, tag structure and user-visible copy are all free to change. Selectors are not.
- Scope actions to a container when a page has repeated rows.

## The rule

```ts
// cypress/support/commands.ts
Cypress.Commands.add('getByData', (selector, options = {}) =>
  cy.get(`[data-cy="${selector}"]`, options),
)
```

Used everywhere:

```ts
cy.getByData('todo-item').should('have.length', 3)
```

A `data-cy` attribute exists only for tests. Changing one is a deliberate act with an obvious
consequence. Compare the alternatives:

| Selector | Breaks when |
|---|---|
| `.btn-primary` | A designer changes the button variant. |
| `#submit` | Someone converts the form to a component that generates ids. |
| `cy.contains('Sign in')` | Copy changes, or the product ships in a second language. |
| `form > div:nth-child(3) input` | Anyone adds a wrapper div. |
| `[data-cy="login-submit"]` | Someone removes it on purpose. |

## What to name

Name the thing, not its position or its styling. `todo-delete`, not `red-button-2`. In this repo the
attributes come in three flavours:

- **Actions and inputs**: `login-email`, `add-todo-submit`, `todo-toggle`.
- **States**: `todos-loading`, `todos-empty`, `todos-error`, `auth-loading`. Each one is an
  addressable element, so a spec asserts a state instead of sleeping until the state passes.
- **Collections**: `todo-item` on every row, with the identifying data in real attributes
  (`data-todo-id`, `data-completed`) so assertions do not have to parse text.

## Scoping, not indexing

`cy.getByData('todo-delete').eq(1)` couples the test to list order. Find the row by its content and
work inside it:

```ts
// cypress/e2e/todos/crud.cy.ts
cy.contains('[data-cy="todo-item"]', 'Delete me').find('[data-cy="todo-delete"]').click()
```

This is one of the few places `cy.contains` earns its keep: locating a row *by the data under test*
is legitimate, because that string is the thing the test is about.

## Where text assertions are still right

Selecting by copy is fragile. Asserting on copy is often exactly the point:

```ts
cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
```

Use `data-cy` to find the element, then assert whatever you actually care about, including its text.

## Anti-pattern this replaces

Page-object classes full of CSS selectors. They centralise the selectors, which helps, but they also
add a layer of indirection that hides what a test does and tends to grow methods like
`loginPage.loginAsValidUser()` that quietly reintroduce UI login everywhere. Custom commands and app
actions (`cy.seed`, `cy.loginByApi`) give the same reuse without pretending the browser is an
object graph. See [10-anti-patterns.md](10-anti-patterns.md).
