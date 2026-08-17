import type { TodoFilter } from '../../../shared/types'

interface TodoFixture {
  title: string
  completed: boolean
}

describe('Filtering todos', () => {
  beforeEach(() => {
    cy.resetDb()
    cy.loginByApi()

    // Fixture files keep the data out of the spec, so the spec reads as
    // behaviour rather than as a pile of literals.
    cy.fixture<TodoFixture[]>('todos').then((todos) => {
      cy.seed({
        todos: todos.map((todo) => ({
          email: 'demo@example.com',
          title: todo.title,
          completed: todo.completed,
        })),
      })
      cy.wrap(todos).as('todos')
    })

    cy.visit('/todos')
  })

  it('counts each bucket', () => {
    cy.get<TodoFixture[]>('@todos').then((todos) => {
      const active = todos.filter((todo) => !todo.completed).length
      const completed = todos.length - active

      cy.getByData('filter-all').should('have.text', `All (${todos.length})`)
      cy.getByData('filter-active').should('have.text', `Active (${active})`)
      cy.getByData('filter-completed').should('have.text', `Completed (${completed})`)
    })
  })

  it('narrows the list and marks the active filter for screen readers', () => {
    cy.get<TodoFixture[]>('@todos').then((todos) => {
      const active = todos.filter((todo) => !todo.completed)

      cy.getByData('filter-active').click()
      cy.getByData('filter-active').should('have.attr', 'aria-pressed', 'true')
      cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'false')
      cy.getByData('todo-item').should('have.length', active.length)
      cy.getByData('todo-item').each(($item) => {
        cy.wrap($item).should('have.attr', 'data-completed', 'false')
      })
    })
  })

  it('remembers the chosen filter across a reload', () => {
    cy.getByData('filter-completed').click()
    cy.getByData('filter-completed').should('have.attr', 'aria-pressed', 'true')

    cy.reload()

    cy.getByData('filter-completed').should('have.attr', 'aria-pressed', 'true')
    cy.getByData('todo-item').each(($item) => {
      cy.wrap($item).should('have.attr', 'data-completed', 'true')
    })
  })

  it('shows the empty state when a filter matches nothing', () => {
    cy.resetDb()
    cy.seed({ todos: [{ email: 'demo@example.com', title: 'Only active thing' }] })
    cy.loginByApi()
    cy.visit('/todos')

    const filter: TodoFilter = 'completed'
    cy.getByData(`filter-${filter}`).click()

    cy.getByData('todos-empty').should('be.visible')
    cy.getByData('todo-item').should('not.exist')
  })
})
