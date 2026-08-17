# 7. Secrets and environment variables

*[English](../en/07-secrets-and-env.md) · [Español](../es/07-secrets-and-env.md)*

- `Cypress.env()` is deprecated as of Cypress 15.10. Use `cy.env([...])`.
- `cy.env()` for secrets, `Cypress.expose()` for public config.
- `allowCypressEnv: false` turns the old habit into an immediate error.

Most material online predates this change, so it is worth spelling out.

## Why `Cypress.env()` was deprecated

`Cypress.env()` hydrated **every** environment variable into the browser. One `console.log`, one
crash report, one screenshot of the command log, and a staging API key is somewhere it should not be.

`cy.env()` surfaces only the keys you name, is asynchronous so it fits the command chain, and passes
only those keys into `cy.origin()` contexts.

## The two accessors

```ts
// Secrets. Asynchronous, yields only the requested keys.
cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
  ({ testUserPassword }) => {
    cy.getByData('login-password').type(testUserPassword, { log: false })
  },
)

// Public, non-sensitive config. Synchronous.
const apiVersion = Cypress.expose('apiVersion')
```

Configure them separately, because they have different risk profiles:

```ts
export default defineConfig({
  expose: { apiVersion: 'v2', environment: 'staging' },  // safe in the browser
  allowCypressEnv: false,                                 // block the deprecated accessor
})
```

## Where secrets come from

Never from the committed config. Two sources, read identically by `cy.env()`:

- **`cypress.env.json`** locally, gitignored. Commit a `cypress.env.example.json` with placeholders
  so a fresh clone knows what to fill in, and have your setup script copy it into place.
- **`CYPRESS_*` environment variables** in CI, fed from your secret store:

```yaml
env:
  CYPRESS_testUserEmail: qa-user@example.com
  CYPRESS_testUserPassword: ${{ secrets.TEST_USER_PASSWORD }}
```

No spec branches on environment. The same `cy.env(['testUserPassword'])` works in both.

## Handling the value once you have it

`cy.env()` logs key names, never values. That protection stops at the command boundary, so:

- **Keep the secret inside the `.then()` callback.** Do not assign it to a module-level variable that
  something else might log.
- **Do not use `.its()` or `.invoke()` on the yielded object.** Both write the subject and the result
  to console output.
- **Do not assert on the secret directly.** Assertions always log and take no logging option. Assert
  on a consequence instead: the request returned 200, the page navigated.
- **Pass `{ log: false }` to downstream commands.** `cy.request` and `.type()` both accept it. Note
  this hides the command-log entry; it does not redact the value from anything else.

## Session ids are logged

```ts
cy.session(['api-login', email], /* ... */)
```

The session id appears in the reporter and in CI output. An email is fine. A password is not.

## Enforcement

Two layers, because a convention nobody can violate is worth more than one everybody agrees with:

1. `allowCypressEnv: false` makes `Cypress.env()` fail at runtime, and also blocks setting
   environment variables through per-test configuration.
2. A lint rule catches it before the code is even run:

```js
'no-restricted-syntax': [
  'error',
  {
    selector: "CallExpression[callee.object.name='Cypress'][callee.property.name='env']",
    message: 'Cypress.env() is deprecated. Use cy.env([...]) or Cypress.expose().',
  },
],
```

## Test accounts

A few habits that prevent the common incidents:

- Test accounts live only in non-production environments, and their credentials rotate like any
  other secret.
- Never point a suite that calls `resetDb` at an environment with real user data. Make the test-only
  endpoints impossible to enable there, as described in [01-project-setup.md](01-project-setup.md).
- If a spec needs production-like data, use anonymised fixtures. Do not copy real records into a test
  environment.
