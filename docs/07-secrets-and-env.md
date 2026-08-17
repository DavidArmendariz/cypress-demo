# 7. Secrets and environment variables

- `Cypress.env()` is deprecated as of Cypress 15.10. Use `cy.env([...])`.
- `cy.env()` for secrets, `Cypress.expose()` for public config.
- `allowCypressEnv: false` turns the old habit into a hard error.

Most material online predates this change, so it is worth spelling out.

## Why `Cypress.env()` went away

`Cypress.env()` hydrated **every** environment variable into the browser. One `console.log`, one
crash report, one screenshot of the command log, and your staging API key is somewhere it should not
be. `cy.env()` surfaces only the keys you name, is asynchronous so it fits the command chain, and
passes only those keys into `cy.origin()` contexts.

## The two accessors

```ts
// Secrets. Asynchronous, yields only the requested keys.
cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
  ({ testUserPassword }) => {
    cy.getByData('login-password').type(testUserPassword, { log: false })
  },
)

// Public, non-sensitive config. Synchronous.
const apiUrl = Cypress.expose('apiUrl')
```

`cypress.config.ts` in this repo:

```ts
expose: { apiUrl: API_URL },   // safe to leak into the browser
allowCypressEnv: false,        // block the deprecated accessor entirely
```

Secrets are **not** in the committed config. They come from:

- `cypress.env.json`, which is gitignored. `make install` copies `cypress.env.example.json` into
  place so a fresh clone runs immediately with development values.
- `CYPRESS_*` environment variables in CI, fed from GitHub secrets. See `.github/workflows/ci.yml`.

`cy.env()` reads both the same way, so no spec knows or cares which environment it is in.

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

All four rules are visible in `cypress/support/commands.ts`.

## Session ids are logged

```ts
cy.session(['api-login', user], /* ... */)
```

The session id appears in the reporter and in CI output. Put the email in it if you like. Never the
password.

## Enforcement

Two layers, because a convention nobody can violate is worth more than a convention everyone agrees
with:

1. `allowCypressEnv: false` in `cypress.config.ts` makes `Cypress.env()` fail at runtime, and also
   blocks setting environment variables through test configuration.
2. A `no-restricted-syntax` rule in `eslint.config.js` catches it at lint time with a message that
   says what to use instead.

## In a real project

The demo password lives in `cypress.env.example.json` and is also the value `server/store.ts` seeds,
which is fine for a throwaway in-memory store and wrong for anything else. In a real project both
sides read from a secret store, the committed example file contains placeholders, and CI injects the
real values. The pattern is identical; only the source of the value changes.
