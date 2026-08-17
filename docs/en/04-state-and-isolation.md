# 4. State and test isolation

*[English](../en/04-state-and-isolation.md) · [Español](../es/04-state-and-isolation.md)*

- Every test must pass when run alone. Any test, any order, any time.
- Set up state over the API. Never build a fixture by clicking through the UI.
- Reset before, not after.

## The contract

```bash
make e2e CYPRESS_SPEC=cypress/e2e/todos/crud.cy.ts
```

If that fails but the full run passes, a test is leaning on state left behind by another one. The
suite in this repo is verified both in order and in reverse spec order.

## Seed over the API

`cypress/support/commands.ts` gives two commands:

```ts
cy.resetDb()                      // POST /api/test/reset  -> empty store + default user
cy.seed({ todos: [/* ... */] })   // POST /api/test/seed   -> exact fixtures, returns real ids
```

`cy.seed` returns the created records, so a spec can assert against the real server-generated id
rather than guessing:

```ts
// cypress/e2e/todos/crud.cy.ts
cy.seed({ todos: [{ email: 'demo@example.com', title: 'Aliased' }] }).then((seeded) => {
  cy.wrap(seeded.todos[0]).as('seededTodo')
})
```

Building the same fixture by typing into the add-todo form would make a filtering test fail whenever
the *creation* form breaks. Two unrelated features, one failure, and a misleading one.

Larger fixtures come from a file, so the spec reads as behaviour rather than as a pile of literals:

```ts
// cypress/e2e/todos/filters.cy.ts
cy.fixture<TodoFixture[]>('todos').then((todos) => {
  cy.seed({ todos: todos.map((todo) => ({ email: 'demo@example.com', ...todo })) })
  cy.wrap(todos).as('todos')
})
```

## `before`, not `after`

```ts
// cypress/support/e2e.ts
before(() => {
  cy.task('db:reset')
})
```

Cleanup in `after`/`afterEach` does not run when a test crashes, when the runner is stopped
mid-test, or when the browser dies. Worse, when it does run it destroys the state you would want to
inspect while debugging the failure you are staring at. Reset at the start, leave the ending state
alone.

## `cy.task` vs `cy.request`

Both reset the API here, on purpose:

- `cy.resetDb()` uses `cy.request`. It runs in the browser context, shows up in the command log, and
  is what specs use.
- `cy.task('db:reset')` runs in Node (`cypress.config.ts`). It is the escape hatch for anything the
  browser cannot do: talking to a database directly, reading a file, calling a CLI.

Reach for `cy.request` first. `cy.task` when the browser genuinely cannot get there.

## Test isolation

`testIsolation` is on (the default). Before each test Cypress clears cookies, `localStorage`,
`sessionStorage` and the page. That is what makes independence the default rather than a discipline.

`cy.session` is the counterweight: it restores just the auth state, cheaply, so isolation costs a
cache lookup instead of a login round trip.

Turning isolation off (`describe('...', { testIsolation: false }, ...)`) is occasionally right for a
long linear wizard where each step genuinely builds on the last. The cost is that those tests can
now only run as a block, in order, and a failure in step 2 cascades through steps 3 to 9. No spec in
this repo needs it.

## Several assertions per test

```ts
cy.location('pathname').should('eq', '/todos')
cy.getByData('todos-page').should('be.visible')
cy.getByData('nav-user').should('have.text', 'Demo User')
cy.getByData('logout').should('be.visible')
```

One test, four assertions. Splitting these into four tests would repeat the entire login and page
load four times for no extra coverage. End-to-end tests are not unit tests; the setup cost dominates,
so amortise it. The "one assertion per test" rule comes from a world where setup was free.

## Anti-patterns this replaces

- A `beforeEach` that creates data by clicking through the UI.
- Tests written to run in a fixed order, where test 3 depends on the record test 1 created.
- `after(() => cy.request('DELETE', '/api/everything'))`.
- A shared "test account" whose data drifts over months until nobody dares reset it.
