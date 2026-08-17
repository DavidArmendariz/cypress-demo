import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * The gate every test in this repo has to get past. Three distinct states,
 * each with its own data-cy hook, so specs assert on a state rather than
 * sleeping until the redirect happens to have finished.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <p className="status" data-cy="auth-loading" role="status">
        Checking your session…
      </p>
    )
  }

  if (status === 'anonymous') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}
