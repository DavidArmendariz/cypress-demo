import type { ApiErrorBody, PublicUser, Todo } from '../../shared/types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.error?.message ?? 'Something went wrong. Please try again.')
    this.name = 'ApiError'
    this.status = status
    this.code = body.error?.code ?? 'unknown'
    this.fields = body.error?.fields ?? {}
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      // The auth cookie is httpOnly, so the browser must be told to send it.
      credentials: 'same-origin',
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    })
  } catch {
    // Network-level failure, which is what cy.intercept({ forceNetworkError })
    // simulates. It must surface as a normal error, not an unhandled rejection.
    throw new ApiError(0, { error: { message: 'Network error. Check your connection.', code: 'network_error' } })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(response.status, body as ApiErrorBody)
  }

  return body as T
}

export const api = {
  signup: (input: { email: string; password: string; name: string }) =>
    request<{ user: PublicUser }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(input) }),

  login: (input: { email: string; password: string }) =>
    request<{ user: PublicUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: PublicUser }>('/api/auth/me'),

  listTodos: () => request<{ todos: Todo[] }>('/api/todos'),

  createTodo: (title: string) =>
    request<{ todo: Todo }>('/api/todos', { method: 'POST', body: JSON.stringify({ title }) }),

  updateTodo: (id: string, patch: { title?: string; completed?: boolean }) =>
    request<{ todo: Todo }>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  deleteTodo: (id: string) => request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
}
