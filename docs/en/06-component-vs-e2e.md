# 6. Component tests vs E2E

*[English](../en/06-component-vs-e2e.md) · [Español](../es/06-component-vs-e2e.md)*

- Component tests own the permutations. E2E owns the wiring.
- If a test does not need the server, the router or a session, it should not pay for them.
- Test the public surface: props in, events out. Never component internals.

## The split, concretely

`LoginForm` has five behaviours: two missing fields, valid submit, error clearing, server-side field
errors, and disabled-while-submitting. In `cypress/component/LoginForm.cy.tsx` those are five tests
that finish in about two seconds combined. There is no API, no router, no auth context.

In `cypress/e2e/auth/login-ui.cy.ts` the same form is exercised through the browser to answer a
different question: is it actually wired to the API, does the cookie come back, does the redirect
land on `/todos`. That is one thing component tests cannot tell you, and it is worth the seconds.

| Question | Where it belongs |
|---|---|
| Does this button disable while a promise is pending? | Component |
| Do all three validation branches fire? | Component |
| Is `aria-pressed` set on the active filter? | Component |
| Does clicking sign-in create a session and land on /todos? | E2E |
| Does the route guard redirect a deep link? | E2E |
| Does the API reject another user's todo id? | API spec, no browser |

Total in this repo: 15 component tests in ~3 seconds, 41 E2E tests in ~2 minutes. Push a permutation
down a level and it gets roughly two orders of magnitude cheaper.

## Props in, events out

```tsx
// cypress/component/TodoItem.cy.tsx
cy.mount(<TodoItem todo={todo} onToggle={cy.stub().as('onToggle')} onDelete={cy.stub().as('onDelete')} />)

cy.getByData('todo-toggle').click()
cy.get('@onToggle').should('have.been.calledOnceWith', todo)
```

Alias the stub, assert on the alias. No reaching into state, no rendering internals. If the component
is hard to test this way, that is usually a design signal, not a testing problem: `TodoItem`,
`TodoFilters` and `LoginForm` are all presentational precisely so they can be tested like this.

## Controlled components

A controlled component must *not* update itself:

```tsx
// cypress/component/TodoFilters.cy.tsx
cy.mount(<TodoFilters value="all" counts={counts} onChange={cy.stub()} />)
cy.getByData('filter-completed').click()
cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'true')
```

And when you want to test the integration, write a three-line harness rather than exposing internals:

```tsx
function Harness() {
  const [value, setValue] = useState<TodoFilter>('all')
  return <TodoFilters value={value} counts={counts} onChange={setValue} />
}
```

## Cypress 15 note on stubs

The three-argument form `cy.stub(obj, 'name', fn)` was removed in Cypress 15. Use `.callsFake()`:

```tsx
const onSubmit = cy
  .stub()
  .as('onSubmit')
  .callsFake(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
```

Holding the resolver lets the test assert the pending state and then release it, with no timing
guesswork.

## Setup

`cypress.config.ts` uses `framework: 'react', bundler: 'vite'`, so component tests build with the
same Vite config as the app. `cypress/support/component.ts` registers `cy.mount` and imports
`src/styles.css`, which matters: visibility assertions and axe contrast checks are meaningless
against unstyled markup.

`cypress/support/commands.ts` is imported by both support files, so `cy.getByData` works identically
in component and E2E specs. One selector convention, everywhere.

## Anti-pattern this replaces

Covering every validation branch through the full stack. Ten E2E tests that each log in, load a
page, and differ only in which field was left blank. Slow, flaky, and they fail for reasons that have
nothing to do with validation.
