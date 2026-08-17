# 10. Anti-patterns

- Most Cypress flake is one of a dozen recurring habits.
- Five of them are caught by the lint config in this repo. The rest need review.
- Each entry below links to the doc and the file that shows the alternative.

| Anti-pattern | Instead | Enforced by |
|---|---|---|
| Logging in through the UI in every `beforeEach` | `cy.loginByApi()` + `cy.session` | review |
| `cy.wait(2000)` | `cy.wait('@alias')` or a retrying assertion | `cypress/no-unnecessary-waiting` |
| `cy.get('.btn-primary')`, `cy.contains('Save')` | `cy.getByData('save')` | review |
| `const el = cy.get('#thing')` | aliases and `.then()` closures | `cypress/no-assigning-return-values` |
| `cy.get('x').focus().type('y')` | split the chain | `cypress/unsafe-to-chain-command` |
| `it('...', async () => { await cy.get(...) })` | no `async` in test bodies | `cypress/no-async-tests` |
| `Cypress.env('password')` | `cy.env(['password'])` | `no-restricted-syntax` + `allowCypressEnv: false` |
| Cleanup in `after` / `afterEach` | reset in `before` | review |
| Tests that depend on the previous test | seed each test's own state | review |
| One assertion per test | several assertions per journey | review |
| Starting servers with `cy.exec` | `start-server-and-test`, the Makefile, CI | review |
| `Cypress.on('uncaught:exception', () => false)` globally | let app errors fail the test | review |
| Stubbing every request | real requests for the happy path | review |
| Conditional testing on unstable DOM | make the app deterministic | review |
| Page-object classes | custom commands and app actions | review |

## The ones that need more than a table row

### `cy.wait(number)`

The single most common source of both slowness and flake. Two seconds is too long on a fast machine
and not long enough on a loaded CI runner, and the number only ever gets bigger. Every wait in this
repo is either an aliased request or an assertion that retries. See
[05-network-control.md](05-network-control.md).

### Assigning command return values

```ts
const button = cy.get('[data-cy="submit"]')   // this is a chainable, not an element
button.click()                                 // sometimes works, teaches the wrong model
```

Cypress commands are enqueued, not executed. Use an alias (`.as('submit')`, then `cy.get('@submit')`)
or a `.then()` closure. `cypress/e2e/todos/crud.cy.ts` has a test written specifically to demonstrate
the alias pattern.

### Conditional testing

```ts
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="cookie-banner"]').length) {
    cy.getByData('dismiss').click()
  }
})
```

This is a race, not a test: the banner may simply not have rendered yet, and the branch silently
skips. It is legitimate only when the DOM has genuinely settled and the condition is real (a
server-driven feature flag, say). If you need it because you do not know what state the app is in,
the fix is to control the state, not to branch on it.

### Global exception swallowing

`Cypress.on('uncaught:exception', () => false)` in the support file makes a red suite green in one
line, and makes it stop reporting real bugs at the same time. If a specific third-party script
throws, handle that one error narrowly:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```

`cypress/support/e2e.ts` deliberately has no handler at all, and says so in a comment.

### Page objects

Page objects centralise selectors, which is genuinely useful, and then tend to grow methods like
`loginPage.loginAsValidUser()` that reintroduce UI login everywhere, plus a layer of indirection that
makes a failing test hard to read. Custom commands (`cy.getByData`) and app actions (`cy.seed`,
`cy.loginByApi`) give the same reuse without modelling the browser as an object graph. See
[02-selectors.md](02-selectors.md).

### Testing third-party sites

Do not drive someone else's login page, payment form or email client through the browser. You do not
control their markup, their uptime or their bot detection. Hit their API with `cy.request`, stub the
callback, or use a test mode. This app has no third-party dependencies, which is itself a
simplification a real project rarely gets.

## Enforcement

```js
// eslint.config.js
{
  files: ['cypress/**/*.{ts,tsx}'],
  ...cypress.configs.recommended,
  rules: {
    'cypress/no-unnecessary-waiting': 'error',
    'cypress/no-assigning-return-values': 'error',
    'cypress/unsafe-to-chain-command': 'error',
    'cypress/no-async-tests': 'error',
    // ...
  },
}
```

A rule catches the habit in review, every time, without anyone having to remember. The rest of this
list still needs a human, which is what the docs are for.
