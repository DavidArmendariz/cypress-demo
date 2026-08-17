/** Types shared by the Express API, the React client and the Cypress specs. */

export interface PublicUser {
  id: string
  email: string
  name: string
}

export interface Todo {
  id: string
  userId: string
  title: string
  completed: boolean
  createdAt: string
}

export interface ApiErrorBody {
  error: {
    /** Human readable, safe to render. */
    message: string
    /** Machine readable, safe to assert on in tests. */
    code: string
    /** Per-field validation messages, keyed by form field name. */
    fields?: Record<string, string>
  }
}

export type TodoFilter = 'all' | 'active' | 'completed'
