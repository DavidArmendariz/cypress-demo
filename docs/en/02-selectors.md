# 2. Selectors

*[English](../en/02-selectors.md) · [Español](../es/02-selectors.md)*

- One convention: a dedicated test attribute. One helper command to read it.
- Classes, markup structure and user-visible copy are all free to change. Selectors are not.
- Scope actions to a container when a page has repeated rows.

## The rule

Pick one attribute, `data-cy` or `data-test`, and wrap it in a command so the convention is
impossible to drift from:

```ts
// cypress/support/commands.ts
Cypress.Commands.add('getByData', (selector: string, options = {}) =>
  cy.get(`[data-cy="${selector}"]`, options),
)
```

```ts
cy.getByData('project-item').should('have.length', 3)
```

A test attribute exists only for tests. Changing one is a deliberate act with an obvious
consequence. Compare the alternatives:

| Selector | Breaks when |
|---|---|
| `.btn-primary` | A designer changes the button variant. |
| `#submit` | The form becomes a component that generates ids. |
| `cy.contains('Sign in')` | Copy changes, or the product ships in a second language. |
| `form > div:nth-child(3) input` | Anyone adds a wrapper element. |
| `[data-cy="login-submit"]` | Someone removes it on purpose. |

Only the last row is a change a developer can see coming.

## Naming

Name the thing, not its position or its styling. `project-delete`, not `red-button-2`. Three
categories cover almost everything:

- **Actions and inputs**: `login-email`, `add-project-submit`, `project-toggle`.
- **States**: `projects-loading`, `projects-empty`, `projects-error`, `auth-loading`. Give every
  meaningful state its own addressable element, so a spec asserts on a state instead of sleeping
  until that state happens to arrive.
- **Collections**: the same attribute on every row, with identifying data in real attributes so
  assertions do not have to parse text:

```html
<li data-cy="project-item" data-project-id="abc123" data-archived="false">
```

That last point pays for itself immediately:

```ts
cy.getByData('project-item').should('have.attr', 'data-archived', 'true')
```

## Scope, do not index

`cy.getByData('project-delete').eq(1)` couples the test to list order, so it breaks the day someone
changes the default sort. Find the row by its content and work inside it:

```ts
cy.contains('[data-cy="project-item"]', 'Migration plan')
  .find('[data-cy="project-delete"]')
  .click()
```

This is one of the few places `cy.contains` earns its keep. Locating a row *by the data under test*
is legitimate, because that string is what the test is about.

## Text assertions are still fine

Selecting by copy is fragile. Asserting on copy is often the entire point:

```ts
cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
```

Use the test attribute to find the element, then assert on whatever you actually care about,
including its text.

## Applying this to an existing app

You will not add attributes everywhere in one pass, and you should not try. Add them as you write
each spec, to the elements that spec touches. Two rules keep it from turning into a mess:

- Never reuse a value for two different things on the same page.
- When you delete a feature, delete its attributes. Orphaned test attributes are a slow-growing
  source of confusion about what is still covered.

## The anti-pattern this replaces

Page-object classes full of CSS selectors. They centralise selectors, which genuinely helps, but
they also add a layer of indirection that hides what a test does, and they tend to grow methods like
`loginPage.loginAsValidUser()` that reintroduce UI login everywhere.

Custom commands and app actions give the same reuse without modelling the browser as an object
graph. See [10-anti-patterns.md](10-anti-patterns.md).
