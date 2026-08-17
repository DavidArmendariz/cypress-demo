# 3. Testing behind auth

*[English](../en/03-testing-behind-auth.md) · [Español](../es/03-testing-behind-auth.md)*

- Test the login form through the UI once. Everywhere else, log in over the API and cache the session.
- `cy.session` with a `validate` callback is the whole mechanism.
- The specs that prove the auth boundary must explicitly *not* use the cached session.

This is where a suite for a signed-in application is won or lost. A 25-spec suite that logs in
through the form in every `beforeEach` spends most of its runtime typing a password, and every one
of those tests breaks when the login form changes.

## Log in over the API

```ts
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

Five details are load-bearing:

1. **The session id contains the email, never the password.** The id is printed in the command log
   and in CI output.
2. **The setup function asserts.** `cy.session` caches whatever state exists when setup finishes.
   Without `.should('eq', 200)`, a failed login is cached as though it succeeded, and every
   subsequent test fails somewhere confusing.
3. **`validate` calls a cheap authenticated endpoint.** If the API restarted, the token expired, or a
   database reset recreated the user with a new id, validation fails and setup re-runs automatically.
   This is what makes cross-spec caching safe.
4. **`cacheAcrossSpecs: true`** means the login happens once per run rather than once per spec file.
   Every caller must pass an identical `id`, `setup`, `validate` and `cacheAcrossSpecs`, which is why
   this belongs in one command instead of being copy-pasted.
5. **There is no `cy.visit()` inside the command.** The caller does that:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginByApi()
  cy.visit('/projects')   // here, once, after logging in
})
```

Put the visit inside the login command and you visit twice per test. Omit it entirely and, with test
isolation on, the test starts on a blank page and every command after it fails.

## Where the token lives

Prefer an **httpOnly cookie** over a token in `localStorage`. Two reasons, and the first matters more
than the testing one:

- A script injected into the page cannot read an httpOnly cookie.
- Cypress caches and restores cookies natively, so `cy.session` needs no extra plumbing.

If your application does keep a token in `localStorage`, the setup function has to write it back
itself, which is fiddlier than it looks because it depends on the browser already being on the right
origin. It is workable, it is just a reason to prefer the cookie when the choice is still open.

Non-sensitive UI state can live in `localStorage` freely. `cy.session` snapshots and restores it
alongside cookies.

## The one UI login spec

Write exactly one spec that drives the real form: success, wrong password, unknown account,
client-side validation, and the disabled-while-submitting state. That spec is the entire
justification for skipping the form everywhere else.

Keep a separate `loginByUi` command for it if you like, but do not let anything else call it.

## Specs that must not use the cache

Any spec that tests the auth boundary itself needs a genuinely signed-out browser, and because
`cacheAcrossSpecs` sessions survive across spec files, it has to say so:

```ts
beforeEach(() => {
  cy.resetDb()
  cy.clearAllCookies()
  cy.clearAllLocalStorage()
})

it('redirects a deep link to login and remembers the destination', () => {
  cy.visit('/projects/abc123')

  cy.location('pathname').should('eq', '/login')
  cy.location('search').should('contain', 'redirect=')
})
```

Cover the state in between as well. A slow session check must show a loading state and must never
render protected data before it resolves:

```ts
cy.intercept('GET', '/api/auth/me', (req) => {
  req.on('response', (res) => {
    res.setDelay(300)
  })
}).as('me')

cy.visit('/projects')

cy.getByData('auth-loading').should('be.visible')
cy.getByData('project-list').should('not.exist')
```

## Session expiry

You cannot wait out a token lifetime inside a spec, and you should not restart the API from one.
Stub the 401, which is the only thing the client actually reacts to:

```ts
cy.intercept('GET', '/api/projects', {
  statusCode: 401,
  body: { error: { message: 'Session expired', code: 'session_expired' } },
}).as('expired')

cy.visit('/projects')

cy.wait('@expired')
cy.location('pathname').should('eq', '/login')
```

Then verify the real boundary against the real server, with no browser involved:

```ts
cy.clearCookie('session_token')

cy.request({ url: '/api/projects', failOnStatusCode: false }).then((response) => {
  expect(response.status).to.eq(401)
})
```

## Multiple users and roles

Most real suites need more than one account: an admin, a member, a read-only viewer, someone in a
different organisation. `cy.session` handles this well, but the rules around the cache key are easy
to get wrong and the failure is quiet.

### The id is the cache key

Everything that varies between sessions must appear in the id. This is the classic bug:

```ts
// Wrong. The id ignores the role, so the second call returns the admin's session.
Cypress.Commands.add('loginAs', (email: string, role: string) => {
  cy.session([email], () => {
    cy.request('POST', '/api/auth/login', { email, role })
  })
})
```

Two calls with the same email and different roles produce one cache entry. The second test silently
runs as the first user, and fails somewhere far away from the cause.

Put every varying parameter in the id, and **namespace it by login mechanism** so two different ways
of authenticating cannot collide:

```ts
cy.session(['loginByApi', email, role], /* ... */)
cy.session(['loginByForm', email], /* ... */)
```

