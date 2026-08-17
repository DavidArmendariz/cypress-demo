import { createContext } from 'react'
import type { PublicUser } from '../../shared/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: PublicUser | null
  login: (input: { email: string; password: string }) => Promise<void>
  signup: (input: { email: string; password: string; name: string }) => Promise<void>
  logout: () => Promise<void>
  /** Called when any request comes back 401 so the UI drops to signed-out. */
  handleSessionExpired: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
