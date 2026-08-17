describe('Creating an account', () => {
  beforeEach(() => {
    cy.resetDb()
    cy.visit('/signup')
  })

  it('registers a new user and signs them straight in', () => {
    // A unique value per run keeps the test independent of leftover state.
    const email = `new-${Date.now()}@example.com`

    cy.intercept('POST', '/api/auth/signup').as('signup')

    cy.getByData('signup-name').type('Ada Lovelace')
    cy.getByData('signup-email').type(email)
    cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
      ({ testUserPassword }) => {
        cy.getByData('signup-password').type(testUserPassword, { log: false })
      },
    )
    cy.getByData('signup-submit').click()

    // Assert on the request the app actually sent, not on what we hope it sent.
    cy.wait('@signup').then(({ request, response }) => {
      expect(request.body).to.include({ email, name: 'Ada Lovelace' })
      expect(response?.statusCode).to.eq(201)
    })

    cy.getByData('todos-page').should('be.visible')
    cy.getByData('nav-user').should('have.text', 'Ada Lovelace')
  })

  it('surfaces a duplicate email as a field error, not a crash', () => {
    cy.getByData('signup-name').type('Impostor')
    cy.getByData('signup-email').type('demo@example.com')
    cy.env<{ testUserPassword: string }>(['testUserPassword'], { log: false }).then(
      ({ testUserPassword }) => {
        cy.getByData('signup-password').type(testUserPassword, { log: false })
      },
    )
    cy.getByData('signup-submit').click()

    cy.getByData('signup-email-error').should('have.text', 'That email is already registered.')
    cy.getByData('signup-email').should('have.attr', 'aria-invalid', 'true')
    cy.location('pathname').should('eq', '/signup')
  })

  it('blocks a short password on the client', () => {
    cy.intercept('POST', '/api/auth/signup', cy.spy().as('signupRequest'))

    cy.getByData('signup-name').type('Ada Lovelace')
    cy.getByData('signup-email').type('ada@example.com')
    cy.getByData('signup-password').type('short', { log: false })
    cy.getByData('signup-submit').click()

    cy.getByData('signup-password-error').should('have.text', 'Password must be at least 8 characters.')
    cy.get('@signupRequest').should('not.have.been.called')
  })
})
