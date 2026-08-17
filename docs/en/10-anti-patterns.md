# 10. Anti-patterns

*[English](../en/10-anti-patterns.md) · [Español](../es/10-anti-patterns.md)*

- Most Cypress flake comes from about a dozen recurring habits.
- Five of them can be caught automatically by lint rules. The rest need review.
- Each entry links to the chapter that shows the alternative.

| Anti-pattern | Instead | Caught by |
|---|---|---|
| Logging in through the UI in every `beforeEach` | API login cached with `cy.session` | review |
| `cy.wait(2000)` | `cy.wait('@alias')` or a retrying assertion | `cypress/no-unnecessary-waiting` |
| `cy.get('.btn-primary')`, `cy.contains('Save')` | a dedicated test attribute | review |
| `const el = cy.get('#thing')` | aliases and `.then()` closures | `cypress/no-assigning-return-values` |
| `cy.get('x').focus().type('y')` | split the chain | `cypress/unsafe-to-chain-command` |
| `it('...', async () => { await cy.get(...) })` | no `async` in test bodies | `cypress/no-async-tests` |
| `Cypress.env('password')` | `cy.env(['password'])` | lint rule + `allowCypressEnv: false` |
| Cleanup in `after` / `afterEach` | reset in `before` | review |
| Tests that depend on the previous test | each test seeds its own state | review |
| One assertion per test | several assertions per journey | review |
| Starting servers with `cy.exec` | the process manager, or CI | review |
| Global `Cypress.on('uncaught:exception', () => false)` | let application errors fail the test | review |
| Stubbing every request | real requests for the happy path | review |
| Conditional testing on unstable DOM | make the application deterministic | review |
| Page-object classes | custom commands and app actions | review |

## The ones that need more than a table row

### `cy.wait(number)`

The single most common source of both slowness and flake. Two seconds is too long on a fast machine
and not long enough on a loaded CI runner, and the number only ever grows. Every wait should be an
aliased request or a retrying assertion. See [05-network-control.md](05-network-control.md).

### Assigning command return values

```ts
const button = cy.get('[data-cy="submit"]')   // a chainable, not an element
button.click()                                 // sometimes works, teaches the wrong model
```

Cypress commands are enqueued, not executed. Use an alias (`.as('submit')`, then `cy.get('@submit')`)
or a `.then()` closure. This one is worth explaining rather than just fixing, because the underlying
misunderstanding produces a steady stream of other bugs.

### Conditional testing

```ts
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="cookie-banner"]').length) {
    cy.getByData('dismiss').click()
  }
})
```

This is a race, not a test. The banner may simply not have rendered yet, and the branch silently
skips. It is legitimate only when the DOM has genuinely settled and the condition is real, such as a
server-driven feature flag. If you need it because you do not know what state the application is in,
the fix is to control the state rather than branch on it.

### Global exception swallowing

`Cypress.on('uncaught:exception', () => false)` in a support file turns a red suite green in one
line, and stops it reporting real defects at the same time. Handle the specific error instead:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```

### Page objects

Page objects centralise selectors, which genuinely helps, and then tend to grow methods like
`loginPage.loginAsValidUser()` that reintroduce UI login everywhere, plus a layer of indirection that
makes a failing test hard to read.

Custom commands and app actions give the same reuse without modelling the browser as an object graph.
See [02-selectors.md](02-selectors.md).

### Testing third-party sites

Do not drive another company's login page, payment form or email client through the browser. You do
not control their markup, their uptime or their bot detection. Call their API with `cy.request`, stub
the callback, or use their test mode.

The same applies to identity providers. For SSO flows, get a token through the provider's API or a
test-mode endpoint and set the session directly.

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
  },
}
```

A lint rule catches the habit in review, every time, without anyone having to remember. The rest of
this list still needs a human, which is what these chapters are for.

## If you are inheriting an existing suite

Do not rewrite it. Fix in this order, because each step makes the next one cheaper:

1. **Replace UI login with a cached API login.** Usually the largest single speed win, and it touches
   one file.
2. **Delete every `cy.wait(number)`**, replacing each with an aliased wait. Turn on the lint rule so
   they cannot come back.
3. **Make the suite order-independent**, by giving each test its own seeded state.
4. **Introduce the test attribute convention** for new and touched specs only.
5. **Push permutations down** to component and API tests as you touch each area.

Steps 1 and 2 typically account for most of the runtime and most of the flake.
