import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { LoginForm, type LoginFormValues } from '../components/LoginForm'
import { useAuth } from '../auth/useAuth'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const redirectTo = searchParams.get('redirect') ?? '/todos'

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(values: LoginFormValues) {
    setError(null)
    setFieldErrors({})

    try {
      await login(values)
      void navigate(redirectTo, { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message)
        setFieldErrors(caught.fields)
        return
      }
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <main className="page" data-cy="login-page">
      <LoginForm onSubmit={handleSubmit} error={error} fieldErrors={fieldErrors} />
      <p>
        No account? <Link to="/signup" data-cy="go-to-signup">Create one</Link>
      </p>
    </main>
  )
}
