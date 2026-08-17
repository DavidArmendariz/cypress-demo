import { useState } from 'react'
import type { FormEvent } from 'react'

export interface LoginFormValues {
  email: string
  password: string
}

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void> | void
  /** Form-level error, e.g. "Email or password is incorrect." */
  error?: string | null
  /** Server-side per-field errors, merged over client-side ones. */
  fieldErrors?: Record<string, string>
}

/**
 * A presentational form: props in, one event out. That shape is what makes it
 * worth a component test, and it is why the E2E suite does not need to cover
 * every validation permutation through the browser.
 */
export function LoginForm({ onSubmit, error, fieldErrors = {} }: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' })
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const errors = { ...clientErrors, ...fieldErrors }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    if (!values.password) nextErrors.password = 'Password is required.'
    setClientErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card" data-cy="login-form" onSubmit={handleSubmit} noValidate>
      <h1>Sign in</h1>

      {error ? (
        <p className="alert" data-cy="login-error" role="alert">
          {error}
        </p>
      ) : null}

      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        data-cy="login-email"
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? 'login-email-error' : undefined}
        value={values.email}
        onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
      />
      {errors.email ? (
        <p className="field-error" id="login-email-error" data-cy="login-email-error">
          {errors.email}
        </p>
      ) : null}

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        data-cy="login-password"
        aria-invalid={Boolean(errors.password)}
        aria-describedby={errors.password ? 'login-password-error' : undefined}
        value={values.password}
        onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
      />
      {errors.password ? (
        <p className="field-error" id="login-password-error" data-cy="login-password-error">
          {errors.password}
        </p>
      ) : null}

      <button type="submit" data-cy="login-submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
