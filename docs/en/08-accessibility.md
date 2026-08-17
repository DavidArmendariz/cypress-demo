# 8. Accessibility

*[English](../en/08-accessibility.md) · [Español](../es/08-accessibility.md)*

- Automated checks catch roughly a third of real defects. They are a floor, not a ceiling.
- Check the error and loading states too, not just the happy page.
- Add at least one keyboard test, because a page can be axe-clean and unusable without a mouse.

## Setup

Install `cypress-axe`, import it in your support file, and inject axe after the page reaches the
state you want to check:

```ts
cy.visit('/login')
cy.injectAxe()
cy.checkA11y()
```

`cy.injectAxe()` must come after `cy.visit()`. A visit reloads the page and discards the injected
script.

## Check states, not just pages

Four checks give good coverage, and the second is the one teams usually miss:

1. The page in its default state.
2. The page **with validation errors showing**. Error states are where `aria-invalid`,
   `aria-describedby` and `role="alert"` either exist or do not.
3. The page with real content in it, including any variant rendering such as a completed or archived
   row.
4. A keyboard-only walkthrough.

Wait for the state before checking it:

```ts
cy.getByData('project-item').should('have.length', 2)
cy.injectAxe()
cy.checkA11y()
```

Otherwise axe scans a loading spinner and reports a clean bill of health.

## The markup that earns those passes

None of this needs to be written for axe specifically:

- **Every input has a real `<label for>`.** Label a row's checkbox with that row's name, so a screen
  reader announces "Migration plan, checkbox, not checked" rather than "checkbox".
- **Error messages use `role="alert"`**, fields point at them with `aria-describedby`, and invalid
  fields carry `aria-invalid`.
- **Toggle groups expose state**, for example buttons with `aria-pressed` inside a labelled
  `role="group"`, so the active option is not communicated by colour alone.
- **Per-row controls are labelled per row**: `aria-label="Delete Migration plan"`. A list of twelve
  buttons all called "Delete" is useless read out of context.
- **Loading and pending states use `role="status"`**, so they are announced rather than appearing
  silently.

Notice that each of these also makes the element easier to select and assert on. Accessible markup
and testable markup are largely the same markup, which is the strongest argument for doing this work
alongside the tests rather than as a separate project.

## The keyboard test

```ts
cy.getByData('new-project-input').focus()
cy.focused().type('Migration plan{enter}')
cy.wait('@createProject')
```

To prove a control has a real accessible name rather than a coincidental one, assert the association
instead of the text:

```ts
cy.getByData('project-toggle')
  .invoke('attr', 'id')
  .then((id) => {
    cy.getByData('project-title').should('have.attr', 'for', id)
  })
```

**A known limit.** `cy.type(' ')` dispatches synthetic key events, and the browser's default "space
activates a focused checkbox" behaviour does not run for those. Use `cy.check()` for the state
change, and reach for `cypress-real-events` (Chromium only) when you specifically need native key
events. Asserting that the synthetic version proves keyboard operability would be worse than
acknowledging the gap.

Also note `cy.focus()` ends a command chain, so the next command starts again from `cy.`. A lint rule
catches this: see [10-anti-patterns.md](10-anti-patterns.md).

## Tuning, carefully

`cy.checkA11y()` accepts a context and a rule set:

```ts
cy.checkA11y('[data-cy="projects-page"]', {
  rules: { 'color-contrast': { enabled: false } },
})
```

Scoping to a region is fine. Disabling a rule should be rare, commented, and tracked, because a
disabled rule is a permanent decision made in a hurry.

## Adopting this on an existing product

A large application will not pass `cy.checkA11y()` on day one, and a hundred failures on the first
run tends to end the initiative. A workable sequence:

1. Turn it on for **new** pages only, so the backlog stops growing.
2. Add it to the two or three highest-traffic flows, fixing as you go.
3. Expand page by page, treating each addition as a small piece of work rather than a project.
