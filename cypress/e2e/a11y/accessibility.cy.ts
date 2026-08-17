/**
 * axe catches roughly a third of accessibility defects. It is a floor, not a
 * ceiling, which is why the keyboard test at the bottom exists: a page can be
 * axe-clean and still be unusable without a mouse.
 */
describe('Accessibility', () => {
  it('has no detectable violations on the login page', () => {
    cy.resetDb()
    cy.clearAllCookies()
    cy.visit('/login')
    cy.injectAxe()

    cy.checkA11y()
  })

  it('has no detectable violations on a login page showing errors', () => {
    cy.resetDb()
    cy.clearAllCookies()
    cy.visit('/login')
    cy.injectAxe()

    cy.getByData('login-submit').click()
    cy.getByData('login-email-error').should('be.visible')

    cy.checkA11y()
  })

  it('has no detectable violations on the todos page', () => {
    cy.resetDb()
    cy.loginByApi()
    cy.seed({
      todos: [
        { email: 'demo@example.com', title: 'An open item' },
        { email: 'demo@example.com', title: 'A finished item', completed: true },
      ],
    })
    cy.visit('/todos')
    cy.getByData('todo-item').should('have.length', 2)
    cy.injectAxe()

    cy.checkA11y()
  })

  it('can be driven end to end with the keyboard alone', () => {
    cy.resetDb()
    cy.loginByApi()
    cy.intercept('POST', '/api/todos').as('createTodo')
    cy.visit('/todos')
    cy.getByData('todos-empty').should('be.visible')

    // cy.focus() ends a chain, so each of these starts again from cy.
    cy.getByData('new-todo-input').focus()
    cy.focused().type('Added without a mouse{enter}')
    cy.wait('@createTodo')

    cy.getByData('todo-item').should('have.length', 1)

    // The checkbox is in the tab order and carries an accessible name from a
    // real <label for>, which is what a screen reader announces.
    cy.getByData('todo-toggle').focus()
    cy.focused().should('have.attr', 'data-cy', 'todo-toggle')
    cy.getByData('todo-toggle')
      .invoke('attr', 'id')
      .then((id) => {
        // A closure, because the id is generated and cannot be known upfront.
        cy.getByData('todo-title').should('have.attr', 'for', id)
      })

    // Known limit: cy.type(' ') dispatches synthetic key events, and the
    // browser's default "space activates a focused checkbox" behaviour does
    // not run for those. cy.check() is the right tool for the state change;
    // cypress-real-events (Chromium only) is the tool if you specifically
    // need native key events.
    cy.getByData('todo-toggle').check()
    cy.getByData('todo-item').should('have.attr', 'data-completed', 'true')

    // Delete buttons are labelled per row, not just "Delete".
    cy.getByData('todo-delete').should('have.attr', 'aria-label', 'Delete Added without a mouse')
  })
})
