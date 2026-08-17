/**
 * The gate itself. These are the tests that prove the auth boundary exists,
 * so they must not use the cached session for the "signed out" half.
 */
describe('The /todos route guard', () => {
  context('when signed out', () => {
    beforeEach(() => {
      cy.resetDb()
      // cy.session caches across specs, so a spec that needs a signed-out
      // browser has to say so explicitly.
      cy.clearAllCookies()
      cy.clearAllLocalStorage()
    })

    it('redirects a deep link to the login page and remembers where you were going', () => {
      cy.visit('/todos')

      cy.location('pathname').should('eq', '/login')
      cy.location('search').should('eq', '?redirect=%2Ftodos')
      cy.getByData('login-form').should('be.visible')
      cy.getByData('nav').should('not.exist')
    })

    it('never renders todo data before the session check resolves', () => {
      cy.intercept('GET', '/api/auth/me', (req) => {
        req.on('response', (res) => {
          res.setDelay(300)
        })
      }).as('me')

      cy.visit('/todos')

      cy.getByData('auth-loading').should('be.visible')
      cy.getByData('todo-list').should('not.exist')
      cy.wait('@me')
      cy.getByData('login-form').should('be.visible')
    })
  })

  context('when signed in', () => {
    beforeEach(() => {
      cy.resetDb()
      cy.loginByApi()
      // cy.visit() belongs here, after the login command, not inside it.
      cy.visit('/todos')
    })

    it('renders the protected page', () => {
      cy.getByData('todos-page').should('be.visible')
      cy.getByData('nav-user').should('have.text', 'Demo User')
    })

    it('bounces an authenticated user away from the login page', () => {
      cy.visit('/login')

      cy.location('pathname').should('eq', '/todos')
      cy.getByData('todos-page').should('be.visible')
    })

    it('sends you back to login after signing out', () => {
      cy.getByData('logout').click()

      cy.location('pathname').should('eq', '/login')
      cy.getByData('nav').should('not.exist')

      // And the guard still holds on a fresh navigation.
      cy.visit('/todos')
      cy.location('pathname').should('eq', '/login')
    })
  })
})
