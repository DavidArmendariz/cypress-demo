/**
 * Everything here is a stub. Failure states are the one place where stubbing
 * beats hitting the real API: you cannot ask a healthy server for a 500, and
 * you certainly cannot ask it for a dropped connection.
 *
 * The rule of thumb used in this repo: real requests for the happy path
 * (they are the only thing that proves the app and the API agree), stubbed
 * requests for failures and for states that are otherwise unreachable.
 */
describe('When the network misbehaves', () => {
  beforeEach(() => {
    cy.resetDb()
    cy.loginByApi()
  })

  it('shows a retryable error when the list fails to load', () => {
    cy.intercept('GET', '/api/todos', {
      statusCode: 500,
      body: { error: { message: 'Server error. Please try again.', code: 'server_error' } },
    }).as('failedLoad')

    cy.visit('/todos')
    cy.wait('@failedLoad')

    cy.getByData('todos-error').should('contain.text', 'Server error. Please try again.')
    cy.getByData('todos-loading').should('not.exist')

    // Let the retry succeed, and prove the error clears rather than lingering.
    cy.intercept('GET', '/api/todos', { statusCode: 200, body: { todos: [] } }).as('retriedLoad')
    cy.getByData('todos-retry').click()

    cy.wait('@retriedLoad')
    cy.getByData('todos-error').should('not.exist')
    cy.getByData('todos-empty').should('be.visible')
  })

  it('survives a dropped connection', () => {
    cy.intercept('GET', '/api/todos', { forceNetworkError: true }).as('droppedLoad')

    cy.visit('/todos')
    cy.wait('@droppedLoad')

    cy.getByData('todos-error').should('contain.text', 'Network error. Check your connection.')
  })

  it('renders the loading state while the list is slow', () => {
    cy.intercept('GET', '/api/todos', (req) => {
      req.reply({ statusCode: 200, body: { todos: [] }, delay: 600 })
    }).as('slowLoad')

    cy.visit('/todos')

    // Assert the state exists, then wait for the request. Never cy.wait(600).
    cy.getByData('todos-loading').should('be.visible')
    cy.getByData('new-todo-input').should('be.disabled')

    cy.wait('@slowLoad')
    cy.getByData('todos-loading').should('not.exist')
    cy.getByData('new-todo-input').should('be.enabled')
  })

  it('keeps the typed title when creating a todo fails', () => {
    cy.intercept('GET', '/api/todos', { statusCode: 200, body: { todos: [] } })
    cy.intercept('POST', '/api/todos', {
      statusCode: 500,
      body: { error: { message: 'Server error. Please try again.', code: 'server_error' } },
    }).as('failedCreate')

    cy.visit('/todos')
    cy.getByData('new-todo-input').type('Do not lose me')
    cy.getByData('add-todo-submit').click()

    cy.wait('@failedCreate')
    cy.getByData('todos-error').should('be.visible')
    cy.getByData('new-todo-input').should('have.value', 'Do not lose me')
    cy.getByData('todo-item').should('not.exist')
  })

  it('lets a stub stand in for a data shape the API cannot easily produce', () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      id: `stub-${index}`,
      userId: 'stub-user',
      title: `Generated todo ${index + 1}`,
      completed: index % 3 === 0,
      createdAt: new Date(2026, 0, 1, 0, index).toISOString(),
    }))

    cy.intercept('GET', '/api/todos', { statusCode: 200, body: { todos: many } }).as('bigList')

    cy.visit('/todos')
    cy.wait('@bigList')

    cy.getByData('todo-item').should('have.length', 50)
    cy.getByData('filter-completed').should('have.text', 'Completed (17)')
  })
})
