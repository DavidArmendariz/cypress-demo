import type { SeedPayload, SeedResult } from './index'

/**
 * Selecting elements
 * ------------------
 * One selector helper, one convention: `data-cy`. Classes and text change for
 * design reasons and take the suite down with them; a data-cy attribute exists
 * only for tests, so changing it is a deliberate act.
 */
Cypress.Commands.add('getByData', (selector: string, options = {}) =>
  cy.get(`[data-cy="${selector}"]`, options),
)

/**
 * Controlling state
 * -----------------
 * Reset and seed over the API. Building fixtures through the UI makes every
 * spec depend on the correctness of unrelated screens.
 */
Cypress.Commands.add('resetDb', () => {
  cy.request('POST', '/api/test/reset')
    .its('status')
    .should('eq', 200)
    .then(() => undefined)
})

Cypress.Commands.add('seed', (payload: SeedPayload) =>
  cy
    .request<SeedResult>('POST', '/api/test/seed', payload)
    .its('body')
    .should('exist')
    .then((body) => body as SeedResult),
)

/**
 * Logging in
 * ----------
 * cy.session caches the auth cookie, so the login round trip happens once per
 * run rather than once per test. `validate` re-checks the cached session, and
 * re-runs setup if the server has since restarted or the token expired.
 *
 * Note there is no cy.visit() in here: the caller does that in beforeEach,
 * once, after logging in.
 */
Cypress.Commands.add('loginByApi', (email?: string, password?: string) => {
  cy.env<{ testUserEmail: string; testUserPassword: string }>(
    ['testUserEmail', 'testUserPassword'],
    { log: false },
  ).then(({ testUserEmail, testUserPassword }) => {
    const user = email ?? testUserEmail
    const secret = password ?? testUserPassword

    cy.session(
      // Only the email is part of the cache key. Never put a password in it:
      // the id is printed in the command log and in CI output.
      ['api-login', user],
      () => {
        cy.request({
          method: 'POST',
          url: '/api/auth/login',
          body: { email: user, password: secret },
          // Keeps the password out of the command log.
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

/**
 * The slow path, kept for exactly one spec. Everything else uses loginByApi.
 * Logging in through the UI in every test buys no extra coverage after the
 * first time and pays the full cost of the form on every single test.
 */
Cypress.Commands.add('loginByUi', (email: string, password: string) => {
  cy.visit('/login')
  cy.getByData('login-email').type(email)
  cy.getByData('login-password').type(password, { log: false })
  cy.getByData('login-submit').click()
  cy.getByData('todos-page').should('be.visible')
})
