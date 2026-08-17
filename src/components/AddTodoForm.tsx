import { useState } from 'react'
import type { FormEvent } from 'react'

export interface AddTodoFormProps {
  /** Resolves false when the todo could not be created, so the input keeps the text. */
  onAdd: (title: string) => Promise<boolean> | boolean
  disabled?: boolean
}

export function AddTodoForm({ onAdd, disabled = false }: AddTodoFormProps) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      // Only clear the field once the todo really exists. Losing what someone
      // typed because the network hiccuped is its own kind of bug.
      if (await onAdd(trimmed)) {
        setTitle('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="add-todo" data-cy="add-todo-form" onSubmit={handleSubmit}>
      <label htmlFor="new-todo">New todo</label>
      <input
        id="new-todo"
        data-cy="new-todo-input"
        placeholder="What needs doing?"
        value={title}
        disabled={disabled || submitting}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" data-cy="add-todo-submit" disabled={disabled || submitting || !title.trim()}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}
