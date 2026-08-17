# 4. State and test isolation

*[English](../en/04-state-and-isolation.md) · [Español](../es/04-state-and-isolation.md)*

- Every test must pass when run alone. Any test, any order, any time.
- Set up state over the API. Never build a fixture by clicking through the UI.
- Reset before, not after.

## The contract

```bash
npx cypress run --spec cypress/e2e/projects/crud.cy.ts
```

If that fails but the full run passes, a test is leaning on state another test left behind. Run the
suite in reverse spec order occasionally to catch the same class of problem.

This is worth enforcing early. Order dependence is cheap to prevent and expensive to unpick once a
suite has grown around it.

## Seed over the API

Give yourself two commands and use them everywhere:

```ts
cy.resetDb()                                    // wipe, recreate the baseline account
cy.seed({ projects: [{ name: 'Migration plan' }] })   // exact fixtures for this test
```

Both are thin wrappers over the test-only endpoints described in
[01-project-setup.md](01-project-setup.md):

```ts
Cypress.Commands.add('seed', (payload) =>
  cy.request('POST', '/api/test/seed', payload).its('body'),
)
```

Have the seed endpoint **return what it created**, so specs assert against real server-generated ids
instead of guessing:

```ts
cy.seed({ projects: [{ name: 'Migration plan' }] }).then((seeded) => {
  cy.wrap(seeded.projects[0]).as('project')
})
```

Building that same fixture by typing into the create form would make a filtering test fail whenever
the *creation* form breaks. Two unrelated features, one failure, and a misleading one.

Larger data sets belong in a fixture file, so the spec reads as behaviour rather than as a pile of
literals:

```ts
cy.fixture('projects').then((projects) => {
  cy.seed({ projects })
  cy.wrap(projects).as('projects')
})
```

## `before`, not `after`

```ts
before(() => {
  cy.task('db:reset')
})
```

Cleanup in `after` or `afterEach` does not run when a test crashes, when you stop the runner
mid-test, or when the browser dies. Worse, when it does run it destroys the state you would want to
inspect while debugging the failure in front of you.

Reset at the start of a run and leave the ending state alone.

## `cy.task` vs `cy.request`

Both can reset your backend, and they are good at different things:

- **`cy.request`** runs in the browser context, appears in the command log, and needs no plugin
  wiring. Reach for it first.
- **`cy.task`** runs in Node. It is the escape hatch for things the browser cannot do: connecting to
  a database directly, reading a file, invoking a CLI, generating a signed token.

```ts
// cypress.config.ts
setupNodeEvents(on) {
  on('task', {
    async 'db:reset'() {
      await resetDatabase()
      return null
    },
  })
}
```

A task must return something. Returning `undefined` is how Cypress reports "no task handled this".

## Test isolation

`testIsolation` defaults to on. Before each test, Cypress clears cookies, `localStorage`,
`sessionStorage` and the page. That is what makes independence the default rather than a discipline
everyone has to remember.

`cy.session` is the counterweight: it restores just the auth state, cheaply, so isolation costs a
cache lookup instead of a login round trip. The two features are designed to be used together.

Turning isolation off for a `describe` block is occasionally right, typically for a long linear
wizard where each step genuinely builds on the last:

```ts
describe('Onboarding wizard', { testIsolation: false }, () => { /* ... */ })
```

The price is that those tests can now only run as a block, in order, and a failure in step 2
cascades through steps 3 to 9. Use it deliberately, not to paper over a state problem.

## Several assertions per test

```ts
cy.location('pathname').should('eq', '/projects')
cy.getByData('projects-page').should('be.visible')
cy.getByData('nav-user').should('have.text', 'Ada Lovelace')
cy.getByData('logout').should('be.visible')
```

One test, four assertions. Splitting these into four tests would repeat the login and page load four
times for no additional coverage.

End-to-end tests are not unit tests. The setup cost dominates, so amortise it. The "one assertion per
test" rule comes from a world where setup was free.

## The anti-patterns this replaces

- A `beforeEach` that creates data by clicking through the UI.
- Tests written to run in a fixed order, where test 3 depends on the record test 1 created.
- `after(() => cy.request('DELETE', '/api/everything'))`.
- A shared long-lived test account whose data drifts over months until nobody dares reset it.
