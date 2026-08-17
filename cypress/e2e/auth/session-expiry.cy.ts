/**
 * Expiry is hard to test for real: you would have to wait out the token TTL,
 * or restart the API with a shorter one. Neither belongs in a spec. Stub the
 * 401 instead, which is the only thing the client actually reacts to.
 */
describe('When the session stops being valid', () => {
  beforeEach(() => {
    cy.resetDb()
    cy.loginByApi()
  })

  it('drops to the login page when the API rejects the token', () => {
    cy.intercept('GET', '/api/todos', {
      statusCode: 401,
      body: { error: { message: 'Session expired', code: 'session_expired' } },
    }).as('expiredTodos')

    cy.visit('/todos')

    cy.wait('@expiredTodos')
    cy.location('pathname').should('eq', '/login')
    cy.getByData('login-form').should('be.visible')
    cy.getByData('nav').should('not.exist')
  })

  it('keeps the user in place when a write fails for a reason other than auth', () => {
    cy.seed({ todos: [{ email: 'demo@example.com', title: 'Still here' }] })
    cy.visit('/todos')

    cy.intercept('PATCH', '/api/todos/*', {
      statusCode: 500,
      body: { error: { message: 'Server error. Please try again.', code: 'server_error' } },
    }).as('failedToggle')

    cy.getByData('todo-toggle').click()
    cy.wait('@failedToggle')

    cy.getByData('todos-error').should('be.visible')
    cy.location('pathname').should('eq', '/todos')
    cy.getByData('todo-item').should('have.length', 1)
  })

  it('really is signed out server-side once the cookie is gone', () => {
    cy.clearCookie('todo_demo_token')

    // A direct API assertion is the fastest way to prove a security boundary.
    cy.request({ url: '/api/todos', failOnStatusCode: false }).then((response) => {
      expect(response.status).to.eq(401)
      expect(response.body.error.code).to.eq('unauthenticated')
    })
  })
})
