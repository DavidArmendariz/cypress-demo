import { useState } from 'react'
import type { FormEvent } from 'react'

export interface SignupFormValues {
  name: string
  email: string
  password: string
}

export interface SignupFormProps {
  onSubmit: (values: SignupFormValues) => Promise<void> | void
  error?: string | null
  fieldErrors?: Record<string, string>
}

export function SignupForm({ onSubmit, error, fieldErrors = {} }: SignupFormProps) {
  const [values, setValues] = useState<SignupFormValues>({ name: '', email: '', password: '' })
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const errors = { ...clientErrors, ...fieldErrors }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!values.name.trim()) nextErrors.name = 'Name is required.'
    if (!values.email.trim()) nextErrors.email = 'Email is required.'
    if (values.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
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
    <form className="card" data-cy="signup-form" onSubmit={handleSubmit} noValidate>
      <h1>Create an account</h1>

      {error ? (
        <p className="alert" data-cy="signup-error" role="alert">
          {error}
        </p>
      ) : null}

      <label htmlFor="signup-name">Name</label>
      <input
        id="signup-name"
        name="name"
        data-cy="signup-name"
        aria-invalid={Boolean(errors.name)}
        value={values.name}
        onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
      />
      {errors.name ? (
        <p className="field-error" data-cy="signup-name-error">
          {errors.name}
        </p>
      ) : null}

      <label htmlFor="signup-email">Email</label>
      <input
        id="signup-email"
        name="email"
        type="email"
        autoComplete="username"
        data-cy="signup-email"
        aria-invalid={Boolean(errors.email)}
        value={values.email}
        onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
      />
      {errors.email ? (
        <p className="field-error" data-cy="signup-email-error">
          {errors.email}
        </p>
      ) : null}

      <label htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        name="password"
        type="password"
        autoComplete="new-password"
        data-cy="signup-password"
        aria-invalid={Boolean(errors.password)}
        value={values.password}
        onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
      />
      {errors.password ? (
        <p className="field-error" data-cy="signup-password-error">
          {errors.password}
        </p>
      ) : null}

      <button type="submit" data-cy="signup-submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
