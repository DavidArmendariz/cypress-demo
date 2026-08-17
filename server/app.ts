import express from 'express'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'
import { todosRouter } from './routes/todos'
import { createTestRouter } from './routes/test'
import { reset } from './store'

export interface AppOptions {
  /** Mounts /api/test/*. Must never be true in production. */
  enableTestRoutes?: boolean
}

export function createApp(options: AppOptions = {}) {
  const app = express()

  app.use(express.json())
  app.use(cookieParser())

  // Used by start-server-and-test to know the API is up.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/todos', todosRouter)

  if (options.enableTestRoutes) {
    app.use('/api/test', createTestRouter())
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { message: 'Not found', code: 'not_found' } })
  })

  reset()

  return app
}
