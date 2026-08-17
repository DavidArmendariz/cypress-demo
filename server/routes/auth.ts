import { Router } from 'express'
import { z } from 'zod'
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from '../auth'
import { createUser, findUserByEmail, toPublicUser, verifyPassword } from '../store'
import { parseBody, sendError } from '../validation'

const credentials = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

const signupInput = credentials.extend({
  name: z.string().trim().min(1, 'Name is required.'),
})

export const authRouter = Router()

authRouter.post('/signup', (req, res) => {
  const input = parseBody(signupInput, req.body, res)
  if (!input) return

  if (findUserByEmail(input.email)) {
    sendError(res, 409, 'email_taken', 'That email is already registered.', {
      email: 'That email is already registered.',
    })
    return
  }

  const user = createUser(input)
  setAuthCookie(res, signToken(user))
  res.status(201).json({ user: toPublicUser(user) })
})

authRouter.post('/login', (req, res) => {
  const input = parseBody(credentials, req.body, res)
  if (!input) return

  const user = findUserByEmail(input.email)

  // Same response for "no such user" and "wrong password" so the endpoint
  // cannot be used to enumerate accounts.
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    sendError(res, 401, 'invalid_credentials', 'Email or password is incorrect.')
    return
  }

  setAuthCookie(res, signToken(user))
  res.json({ user: toPublicUser(user) })
})

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.status(204).end()
})

/** Cheap endpoint for `cy.session({ validate })` and for client-side bootstrap. */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user!) })
})
