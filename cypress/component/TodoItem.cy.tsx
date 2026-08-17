import { TodoItem } from '../../src/components/TodoItem'
import type { Todo } from '../../shared/types'

const todo: Todo = {
  id: 'todo-1',
  userId: 'user-1',
  title: 'Buy milk',
  completed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('<TodoItem />', () => {
  it('renders an open todo', () => {
    cy.mount(<TodoItem todo={todo} onToggle={cy.stub()} onDelete={cy.stub()} />)

    cy.getByData('todo-title').should('have.text', 'Buy milk').and('not.have.class', 'done')
    cy.getByData('todo-toggle').should('not.be.checked').and('be.enabled')
    cy.getByData('todo-pending').should('not.exist')
  })

  it('renders a completed todo with a struck-through label', () => {
    cy.mount(<TodoItem todo={{ ...todo, completed: true }} onToggle={cy.stub()} onDelete={cy.stub()} />)

    cy.getByData('todo-toggle').should('be.checked')
    cy.getByData('todo-title').should('have.class', 'done')
    cy.getByData('todo-item').should('have.attr', 'data-completed', 'true')
  })

  it('emits the whole todo on toggle and on delete', () => {
    cy.mount(<TodoItem todo={todo} onToggle={cy.stub().as('onToggle')} onDelete={cy.stub().as('onDelete')} />)

    cy.getByData('todo-toggle').click()
    cy.get('@onToggle').should('have.been.calledOnceWith', todo)

    cy.getByData('todo-delete').click()
    cy.get('@onDelete').should('have.been.calledOnceWith', todo)
  })

  it('locks the row while a mutation is pending', () => {
    cy.mount(<TodoItem todo={todo} pending onToggle={cy.stub().as('onToggle')} onDelete={cy.stub()} />)

    cy.getByData('todo-pending').should('have.text', 'Saving…').and('have.attr', 'role', 'status')
    cy.getByData('todo-toggle').should('be.disabled')
    cy.getByData('todo-delete').should('be.disabled')

    // force: true gets past the disabled attribute, which is the point: a
    // disabled control must not fire its handler even if something clicks it.
    cy.getByData('todo-delete').click({ force: true })
    cy.get('@onToggle').should('not.have.been.called')
  })

  it('labels the delete button per row', () => {
    cy.mount(<TodoItem todo={todo} onToggle={cy.stub()} onDelete={cy.stub()} />)

    cy.getByData('todo-delete').should('have.attr', 'aria-label', 'Delete Buy milk')
    cy.getByData('todo-title').should('have.attr', 'for', 'todo-todo-1')
  })
})
