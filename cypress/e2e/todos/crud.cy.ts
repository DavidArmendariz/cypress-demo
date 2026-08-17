import type { Todo } from '../../../shared/types'

describe('Managing todos', () => {
  beforeEach(() => {
    // Known state, every test, set up over the API. No test depends on what
    // the previous one left behind, so any test can be run on its own.
    cy.resetDb()
    cy.loginByApi()
    cy.intercept('GET', '/api/todos').as('getTodos')
    cy.visit('/todos')
    cy.wait('@getTodos')
  })

  it('starts empty and adds a todo', () => {
    cy.intercept('POST', '/api/todos').as('createTodo')

    cy.getByData('todos-empty').should('be.visible')

    cy.getByData('new-todo-input').type('Write the docs')
    cy.getByData('add-todo-submit').click()

    // Wait on the request, never on a duration.
    cy.wait('@createTodo').its('response.statusCode').should('eq', 201)

    cy.getByData('todo-item').should('have.length', 1)
    cy.getByData('todo-title').should('have.text', 'Write the docs')
    cy.getByData('new-todo-input').should('have.value', '')
    cy.getByData('todos-empty').should('not.exist')
  })

  it('refuses to submit an empty title', () => {
    cy.getByData('add-todo-submit').should('be.disabled')
    cy.getByData('new-todo-input').type('   ')
    cy.getByData('add-todo-submit').should('be.disabled')
  })

  it('toggles a todo and persists it across a reload', () => {
    cy.seed({ todos: [{ email: 'demo@example.com', title: 'Buy milk' }] })
    cy.intercept('PATCH', '/api/todos/*').as('updateTodo')
    cy.reload()

    cy.getByData('todo-toggle').should('not.be.checked').click()

    cy.wait('@updateTodo').its('request.body').should('deep.equal', { completed: true })
    cy.getByData('todo-item').should('have.attr', 'data-completed', 'true')
    cy.getByData('todo-title').should('have.class', 'done')

    // The real proof: it survives a round trip to the server.
    cy.reload()
    cy.getByData('todo-toggle').should('be.checked')
  })

  it('deletes a todo', () => {
    cy.seed({
      todos: [
        { email: 'demo@example.com', title: 'Keep me' },
        { email: 'demo@example.com', title: 'Delete me' },
      ],
    })
    cy.intercept('DELETE', '/api/todos/*').as('deleteTodo')
    cy.reload()

    cy.getByData('todo-item').should('have.length', 2)
    // Scope the action to the row that contains the text, so the assertion
    // does not depend on list ordering.
    cy.contains('[data-cy="todo-item"]', 'Delete me').find('[data-cy="todo-delete"]').click()

    cy.wait('@deleteTodo').its('response.statusCode').should('eq', 204)
    cy.getByData('todo-item').should('have.length', 1)
    cy.getByData('todo-title').should('have.text', 'Keep me')
  })

  it('shows a pending state on the row being saved', () => {
    cy.seed({ todos: [{ email: 'demo@example.com', title: 'Slow save' }] })
    cy.intercept('PATCH', '/api/todos/*', (req) => {
      req.on('response', (res) => {
        res.setDelay(500)
      })
    }).as('slowUpdate')
    cy.reload()

    cy.getByData('todo-toggle').click()

    cy.getByData('todo-pending').should('be.visible')
    cy.getByData('todo-delete').should('be.disabled')

    cy.wait('@slowUpdate')
    cy.getByData('todo-pending').should('not.exist')
    cy.getByData('todo-delete').should('be.enabled')
  })

  it('uses an alias instead of a variable to carry a value between commands', () => {
    cy.seed({ todos: [{ email: 'demo@example.com', title: 'Aliased' }] }).then((seeded) => {
      // Cypress commands are asynchronous. `const id = cy.get(...)` would hold
      // a chainable, not a value. Aliases and .then() closures are the way.
      cy.wrap(seeded.todos[0]).as('seededTodo')
    })
    cy.reload()

    cy.get<Todo>('@seededTodo').then((todo) => {
      cy.getByData('todo-item').should('have.attr', 'data-todo-id', todo.id)
      cy.getByData('todo-title').should('have.text', todo.title)
    })
  })
})
