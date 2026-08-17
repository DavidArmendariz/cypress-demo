import './commands'
import 'cypress-axe'

/**
 * One reset per spec file, before anything else runs. Individual tests that
 * need a different starting point call cy.resetDb()/cy.seed() themselves.
 *
 * This is a `before`, not an `after`. Cleanup in teardown never runs when a
 * test crashes or when you stop the runner mid-test, and it also throws away
 * the state you would want to inspect while debugging a failure.
 */
before(() => {
  cy.task('db:reset')
})

/**
 * The app is expected to handle its own errors. If an uncaught exception
 * reaches here, the test should fail, so there is deliberately no
 * `Cypress.on('uncaught:exception', () => false)` in this file. Swallowing
 * app errors globally is the fastest way to make a suite green and useless.
 */
