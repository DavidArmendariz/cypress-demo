import { useAuth } from '../auth/useAuth'

export function NavBar() {
  const { status, user, logout } = useAuth()

  if (status !== 'authenticated' || !user) {
    return null
  }

  return (
    <header className="nav" data-cy="nav">
      <span data-cy="nav-user">{user.name}</span>
      <button type="button" data-cy="logout" onClick={() => void logout()}>
        Sign out
      </button>
    </header>
  )
}
