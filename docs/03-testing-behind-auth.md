# 3. Testing behind auth

- Test the login form through the UI once. Everywhere else, log in over the API and cache it.
- `cy.session` with a `validate` callback is the whole mechanism.
- The specs that prove the auth boundary must explicitly *not* use the cached session.

This is where an auth-gated suite is won or lost. A 25-spec suite that logs in through the form in
every `beforeEach` spends most of its runtime typing a password.

## Log in over the API

```ts
// cypress/support/commands.ts
Cypress.Commands.add('loginByApi', (email?: string, password?: string) => {
  cy.env<{ testUserEmail: string; testUserPassword: string }>(
    ['testUserEmail', 'testUserPassword'],
    { log: false },
  ).then(({ testUserEmail, testUserPassword }) => {
    const user = email ?? testUserEmail
    const secret = password ?? testUserPassword

    cy.session(
      ['api-login', user],
      () => {
        cy.request({
          method: 'POST',
          url: '/api/auth/login',
          body: { email: user, password: secret },
          log: false,
        })
          .its('status')
          .should('eq', 200)
      },
      {
        validate() {
          cy.request({ url: '/api/auth/me', failOnStatusCode: false })
            .its('status')
            .should('eq', 200)
        },
        cacheAcrossSpecs: true,
      },
    )
  })
})
```

Five things are load-bearing here:

1. **The session id contains the email, never the password.** The id is printed in the command log
   and in CI output.
2. **`setup` asserts.** `cy.session` caches whatever state exists when setup finishes. Without the
   `.should('eq', 200)`, a failed login gets cached as if it succeeded.
3. **`validate` hits a cheap authenticated endpoint.** If the API restarted, or the token expired,
   or a `cy.resetDb()` recreated the user with a new id, validation fails and setup re-runs
   automatically. This is what makes `cacheAcrossSpecs` safe.
4. **`cacheAcrossSpecs: true`** means the login happens once per run, not once per spec file. Every
   caller must pass an identical `id`, `setup`, `validate` and `cacheAcrossSpecs`, which is why this
   lives in one command rather than being copy-pasted.
5. **There is no `cy.visit()` inside the command.** The caller does that:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginByApi()
  cy.visit('/todos')   // here, once, after logging in
})
```

Put the visit inside the login command and you visit twice per test. Omit it entirely and, with test
isolation on, the test starts on a blank page and every command after it fails.

## Why the token is a cookie

`server/auth.ts` puts the JWT in an httpOnly cookie. Two payoffs:

- A script injected into the page cannot read it.
- Cypress caches and restores cookies natively, so `cy.session` needs no extra plumbing. If your app
  keeps a token in `localStorage`, the setup function has to write it back itself, and that is
  fiddlier than it looks. Prefer the cookie.

Non-sensitive UI state can still live in `localStorage`; `src/pages/TodosPage.tsx` stores the
selected filter there, and `cypress/e2e/todos/filters.cy.ts` asserts it survives a reload.

## The one UI login spec

`cypress/e2e/auth/login-ui.cy.ts` drives the real form: success, wrong password, unknown account,
client-side validation, and the disabled-while-submitting state. That spec is the entire justification
for skipping the form everywhere else. `cy.loginByUi` exists in `commands.ts` for it, and is used by
nothing else on purpose.

## Specs that must not use the cache

`cypress/e2e/auth/route-guard.cy.ts` tests the gate itself, so the signed-out half says so:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.clearAllCookies()
  cy.clearAllLocalStorage()
})
```

Because `cacheAcrossSpecs` sessions survive across spec files, a spec that needs a genuinely
signed-out browser has to ask for one. That spec also covers the states in between: a delayed
`/api/auth/me` must show `auth-loading` and must never render todo data before the check resolves.

## Session expiry

You cannot wait out a token TTL in a spec, and you should not restart the API from one. Stub the
401, which is the only thing the client actually reacts to:

```ts
// cypress/e2e/auth/session-expiry.cy.ts
cy.intercept('GET', '/api/todos', {
  statusCode: 401,
  body: { error: { message: 'Session expired', code: 'session_expired' } },
}).as('expiredTodos')
```

Then assert the real security boundary against the real server, with no browser involved:

```ts
cy.clearCookie('todo_demo_token')
cy.request({ url: '/api/todos', failOnStatusCode: false }).then((response) => {
  expect(response.status).to.eq(401)
})
```

## Anti-pattern this replaces

```ts
// Do not do this in 25 spec files.
beforeEach(() => {
  cy.visit('/login')
  cy.get('#email').type('demo@example.com')
  cy.get('#password').type('Password123!')
  cy.get('button[type=submit]').click()
  cy.wait(2000)
})
```

Slow, and every one of those tests now fails when the login form changes, for reasons unrelated to
what they were testing.
