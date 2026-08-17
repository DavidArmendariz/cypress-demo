/**
 * No browser, no UI, just the contract. These run in a couple of seconds and
 * cover the permutations that would be tedious and slow through the form:
 * status codes, error codes, and the authorization boundary between users.
 *
 * If one of these fails, the bug is in the API. If a UI spec fails and these
 * pass, the bug is in the client. That split is the whole point.
 */
describe('Auth API contract', () => {
  let password: string

  beforeEach(() => {
    cy.resetDb()
    cy.clearAllCookies()
    cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then((env) => {
      password = env.testUserPassword
    })
  })

  it('rejects an unauthenticated read', () => {
    cy.request({ url: '/api/todos', failOnStatusCode: false }).then((response) => {
      expect(response.status).to.eq(401)
      expect(response.body.error.code).to.eq('unauthenticated')
    })
  })

  it('validates the signup payload and reports every bad field at once', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/signup',
      failOnStatusCode: false,
      body: { email: 'not-an-email', password: 'short', name: '' },
    }).then((response) => {
      expect(response.status).to.eq(400)
      expect(response.body.error.code).to.eq('validation_failed')
      expect(response.body.error.fields).to.have.keys(['email', 'password', 'name'])
    })
  })

  it('answers identically for an unknown user and a wrong password', () => {
    const attempt = (body: { email: string; password: string }) =>
      cy.request({ method: 'POST', url: '/api/auth/login', failOnStatusCode: false, body })

    attempt({ email: 'nobody@example.com', password: 'whatever-123' }).then((unknown) => {
      attempt({ email: 'demo@example.com', password: 'wrong-password-123' }).then((wrong) => {
        expect(unknown.status).to.eq(401)
        expect(wrong.status).to.eq(401)
        expect(unknown.body).to.deep.equal(wrong.body)
      })
    })
  })

  it('issues an httpOnly cookie on login and clears it on logout', () => {
    cy.request({ method: 'POST', url: '/api/auth/login', body: { email: 'demo@example.com', password } })
      .its('status')
      .should('eq', 200)

    cy.getCookie('todo_demo_token').should('have.property', 'httpOnly', true)
    cy.request('GET', '/api/auth/me').its('body.user.email').should('eq', 'demo@example.com')

    cy.request('POST', '/api/auth/logout').its('status').should('eq', 204)
    cy.getCookie('todo_demo_token').should('be.null')
  })

  it('scopes todos to their owner', () => {
    cy.seed({
      users: [
        { email: 'alice@example.com', password, name: 'Alice' },
        { email: 'mallory@example.com', password, name: 'Mallory' },
      ],
      todos: [{ email: 'alice@example.com', title: "Alice's private note" }],
    }).then((seeded) => {
      const aliceTodoId = seeded.todos[0].id

      cy.request('POST', '/api/auth/login', { email: 'mallory@example.com', password })

      cy.request('GET', '/api/todos').its('body.todos').should('have.length', 0)

      // A 404, not a 403: the response must not confirm that the id exists.
      cy.request({
        method: 'PATCH',
        url: `/api/todos/${aliceTodoId}`,
        failOnStatusCode: false,
        body: { completed: true },
      }).then((response) => {
        expect(response.status).to.eq(404)
        expect(response.body.error.code).to.eq('todo_not_found')
      })

      cy.request({
        method: 'DELETE',
        url: `/api/todos/${aliceTodoId}`,
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 404)
    })
  })

  it('rejects a forged token', () => {
    cy.setCookie('todo_demo_token', 'not.a.real.jwt')

    cy.request({ url: '/api/auth/me', failOnStatusCode: false }).then((response) => {
      expect(response.status).to.eq(401)
      expect(response.body.error.code).to.eq('session_expired')
    })
  })
})
