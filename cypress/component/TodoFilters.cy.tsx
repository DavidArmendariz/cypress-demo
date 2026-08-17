import { useState } from 'react'
import { TodoFilters } from '../../src/components/TodoFilters'
import type { TodoFilter } from '../../shared/types'

const counts = { all: 5, active: 3, completed: 2 }

describe('<TodoFilters />', () => {
  it('shows a count next to every filter', () => {
    cy.mount(<TodoFilters value="all" counts={counts} onChange={cy.stub()} />)

    cy.getByData('filter-all').should('have.text', 'All (5)')
    cy.getByData('filter-active').should('have.text', 'Active (3)')
    cy.getByData('filter-completed').should('have.text', 'Completed (2)')
  })

  it('exposes the current filter through aria-pressed', () => {
    cy.mount(<TodoFilters value="active" counts={counts} onChange={cy.stub()} />)

    cy.getByData('filter-active').should('have.attr', 'aria-pressed', 'true')
    cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'false')
    cy.getByData('filter-completed').should('have.attr', 'aria-pressed', 'false')
    cy.getByData('todo-filters').should('have.attr', 'aria-label', 'Filter todos')
  })

  it('reports the clicked filter to its parent', () => {
    cy.mount(<TodoFilters value="all" counts={counts} onChange={cy.stub().as('onChange')} />)

    cy.getByData('filter-completed').click()

    cy.get('@onChange').should('have.been.calledOnceWith', 'completed')
  })

  it('is a controlled component: it does not change on its own', () => {
    cy.mount(<TodoFilters value="all" counts={counts} onChange={cy.stub()} />)

    cy.getByData('filter-completed').click()

    // The parent never updated `value`, so the UI must not move.
    cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'true')
    cy.getByData('filter-completed').should('have.attr', 'aria-pressed', 'false')
  })

  it('follows the parent when the parent does update', () => {
    // A tiny harness is the right way to test a controlled component's
    // integration, rather than reaching into component internals.
    function Harness() {
      const [value, setValue] = useState<TodoFilter>('all')
      return <TodoFilters value={value} counts={counts} onChange={setValue} />
    }

    cy.mount(<Harness />)

    cy.getByData('filter-completed').click()
    cy.getByData('filter-completed').should('have.attr', 'aria-pressed', 'true')
    cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'false')
  })
})
