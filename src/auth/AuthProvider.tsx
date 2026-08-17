import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError } from '../api/client'
import type { PublicUser } from '../../shared/types'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<PublicUser | null>(null)

  // On boot we ask the server who we are. The token is an httpOnly cookie, so
  // this is the only way the client can find out, and it is also what makes
  // cy.session() work: restore the cookie and the app boots signed in.
  useEffect(() => {
    let cancelled = false

    api
      .me()
      .then(({ user: me }) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('Failed to restore session', error)
        }
        setUser(null)
        setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input: { email: string; password: string }) => {
    const { user: me } = await api.login(input)
    setUser(me)
    setStatus('authenticated')
  }, [])

  const signup = useCallback(async (input: { email: string; password: string; name: string }) => {
    const { user: me } = await api.signup(input)
    setUser(me)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const handleSessionExpired = useCallback(() => {
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({ status, user, login, signup, logout, handleSessionExpired }),
    [status, user, login, signup, logout, handleSessionExpired],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
