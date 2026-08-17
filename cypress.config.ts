import { defineConfig } from 'cypress'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export default defineConfig({
  // Every cy.visit()/cy.request() path is relative to this. Changing
  // environment is one flag (CYPRESS_BASE_URL=...), not a find-and-replace.
  e2e: {
    baseUrl: 'http://localhost:5180',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on) {
      on('task', {
        /**
         * Node-side reset. The specs normally call cy.resetDb(), which uses
         * cy.request() and shows up in the command log. This task exists to
         * show the escape hatch for work the browser cannot do, and is used
         * by the global `before` hook in cypress/support/e2e.ts.
         */
        async 'db:reset'() {
          const response = await fetch(`${API_URL}/api/test/reset`, { method: 'POST' })
          if (!response.ok) {
            throw new Error(
              `Could not reset the API (${response.status}). Is it running with ENABLE_TEST_ROUTES=1?`,
            )
          }
          return null
        },
      })
    },
  },

  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },

  // Retry in CI only. Retrying locally hides flake from the person who just
  // wrote it; not retrying in CI turns one flaky test into a red build.
  retries: { runMode: 2, openMode: 0 },

  video: false,
  screenshotOnRunFailure: true,
  viewportWidth: 1280,
  viewportHeight: 800,

  // Left near the default on purpose. Raising the global timeout is the
  // usual "fix" for flake and it only makes failures slower to diagnose.
  defaultCommandTimeout: 5000,

  // Non-sensitive config, read synchronously with Cypress.expose('apiUrl').
  expose: { apiUrl: API_URL },

  // Secrets live in cypress.env.json (gitignored) or CYPRESS_* env vars and
  // are read with cy.env([...]). Cypress.env() is deprecated as of 15.10 and
  // this flag makes accidental use a hard error instead of a silent leak.
  allowCypressEnv: false,
})
