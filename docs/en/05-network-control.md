# 5. Network control

*[English](../en/05-network-control.md) · [Español](../es/05-network-control.md)*

- Never `cy.wait(number)`. Wait on an aliased request or assert on a state.
- Real requests for the happy path. Stubs for failures and for states you cannot otherwise reach.
- Assert on the request the application actually sent, not the one you hoped it sent.

## Waiting

```ts
cy.intercept('POST', '/api/projects').as('createProject')

cy.getByData('new-project-input').type('Migration plan')
cy.getByData('create-project-submit').click()

cy.wait('@createProject').its('response.statusCode').should('eq', 201)
cy.getByData('project-item').should('have.length', 1)
```

`cy.wait('@alias')` waits exactly as long as the request takes. `cy.wait(2000)` waits two seconds:
too long on a fast machine, not long enough on a loaded CI runner, and it makes the suite slower
every time someone adds one. Those numbers only ever grow.

Most of the time you need no explicit wait at all, because assertions retry:

```ts
cy.getByData('project-item').should('have.length', 1)
```

That polls until the list matches or the timeout expires. Use an aliased wait when you want to
assert something about the *request itself*, or when you need a hard synchronisation point before
swapping a stub.

A useful trick when building a suite: if a mutation resolves instantly in development, a careless
spec can pass by accident. Introducing a small artificial latency on writes in your test environment
forces specs to wait on a real signal.

## Real vs stubbed

| Situation | Approach |
|---|---|
| Happy path | Real request. It is the only thing that proves client and API agree. |
| 500, 404, 401 | Stub. You cannot ask a healthy server for an error. |
| Dropped connection | Stub with `forceNetworkError`. |
| Loading state | Stub with `delay`, or delay a real response. |
| Data shape that is expensive to create | Stub. Creating 50 records through the UI is a chore, not a test. |

```ts
cy.intercept('GET', '/api/projects', {
  statusCode: 500,
  body: { error: { message: 'Server error. Please try again.', code: 'server_error' } },
}).as('failedLoad')

cy.intercept('GET', '/api/projects', { forceNetworkError: true }).as('droppedLoad')

cy.intercept('GET', '/api/projects', (req) => {
  req.reply({ statusCode: 200, body: { projects: [] }, delay: 600 })
}).as('slowLoad')
```

Delaying a *real* response is a different tool from stubbing the body:

```ts
cy.intercept('POST', '/api/auth/login', (req) => {
  req.on('response', (res) => {
    res.setDelay(400)
  })
}).as('login')
```

The response is genuine, only its timing is manipulated. That is what makes a
disabled-while-submitting assertion meaningful rather than a race.

**Do not stub everything.** A fully stubbed suite passes while the product is broken, because it only
tests the client against your assumptions about the API. Contract tests are the guard against that
drift: see [06-component-vs-e2e.md](06-component-vs-e2e.md).

## Assert on the outgoing request

```ts
cy.wait('@signup').then(({ request, response }) => {
  expect(request.body).to.include({ email, name: 'Ada Lovelace' })
  expect(response?.statusCode).to.eq(201)
})
```

For "this request must never happen", use a spy instead of watching the clock:

```ts
cy.intercept('POST', '/api/auth/login', cy.spy().as('loginRequest'))

cy.getByData('login-submit').click()

cy.getByData('login-email-error').should('be.visible')
cy.get('@loginRequest').should('not.have.been.called')
```

That is a real assertion about client-side validation. `cy.wait(1000)` followed by hoping is not.

## Layering stubs within a test

Interceptors are scoped to the test, so nothing leaks between them. Inside a test you can layer a
second `cy.intercept` on the same route to change behaviour mid-flow, which is how you test a retry
path:

```ts
cy.intercept('GET', '/api/projects', { statusCode: 500, body: serverError }).as('failedLoad')
cy.visit('/projects')
cy.wait('@failedLoad')
cy.getByData('projects-error').should('be.visible')

cy.intercept('GET', '/api/projects', { statusCode: 200, body: { projects: [] } }).as('retried')
cy.getByData('projects-retry').click()

cy.wait('@retried')
cy.getByData('projects-error').should('not.exist')
cy.getByData('projects-empty').should('be.visible')
```

Asserting that the error **clears** matters as much as asserting it appeared. Lingering error
banners are a common and easily missed defect.

## Errors worth covering

Once the plumbing is in place, these four cost about ten lines each and catch real problems:

- The list fails to load, and the retry works.
- The connection drops, and the message distinguishes it from a server error.
- A write fails, and the user's typed input is preserved rather than cleared.
- A slow response shows a loading state, and controls are disabled while it is in flight.
