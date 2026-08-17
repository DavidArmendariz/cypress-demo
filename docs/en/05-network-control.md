# 5. Network control

*[English](../en/05-network-control.md) · [Español](../es/05-network-control.md)*

- Never `cy.wait(number)`. Wait on an aliased request or assert on a state.
- Real requests for the happy path. Stubs for failures and for states you cannot otherwise reach.
- Assert on the request the app actually sent, not the one you hoped it sent.

## Waiting

```ts
// cypress/e2e/todos/crud.cy.ts
cy.intercept('POST', '/api/todos').as('createTodo')

cy.getByData('new-todo-input').type('Write the docs')
cy.getByData('add-todo-submit').click()

cy.wait('@createTodo').its('response.statusCode').should('eq', 201)
cy.getByData('todo-item').should('have.length', 1)
```

`cy.wait('@alias')` waits exactly as long as the request takes. `cy.wait(2000)` waits two seconds:
too long on a fast machine, not long enough on a loaded CI runner, and it makes the suite slower
every time someone adds one. `eslint-plugin-cypress`'s `no-unnecessary-waiting` rule makes it an
error in this repo.

Most of the time you do not need `cy.wait` at all. Assertions retry:

```ts
cy.getByData('todo-item').should('have.length', 1)
```

That polls until the element list matches or the timeout expires. Use an aliased wait when you want
to assert something about the *request* itself, or when you need a hard synchronisation point before
a stub swap.

Note the server adds a small deliberate delay to writes (`server/routes/todos.ts`). Without it,
mutations resolve so fast that a sloppy spec passes by accident.

## Real vs stubbed

The rule used here:

| Situation | Approach |
|---|---|
| Happy path | Real request. It is the only thing that proves the client and the API agree. |
| 500, 404, 401 | Stub. You cannot ask a healthy server for an error. |
| Dropped connection | Stub with `forceNetworkError`. |
| Loading state | Stub with `delay`, or `res.setDelay()`. |
| A data shape that is expensive to create | Stub. 50 records via the UI is not a test, it is a chore. |

All five appear in `cypress/e2e/todos/network-failures.cy.ts`:

```ts
cy.intercept('GET', '/api/todos', { statusCode: 500, body: { /* ... */ } }).as('failedLoad')
cy.intercept('GET', '/api/todos', { forceNetworkError: true }).as('droppedLoad')
cy.intercept('GET', '/api/todos', (req) => {
  req.reply({ statusCode: 200, body: { todos: [] }, delay: 600 })
}).as('slowLoad')
```

Delaying a *real* response, rather than stubbing the body, is a different tool:

```ts
cy.intercept('POST', '/api/auth/login', (req) => {
  req.on('response', (res) => {
    res.setDelay(400)
  })
}).as('login')
```

The response is genuine; only its timing is manipulated. That is what makes the
disabled-while-submitting assertion in `cypress/e2e/auth/login-ui.cy.ts` meaningful.

Stub everything and you get a suite that passes while the product is broken, because it only ever
tests the client against your assumptions about the API. That is what
`cypress/e2e/api/auth-api.cy.ts` guards against: if the client specs pass and the contract specs
fail, your stubs have drifted.

## Assert on the outgoing request

```ts
// cypress/e2e/auth/signup.cy.ts
cy.wait('@signup').then(({ request, response }) => {
  expect(request.body).to.include({ email, name: 'Ada Lovelace' })
  expect(response?.statusCode).to.eq(201)
})
```

And for "this request must never happen", spy instead of watching the clock:

```ts
cy.intercept('POST', '/api/auth/login', cy.spy().as('loginRequest'))
cy.getByData('login-submit').click()
cy.get('@loginRequest').should('not.have.been.called')
```

That is a real assertion about client-side validation. `cy.wait(1000)` followed by hoping is not.

## Restoring after a stub

Interceptors are per-test, so nothing leaks. Within a test you can layer a second `cy.intercept` on
the same route to change behaviour mid-flow, which is how the retry path is tested:

```ts
cy.intercept('GET', '/api/todos', { statusCode: 500, /* ... */ }).as('failedLoad')
cy.visit('/todos')
cy.wait('@failedLoad')

cy.intercept('GET', '/api/todos', { statusCode: 200, body: { todos: [] } }).as('retriedLoad')
cy.getByData('todos-retry').click()
cy.wait('@retriedLoad')
cy.getByData('todos-error').should('not.exist')
```
