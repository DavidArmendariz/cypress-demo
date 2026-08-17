/**
 * The one spec that drives the login form through the browser.
 *
 * Login is a feature here, so it gets real UI coverage. Everywhere else login
 * is a precondition, and preconditions are set up over the API. Testing the
 * form once and reusing the session everywhere else is the single biggest
 * speed win available in an auth-gated suite.
 */
describe('Signing in through the form', () => {
  beforeEach(() => {
    cy.resetDb()
    cy.visit('/login')
  })

  it('signs a known user in and lands them on their todos', () => {
    cy.env<{ testUserEmail: string; testUserPassword: string }>(
      ['testUserEmail', 'testUserPassword'],
      { log: false },
    ).then(({ testUserEmail, testUserPassword }) => {
      cy.getByData('login-email').type(testUserEmail)
      cy.getByData('login-password').type(testUserPassword, { log: false })
      cy.getByData('login-submit').click()
    })

    // Several assertions in one test on purpose. Splitting these into four
    // tests would repeat the whole login flow four times for no extra coverage.
    cy.location('pathname').should('eq', '/todos')
    cy.getByData('todos-page').should('be.visible')
    cy.getByData('nav-user').should('have.text', 'Demo User')
    cy.getByData('logout').should('be.visible')
  })

  it('rejects a wrong password without revealing whether the account exists', () => {
    cy.getByData('login-email').type('demo@example.com')
    cy.getByData('login-password').type('definitely-wrong', { log: false })
    cy.getByData('login-submit').click()

    cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
    cy.location('pathname').should('eq', '/login')
  })

  it('gives the same message for an unknown account', () => {
    cy.getByData('login-email').type('nobody@example.com')
    cy.getByData('login-password').type('definitely-wrong', { log: false })
    cy.getByData('login-submit').click()

    cy.getByData('login-error').should('have.text', 'Email or password is incorrect.')
  })

  it('validates on the client before it hits the network', () => {
    // Assert the request is never made, rather than waiting to see if one shows up.
    cy.intercept('POST', '/api/auth/login', cy.spy().as('loginRequest'))

    cy.getByData('login-submit').click()

    cy.getByData('login-email-error').should('have.text', 'Email is required.')
    cy.getByData('login-password-error').should('have.text', 'Password is required.')
    cy.get('@loginRequest').should('not.have.been.called')
  })

  it('disables the submit button while the request is in flight', () => {
    cy.intercept('POST', '/api/auth/login', (req) => {
      req.on('response', (res) => {
        res.setDelay(400)
      })
    }).as('login')

    cy.env<{ testUserEmail: string; testUserPassword: string }>(
      ['testUserEmail', 'testUserPassword'],
      { log: false },
    ).then(({ testUserEmail, testUserPassword }) => {
      cy.getByData('login-email').type(testUserEmail)
      cy.getByData('login-password').type(testUserPassword, { log: false })
      cy.getByData('login-submit').click()
    })

    cy.getByData('login-submit').should('be.disabled').and('have.text', 'Signing in…')
    cy.wait('@login')
    cy.getByData('todos-page').should('be.visible')
  })
})
