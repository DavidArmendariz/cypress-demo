import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { SignupForm, type SignupFormValues } from '../components/SignupForm'
import { useAuth } from '../auth/useAuth'

export function SignupPage() {
  const { status, signup } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (status === 'authenticated') {
    return <Navigate to="/todos" replace />
  }

  async function handleSubmit(values: SignupFormValues) {
    setError(null)
    setFieldErrors({})

    try {
      await signup(values)
      void navigate('/todos', { replace: true })
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
    <main className="page" data-cy="signup-page">
      <SignupForm onSubmit={handleSubmit} error={error} fieldErrors={fieldErrors} />
      <p>
        Already registered? <Link to="/login" data-cy="go-to-login">Sign in</Link>
      </p>
    </main>
  )
}
