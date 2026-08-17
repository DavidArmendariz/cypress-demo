# 8. Accessibility

- `cy.checkA11y()` is a floor, not a ceiling. It catches roughly a third of real defects.
- Check the error and loading states too, not just the happy page.
- Add at least one keyboard test, because a page can be axe-clean and unusable without a mouse.

## Setup

`cypress-axe` is imported in `cypress/support/e2e.ts`. Each spec injects axe after the page is in the
state you want to check:

```ts
cy.visit('/login')
cy.injectAxe()
cy.checkA11y()
```

`cy.injectAxe()` must come after `cy.visit()`, because a visit reloads the page and throws away the
injected script.

## Check the states, not just the page

`cypress/e2e/a11y/accessibility.cy.ts` checks four things, and the second one is the one teams
usually miss:

1. The login page.
2. The login page **with validation errors showing**. Error states are where `aria-invalid`,
   `aria-describedby` and `role="alert"` either exist or do not.
3. The todos page with real content in it, both an open and a completed item.
4. A keyboard-only walkthrough.

Wait for the state before checking it:

```ts
cy.getByData('todo-item').should('have.length', 2)
cy.injectAxe()
cy.checkA11y()
```

Otherwise axe scans a loading spinner and reports a clean bill of health.

## What the app does to earn those passes

Nothing in `src/` was written for axe specifically, which is the point:

- Every input has a real `<label for>`. `TodoItem` labels its checkbox with the todo title, so a
  screen reader announces "Buy milk, checkbox, not checked", not "checkbox".
- Error messages use `role="alert"`, and fields point at them with `aria-describedby`. Invalid
  fields carry `aria-invalid`.
- `TodoFilters` is a labelled `role="group"` of buttons with `aria-pressed`, so the active filter is
  exposed to assistive tech rather than communicated only by colour.
- Delete buttons are labelled per row (`aria-label="Delete Buy milk"`). A list of twelve buttons all
  called "Delete" is useless when read out of context.
- Loading and pending states use `role="status"`, so they are announced rather than silently
  appearing.

Notice that each of these is also what makes the element easy to select and assert on. Accessible
markup and testable markup are largely the same markup.

## The keyboard test

```ts
cy.getByData('new-todo-input').focus()
cy.focused().type('Added without a mouse{enter}')
```

Then, to prove the checkbox has a real accessible name rather than a coincidental one:

```ts
cy.getByData('todo-toggle')
  .invoke('attr', 'id')
  .then((id) => {
    cy.getByData('todo-title').should('have.attr', 'for', id)
  })
```

**A known limit.** `cy.type(' ')` dispatches synthetic key events, and the browser's default
"space activates a focused checkbox" behaviour does not run for those. Use `cy.check()` for the state
change, and reach for `cypress-real-events` (Chromium only) if you specifically need native key
events. Pretending the synthetic version proves keyboard operability would be worse than admitting
the gap.

`cy.focus()` also ends a command chain, so each following command starts again from `cy.`. The
`unsafe-to-chain-command` lint rule catches this.

## Tuning, carefully

`cy.checkA11y()` accepts a context and a rule set:

```ts
cy.checkA11y('[data-cy="todos-page"]', {
  rules: { 'color-contrast': { enabled: false } },
})
```

Scoping to a region is fine. Disabling a rule should be rare, commented, and tracked, because a
disabled rule is a permanent decision made in a hurry. No rules are disabled in this repo.
