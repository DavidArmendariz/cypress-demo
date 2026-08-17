import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { findUserById, type User } from './store'

/**
 * The token lives in an httpOnly cookie, not in localStorage. Two reasons:
 * a script injected into the page cannot read it, and Cypress caches cookies
 * natively, so `cy.session()` restores a login with no extra plumbing.
 */
export const AUTH_COOKIE = 'todo_demo_token'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-never-use-in-production'
const JWT_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 60 * 60)

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_TTL_SECONDS,
  })
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: JWT_TTL_SECONDS * 1000,
    // Would be `true` behind TLS in production.
    secure: false,
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' })
}

/** Guards every route that needs a signed-in user. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined

  if (!token) {
    res.status(401).json({ error: { message: 'Not authenticated', code: 'unauthenticated' } })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    const user = findUserById(payload.sub)

    if (!user) {
      clearAuthCookie(res)
      res.status(401).json({ error: { message: 'Session no longer valid', code: 'unauthenticated' } })
      return
    }

    req.user = user
    next()
  } catch {
    clearAuthCookie(res)
    res.status(401).json({ error: { message: 'Session expired', code: 'session_expired' } })
  }
}
