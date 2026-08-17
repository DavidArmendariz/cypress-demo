import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../api/client'
import { AddTodoForm } from '../components/AddTodoForm'
import { TodoFilters } from '../components/TodoFilters'
import { TodoItem } from '../components/TodoItem'
import { useAuth } from '../auth/useAuth'
import type { Todo, TodoFilter } from '../../shared/types'

/** Non-sensitive UI preference. Cached and restored by cy.session alongside cookies. */
const FILTER_KEY = 'todo-demo.filter'

function readStoredFilter(): TodoFilter {
  const stored = window.localStorage.getItem(FILTER_KEY)
  return stored === 'active' || stored === 'completed' ? stored : 'all'
}

export function TodosPage() {
  const { handleSessionExpired } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [filter, setFilter] = useState<TodoFilter>(readStoredFilter)

  const onApiError = useCallback(
    (caught: unknown) => {
      if (caught instanceof ApiError) {
        if (caught.status === 401) {
          handleSessionExpired()
          return
        }
        setError(caught.message)
        return
      }
      setError('Something went wrong. Please try again.')
    },
    [handleSessionExpired],
  )

  const fetchTodos = useCallback(async () => {
    try {
      const { todos: loaded } = await api.listTodos()
      setTodos(loaded)
      setError(null)
    } catch (caught) {
      onApiError(caught)
    } finally {
      setLoading(false)
    }
  }, [onApiError])

  // Fetch on mount. A real app would use a data library (TanStack Query, a
  // router loader) and would not need the exemption below; a plain fetch in an
  // effect keeps this demo focused on the tests rather than on data plumbing.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTodos()
  }, [fetchTodos])

  function handleRetry() {
    setLoading(true)
    setError(null)
    void fetchTodos()
  }

  useEffect(() => {
    window.localStorage.setItem(FILTER_KEY, filter)
  }, [filter])

  async function withPending(id: string, work: () => Promise<void>) {
    setPendingIds((prev) => [...prev, id])
    try {
      await work()
    } catch (caught) {
      onApiError(caught)
    } finally {
      setPendingIds((prev) => prev.filter((pendingId) => pendingId !== id))
    }
  }

  async function handleAdd(title: string): Promise<boolean> {
    setError(null)
    try {
      const { todo } = await api.createTodo(title)
      setTodos((prev) => [...prev, todo])
      return true
    } catch (caught) {
      onApiError(caught)
      return false
    }
  }

  function handleToggle(todo: Todo) {
    void withPending(todo.id, async () => {
      const { todo: updated } = await api.updateTodo(todo.id, { completed: !todo.completed })
      setTodos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    })
  }

  function handleDelete(todo: Todo) {
    void withPending(todo.id, async () => {
      await api.deleteTodo(todo.id)
      setTodos((prev) => prev.filter((item) => item.id !== todo.id))
    })
  }

  const counts = useMemo(
    () => ({
      all: todos.length,
      active: todos.filter((todo) => !todo.completed).length,
      completed: todos.filter((todo) => todo.completed).length,
    }),
    [todos],
  )

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter((todo) => !todo.completed)
    if (filter === 'completed') return todos.filter((todo) => todo.completed)
    return todos
  }, [todos, filter])

  return (
    <main className="page" data-cy="todos-page">
      <h1>Your todos</h1>

      <AddTodoForm onAdd={handleAdd} disabled={loading} />
      <TodoFilters value={filter} counts={counts} onChange={setFilter} />

      {error ? (
        <div className="alert" data-cy="todos-error" role="alert">
          <p>{error}</p>
          <button type="button" data-cy="todos-retry" onClick={handleRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status" data-cy="todos-loading" role="status">
          Loading your todos…
        </p>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <p className="status" data-cy="todos-empty">
          Nothing here yet.
        </p>
      ) : null}

      <ul className="todo-list" data-cy="todo-list">
        {visible.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            pending={pendingIds.includes(todo.id)}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </main>
  )
}
