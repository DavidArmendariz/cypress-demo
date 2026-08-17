import type { Todo } from '../../shared/types'

export interface TodoItemProps {
  todo: Todo
  /** True while a mutation for this row is in flight. */
  pending?: boolean
  onToggle: (todo: Todo) => void
  onDelete: (todo: Todo) => void
}

export function TodoItem({ todo, pending = false, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="todo" data-cy="todo-item" data-todo-id={todo.id} data-completed={todo.completed}>
      <input
        type="checkbox"
        id={`todo-${todo.id}`}
        data-cy="todo-toggle"
        checked={todo.completed}
        disabled={pending}
        onChange={() => onToggle(todo)}
      />
      <label htmlFor={`todo-${todo.id}`} data-cy="todo-title" className={todo.completed ? 'done' : undefined}>
        {todo.title}
      </label>
      {pending ? (
        <span className="pending" data-cy="todo-pending" role="status">
          Saving…
        </span>
      ) : null}
      <button
        type="button"
        data-cy="todo-delete"
        aria-label={`Delete ${todo.title}`}
        disabled={pending}
        onClick={() => onDelete(todo)}
      >
        Delete
      </button>
    </li>
  )
}
