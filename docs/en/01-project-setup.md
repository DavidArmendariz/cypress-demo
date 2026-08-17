# 1. Project setup

*[English](../en/01-project-setup.md) · [Español](../es/01-project-setup.md)*

- One `baseUrl`, one origin, one config file. No URLs in specs.
- Retries in CI only. Timeouts left near the default.
- The API and the client are started by the process manager, never by a spec.

## baseUrl

`cypress.config.ts:9` sets `baseUrl: 'http://localhost:5180'`. Every `cy.visit('/todos')` and
`cy.request('/api/todos')` is relative to it. Pointing the suite at staging is then one variable:

```bash
CYPRESS_BASE_URL=https://staging.example.com make e2e
```

There is a second reason beyond tidiness: without `baseUrl`, Cypress loads `about:blank` first and
then navigates, which costs a page load per spec.

The client and the API sit behind one origin because Vite proxies `/api` to port 3001
(`vite.config.ts`). That is not a testing hack, it is how the app would be deployed. It means the
auth cookie is same-origin, `cy.request` needs no absolute URLs, and no spec needs `cy.origin`.

**Port 5180, not Vite's default 5173.** 5173 is frequently already held by another dev server or a
container port-forward. A half-bound port shows up as `ECONNRESET` inside Cypress, which reads like
an app bug and is not one. Override with `WEB_PORT`.

## Retries

```ts
retries: { runMode: 2, openMode: 0 }
```

Retrying locally hides flake from the one person who can still remember what they just changed.
Not retrying in CI turns one flaky test into a red build for everyone. Different defaults for
different jobs is the correct answer, not a compromise.

## Timeouts

`defaultCommandTimeout` stays at 5000. Raising the global timeout is the usual reflex when a spec
goes flaky, and it works, in the sense that failures now take four times as long to appear. If one
specific command genuinely needs longer, give that command the longer timeout:

```ts
cy.getByData('report-ready', { timeout: 30_000 }).should('be.visible')
```

## TypeScript

Two projects, because they have different globals:

- `tsconfig.json` covers `src/`, `server/` and `shared/`.
- `cypress/tsconfig.json` covers the specs, with `types: ["cypress", "node", "cypress-axe"]`.

`make typecheck` runs both. Custom commands are typed in `cypress/support/index.d.ts`, so
`cy.loginByApi()` autocompletes and a typo fails the type check instead of the test run.

## Test-only API routes

`server/routes/test.ts` exports a factory, and `server/app.ts` only mounts it when
`ENABLE_TEST_ROUTES=1`. A production build cannot expose a "wipe the database" endpoint even if
someone guesses the path, because the router was never constructed. Verify it:

```bash
# without the flag
npx tsx server/index.ts
curl -X POST localhost:3001/api/test/reset   # 404
```

## What is deliberately absent

No `Cypress.on('uncaught:exception', () => false)` in `cypress/support/e2e.ts`. If the app throws,
the test should fail. Swallowing app errors globally is the fastest way to make a suite green and
worthless.