Constants that never change do not belong in the id. Passwords and tokens never belong in it either:
the id is rendered in the reporter and in CI logs.

### Define the session once

With `cacheAcrossSpecs: true`, every call site must pass an **identical** `id`, `setup`, `validate`
and `cacheAcrossSpecs`. If two specs inline their own `cy.session` blocks and one of them drifts,
Cypress raises an error rather than restoring the cached session.

So putting `cy.session` inside a single custom command is not a style preference, it is what makes
cross-spec caching work at all:

```ts
const CREDENTIALS = {
  admin: 'admin@example.com',
  member: 'member@example.com',
  viewer: 'viewer@example.com',
} as const

type Role = keyof typeof CREDENTIALS

Cypress.Commands.add('loginAs', (role: Role) => {
  cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
    ({ testUserPassword }) => {
      cy.session(
        ['loginByApi', role],
        () => {
          cy.request({
            method: 'POST',
            url: '/api/auth/login',
            body: { email: CREDENTIALS[role], password: testUserPassword },
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
    },
  )
})
```

```ts
beforeEach(() => {
  cy.resetDb()
  cy.loginAs('member')
  cy.visit('/projects')
})
```

Each role gets its own cache entry, and each is created once per run rather than once per spec.

### Why `validate` is not optional here

Reset the database and every cached session becomes stale at once, because the accounts are
recreated with new ids while the cached tokens still point at the old ones.

`validate` is what turns that into a non-event: the check fails, setup re-runs, the test proceeds.
Without it you get a burst of confusing 401s in whichever spec happens to run next. The more
accounts you cache, the more this matters.

Order matters in `beforeEach`: reset first, then log in. Reversed, you log in and immediately
invalidate the session you just created.

### Switching users inside one test

Sometimes the behaviour under test *is* the handover: one user does something, another sees the
result. You can switch sessions mid-test, and you do not need to log the first user out, because
`cy.session` clears cookies, storage and the page before running setup.

```ts
it('shows an invited member the project once they accept', () => {
  cy.loginAs('admin')
  cy.visit('/projects/abc123/members')
  cy.getByData('invite-email').type('member@example.com')
  cy.getByData('invite-submit').click()
  cy.wait('@sendInvite')

  cy.loginAs('member')
  cy.visit('/projects/abc123')          // the page was cleared, so visit again

  cy.getByData('project-title').should('have.text', 'Migration plan')
})
```

The one thing to remember is that second `cy.visit()`. Switching sessions leaves you on a blank
page, so every command after it fails until you navigate.

### Prefer not switching when you only need the side effect

Switching costs a page load. When the second user's actions are setup rather than the thing being
asserted, do them over the API and stay signed in as whoever the test is actually about:

```ts
it('shows a notification when someone else comments', () => {
  cy.loginAs('member')

  // The other user never touches the browser. Acting on their behalf is just
  // another kind of seeding, so it goes through the test-only endpoint.
  cy.seed({
    comments: [{ author: 'admin@example.com', projectId: 'abc123', body: 'Ping' }],
  })

  cy.visit('/projects/abc123')
  cy.getByData('notification-badge').should('have.text', '1')
})
```

If the side effect has to go through real application logic rather than a seed, give the test-only
router an endpoint that performs an action as a named user, and keep it behind the same flag as
everything else in [01-project-setup.md](01-project-setup.md).

A useful rule: switch sessions when the *second user's experience* is under test. Use `cy.request`
when you only need their side effect.

### Two users at the same time

You cannot have two sessions active in one browser simultaneously. If a test genuinely needs
concurrency, such as a real-time update arriving while another user is watching, drive the second
actor entirely through `cy.request` while the browser stays signed in as the first.

### Cache lifetime

Worth knowing so the numbers in your CI logs make sense:

- The cache lives in memory for one run, on one machine. It is not written to disk.
- A new run starts empty, so setup runs again.
- Under parallel CI, setup runs at least once **per machine**. Four containers means four logins per
  role, which is expected rather than a bug.
- Cached sessions are immutable. To represent a changed state, use a new id rather than trying to
  mutate an existing session.

While debugging, `Cypress.session.clearAllSavedSessions()` forces every setup to re-run.

### Testing permissions

Assert the boundary at the API as well as in the UI. A hidden button is a usability feature, not an
authorization control, and the two are frequently out of step:

```ts
cy.loginAs('viewer')

cy.request({ method: 'DELETE', url: `/api/projects/${id}`, failOnStatusCode: false })
  .its('status')
  .should('eq', 403)
```

See [06-component-vs-e2e.md](06-component-vs-e2e.md) for why these belong in API specs.

## The anti-pattern this replaces

```ts
// Do not do this in 25 spec files.
beforeEach(() => {
  cy.visit('/login')
  cy.get('#email').type('user@example.com')
  cy.get('#password').type('hunter2')
  cy.get('button[type=submit]').click()
  cy.wait(2000)
})
```

Slow, and every one of those tests now fails when the login form changes, for reasons unrelated to
what they were testing.
