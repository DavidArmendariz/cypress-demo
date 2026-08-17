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
make docs        # the docs site on :5175, hot reloading
make verify      # typecheck + lint + E2E + component + docs build. This is what CI runs.
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
  docs         Serve the docs site locally with hot reload
  docs-build   Build the docs site into docs/.vitepress/dist
  docs-preview Serve the built docs site
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
| `docs/en/`, `docs/es/` | The client-facing guide, English and Spanish. Deliberately repo-agnostic. |
| `docs/.vitepress/` | VitePress config for the published site. |

## The practices, and where to look

| Practice | Where |
|---|---|
| Log in over the API, cache with `cy.session` | [`cypress/support/commands.ts`](cypress/support/commands.ts), [docs](docs/en/03-testing-behind-auth.md) |
| Test the login form through the UI exactly once | [`cypress/e2e/auth/login-ui.cy.ts`](cypress/e2e/auth/login-ui.cy.ts) |
| Select on `data-cy`, never on classes or copy | every spec, [docs](docs/en/02-selectors.md) |
| Seed state over the API, not through the UI | [`cypress/e2e/todos/filters.cy.ts`](cypress/e2e/todos/filters.cy.ts), [docs](docs/en/04-state-and-isolation.md) |
| Reset in `before`, never clean up in `after` | [`cypress/support/e2e.ts`](cypress/support/e2e.ts) |
| Wait on aliased requests, never on a duration | [`cypress/e2e/todos/crud.cy.ts`](cypress/e2e/todos/crud.cy.ts), [docs](docs/en/05-network-control.md) |
| Stub only what you cannot otherwise reach | [`cypress/e2e/todos/network-failures.cy.ts`](cypress/e2e/todos/network-failures.cy.ts) |
| Aliases and closures instead of `const x = cy.get(...)` | [`cypress/e2e/todos/crud.cy.ts`](cypress/e2e/todos/crud.cy.ts) |
| Several assertions per test, not one | [`cypress/e2e/auth/login-ui.cy.ts`](cypress/e2e/auth/login-ui.cy.ts) |
| Component tests for permutations, E2E for wiring | [`cypress/component/`](cypress/component), [docs](docs/en/06-component-vs-e2e.md) |
| API contract specs with no browser involved | [`cypress/e2e/api/auth-api.cy.ts`](cypress/e2e/api/auth-api.cy.ts) |
| `cy.env()` for secrets, `Cypress.expose()` for config | [`cypress.config.ts`](cypress.config.ts), [docs](docs/en/07-secrets-and-env.md) |
| Accessibility as a test, not a checklist | [`cypress/e2e/a11y/accessibility.cy.ts`](cypress/e2e/a11y/accessibility.cy.ts), [docs](docs/en/08-accessibility.md) |
| Servers started outside Cypress | [`Makefile`](Makefile), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Lint rules that enforce all of the above | [`eslint.config.js`](eslint.config.js) |

## Docs

Published with VitePress at **https://davidarmendariz.github.io/cypress-demo/**. Locally: `make docs`.

Available in English and Spanish. Same filenames in both, so every page has a direct counterpart.
Index: [`docs/README.md`](docs/README.md), which is also the site's landing page.

**The guide is written to be shared with clients**, so it stands on its own: no file paths into this
repository, no references to the demo app, and examples built around a generic scenario (users sign in,
then manage their projects). Keep it that way when editing. Anything specific to this codebase belongs
in this README, not in `docs/`.

| # | English | Español |
|---|---|---|
| 1 | [Project setup](docs/en/01-project-setup.md) | [Configuración del proyecto](docs/es/01-project-setup.md) |
| 2 | [Selectors](docs/en/02-selectors.md) | [Selectores](docs/es/02-selectors.md) |
| 3 | [Testing behind auth](docs/en/03-testing-behind-auth.md) | [Probar detrás de la autenticación](docs/es/03-testing-behind-auth.md) |
| 4 | [State and test isolation](docs/en/04-state-and-isolation.md) | [Estado y aislamiento de pruebas](docs/es/04-state-and-isolation.md) |
| 5 | [Network control](docs/en/05-network-control.md) | [Control de la red](docs/es/05-network-control.md) |
| 6 | [Choosing the right level of test](docs/en/06-component-vs-e2e.md) | [Elegir el nivel adecuado de prueba](docs/es/06-component-vs-e2e.md) |
| 7 | [Secrets and environment variables](docs/en/07-secrets-and-env.md) | [Secretos y variables de entorno](docs/es/07-secrets-and-env.md) |
| 8 | [Accessibility](docs/en/08-accessibility.md) | [Accesibilidad](docs/es/08-accessibility.md) |
| 9 | [Continuous integration](docs/en/09-ci.md) | [Integración continua](docs/es/09-ci.md) |
| 10 | [Anti-patterns](docs/en/10-anti-patterns.md) | [Antipatrones](docs/es/10-anti-patterns.md) |
| 11 | [A single task entrypoint](docs/en/11-makefile-as-entrypoint.md) | [Un único punto de entrada de tareas](docs/es/11-makefile-as-entrypoint.md) |

Code, file paths, identifiers and Cypress API names stay in English in both locales. Only the prose
is translated. `docs/en/` is the source of truth when the two disagree.

## Versions

Cypress 15.20, React 19, Vite 8, Express 5, TypeScript 5.9, Node 20+.

TypeScript is pinned to 5.9 rather than 7.x because `typescript-eslint@8` has not been verified
against TS 7 here. Cypress 15.20 itself supports TS 7, so the bump is a one-line change once the
lint toolchain confirms support.

The npm scripts set environment variables inline (`ENABLE_TEST_ROUTES=1 tsx ...`), so `make dev`
needs a POSIX shell. On Windows, use WSL or add `cross-env`.
