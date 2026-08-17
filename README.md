# Cypress best practices: an auth-gated todo app

A working reference project. The app is deliberately small; the test suite is the point.

- **41 E2E tests and 15 component tests**, all green, covering an app where every feature sits behind a login.
- **Every practice is demonstrated in code**, not just described. The table below maps each one to the file that shows it.
- **`make help` is the whole interface.** CI runs the same targets you do.

## Quickstart

```bash
make install     # deps + a local cypress.env.json
make dev         # API on :3001, client on :5180
make open        # Cypress, E2E mode, servers already up
make verify      # typecheck + lint + E2E + component. This is what CI runs.
```

Sign in with `demo@example.com` / `Password123!`.

```
$ make help
  help         Show this help
  install      Install dependencies and create a local cypress.env.json
  dev          Run the API and the client together
  dev-api      Run only the Express API (port 3001, test routes on)
  dev-web      Run only the Vite client (port 5180)
  build        Build the client
  lint         Lint everything
  lint-fix     Lint and autofix
  typecheck    Type-check the app, the server and the specs
  open         Open Cypress in E2E mode with both servers running
  open-ct      Open Cypress in component mode
  e2e          Run the E2E suite headlessly
  component    Run the component suite headlessly
  api-tests    Run only the API contract specs (fast feedback loop)
  a11y         Run only the accessibility specs
  verify       Everything CI runs
  reset-db     Reset the API's state (requires `make dev` in another terminal)
  clean        Remove build output and Cypress artifacts
```

Run a single spec:

```bash
make e2e CYPRESS_SPEC=cypress/e2e/todos/crud.cy.ts
make e2e BROWSER=chrome
```

## How it fits together

```
browser :5180  ──/api/*──▶  Express :3001
   React SPA      (Vite      in-memory store
   httpOnly       proxy)     JWT in an httpOnly cookie
   auth cookie               /api/test/* only when ENABLE_TEST_ROUTES=1
```

One origin in the browser, so `cy.request('/api/...')` resolves against `baseUrl` and the auth
cookie is same-origin in tests exactly as it is for a user.

| Path | What it is |
|---|---|
| `server/` | Express 5 API. Auth, todos, and a gated test-only reset/seed router. |
| `src/` | React 19 client. Router, auth context, protected route, components. |
| `cypress/e2e/` | Journey and contract specs. |
| `cypress/component/` | Component specs for the presentational pieces. |
| `cypress/support/commands.ts` | `getByData`, `resetDb`, `seed`, `loginByApi`, `loginByUi`. |
| `docs/` | The practices, each pointing at the code that implements it. |

## The practices, and where to look

| Practice | Where |
|---|---|
| Log in over the API, cache with `cy.session` | [`cypress/support/commands.ts`](cypress/support/commands.ts), [docs](docs/03-testing-behind-auth.md) |
| Test the login form through the UI exactly once | [`cypress/e2e/auth/login-ui.cy.ts`](cypress/e2e/auth/login-ui.cy.ts) |
| Select on `data-cy`, never on classes or copy | every spec, [docs](docs/02-selectors.md) |
| Seed state over the API, not through the UI | [`cypress/e2e/todos/filters.cy.ts`](cypress/e2e/todos/filters.cy.ts), [docs](docs/04-state-and-isolation.md) |
| Reset in `before`, never clean up in `after` | [`cypress/support/e2e.ts`](cypress/support/e2e.ts) |
| Wait on aliased requests, never on a duration | [`cypress/e2e/todos/crud.cy.ts`](cypress/e2e/todos/crud.cy.ts), [docs](docs/05-network-control.md) |
| Stub only what you cannot otherwise reach | [`cypress/e2e/todos/network-failures.cy.ts`](cypress/e2e/todos/network-failures.cy.ts) |
| Aliases and closures instead of `const x = cy.get(...)` | [`cypress/e2e/todos/crud.cy.ts`](cypress/e2e/todos/crud.cy.ts) |
| Several assertions per test, not one | [`cypress/e2e/auth/login-ui.cy.ts`](cypress/e2e/auth/login-ui.cy.ts) |
| Component tests for permutations, E2E for wiring | [`cypress/component/`](cypress/component), [docs](docs/06-component-vs-e2e.md) |
| API contract specs with no browser involved | [`cypress/e2e/api/auth-api.cy.ts`](cypress/e2e/api/auth-api.cy.ts) |
| `cy.env()` for secrets, `Cypress.expose()` for config | [`cypress.config.ts`](cypress.config.ts), [docs](docs/07-secrets-and-env.md) |
| Accessibility as a test, not a checklist | [`cypress/e2e/a11y/accessibility.cy.ts`](cypress/e2e/a11y/accessibility.cy.ts), [docs](docs/08-accessibility.md) |
| Servers started outside Cypress | [`Makefile`](Makefile), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Lint rules that enforce all of the above | [`eslint.config.js`](eslint.config.js) |

## Docs

1. [Project setup](docs/01-project-setup.md)
2. [Selectors](docs/02-selectors.md)
3. [Testing behind auth](docs/03-testing-behind-auth.md)
4. [State and test isolation](docs/04-state-and-isolation.md)
5. [Network control](docs/05-network-control.md)
6. [Component tests vs E2E](docs/06-component-vs-e2e.md)
7. [Secrets and environment variables](docs/07-secrets-and-env.md)
8. [Accessibility](docs/08-accessibility.md)
9. [CI](docs/09-ci.md)
10. [Anti-patterns](docs/10-anti-patterns.md)
11. [The Makefile as the entrypoint](docs/11-makefile-as-entrypoint.md)

## Versions

Cypress 15.20, React 19, Vite 8, Express 5, TypeScript 5.9, Node 20+.

TypeScript is pinned to 5.9 rather than 7.x because `typescript-eslint@8` has not been verified
against TS 7 here. Cypress 15.20 itself supports TS 7, so the bump is a one-line change once the
lint toolchain confirms support.

The npm scripts set environment variables inline (`ENABLE_TEST_ROUTES=1 tsx ...`), so `make dev`
needs a POSIX shell. On Windows, use WSL or add `cross-env`.
