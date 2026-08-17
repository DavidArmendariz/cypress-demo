import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import cypress from 'eslint-plugin-cypress'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'cypress/screenshots/**',
      'cypress/videos/**',
      'docs/.vitepress/dist/**',
      'docs/.vitepress/cache/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    files: [
      'server/**/*.ts',
      'vite.config.ts',
      'cypress.config.ts',
      'eslint.config.js',
      'docs/.vitepress/config.ts',
    ],
    languageOptions: { globals: globals.node },
  },

  /**
   * The linter enforces what the docs preach. Every rule below maps to an
   * anti-pattern described in docs/10-anti-patterns.md, so a bad habit fails
   * in review instead of quietly spreading through the suite.
   */
  {
    files: ['cypress/**/*.{ts,tsx}'],
    ...cypress.configs.recommended,
    rules: {
      ...cypress.configs.recommended.rules,
      // cy.wait(2000) is never the answer.
      'cypress/no-unnecessary-waiting': 'error',
      // const el = cy.get(...) does not do what it looks like it does.
      'cypress/no-assigning-return-values': 'error',
      // Commands that end a chain cannot be chained off.
      'cypress/unsafe-to-chain-command': 'error',
      // async/await in a test body races the Cypress command queue.
      'cypress/no-async-tests': 'error',
      'cypress/assertion-before-screenshot': 'warn',
      // Deprecated in Cypress 15.10; use cy.env() or Cypress.expose().
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Cypress'][callee.property.name='env']",
          message: 'Cypress.env() is deprecated. Use cy.env([...]) for secrets or Cypress.expose() for public config.',
        },
      ],
    },
  },
)
