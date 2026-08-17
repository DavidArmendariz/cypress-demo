# 1. Project setup

*[English](../en/01-project-setup.md) · [Español](../es/01-project-setup.md)*

- One `baseUrl`, one origin, one config file. No URLs hardcoded in specs.
- Retries in CI only. Timeouts left near the default.
- Servers are started by your process manager, never from inside a spec.

Examples throughout these docs use a small signed-in application: users authenticate, then manage
their **projects**. Substitute your own domain as you read.

## baseUrl

Set it once:

```ts
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5180',
  },
})
```

Every `cy.visit('/projects')` and `cy.request('/api/projects')` is then relative to it, and pointing
the suite at another environment is one variable:

```bash
CYPRESS_BASE_URL=https://staging.example.com npx cypress run
```

There is a second reason beyond tidiness. Without `baseUrl`, Cypress loads `about:blank` first and
then navigates, which costs an extra page load in every spec.

## One origin

Serve the API and the client from a single origin in development, usually by proxying `/api` from
the dev server to the backend. This is not a testing trick, it is how most applications are
deployed. The payoff in tests is large:

- `cy.request('/api/...')` resolves against `baseUrl`, so no absolute URLs anywhere.
- Auth cookies are same-origin in tests exactly as they are for a real user.
- No spec needs `cy.origin`.

**Pick a port that is not already taken.** Popular defaults collide with other dev servers and with
container port forwards. A half-bound port surfaces inside Cypress as `ECONNRESET`, which reads like
an application bug and is not one. Make the port configurable and pick something unusual.

## Retries

```ts
retries: { runMode: 2, openMode: 0 }
```

Retrying locally hides flake from the one person who still remembers what they just changed. Not
retrying in CI turns a single flaky test into a red build for the whole team. Different values for
different contexts is the correct answer, not a compromise.

Retried tests are flagged in the run summary. Treat that flag as a bug report, not as a green build.

## Timeouts

Leave `defaultCommandTimeout` near its default of 4000 to 5000ms. Raising the global timeout is the
usual reflex when a spec goes flaky, and it works, in the sense that failures now take four times as
long to appear.

If one specific command genuinely needs longer, give it to that command:

```ts
cy.get('[data-cy="report-ready"]', { timeout: 30_000 }).should('be.visible')
```

## TypeScript

Give the specs their own `tsconfig.json`. They have different globals from your application code:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["cypress", "node"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Type your custom commands in a declaration file so a typo fails the type check instead of the test
run:

```ts
declare global {
  namespace Cypress {
    interface Chainable {
      getByData(selector: string): Chainable<JQuery<HTMLElement>>
      loginByApi(email?: string, password?: string): Chainable<void>
    }
  }
}
```

Run the type check as its own CI step. It takes seconds and catches most mistakes before a browser
starts.

## Test-only API endpoints

Tests need to reset and seed state, which means the API needs endpoints that a real user must never
reach. Build them behind a flag that a production deployment cannot set:

```ts
// The router is not constructed at all unless the flag is on, so a production
// build cannot expose it even if someone guesses the path.
if (process.env.ENABLE_TEST_ROUTES === '1') {
  app.use('/api/test', createTestRouter())
}
```

Verify the gate as part of your normal checks: with the flag unset, `POST /api/test/reset` must
return 404, not 200.

## What to leave out

Do not add a global `Cypress.on('uncaught:exception', () => false)` to your support file. If the
application throws, the test should fail. Swallowing application errors globally is the fastest way
to make a suite green and stop it from reporting real defects.

If one specific third-party script throws, handle that one narrowly:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```
