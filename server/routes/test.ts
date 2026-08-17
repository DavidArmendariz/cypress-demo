import { Router } from 'express'
import { z } from 'zod'
import { createTodo, createUser, findUserByEmail, reset, toPublicUser } from '../store'
import { parseBody, sendError } from '../validation'

const seedInput = z.object({
  users: z
    .array(
      z.object({
        email: z.email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }),
    )
    .optional(),
  todos: z
    .array(
      z.object({
        /** Which seeded (or default) user owns the todo. */
        email: z.email(),
        title: z.string().min(1),
        completed: z.boolean().optional(),
        createdAt: z.iso.datetime().optional(),
      }),
    )
    .optional(),
})

/**
 * Test-only routes. `createTestRouter` is mounted by app.ts only when
 * ENABLE_TEST_ROUTES=1, so a production build physically cannot expose a
 * "wipe the database" endpoint even if someone guesses the path.
 */
export function createTestRouter(): Router {
  const router = Router()

  router.post('/reset', (_req, res) => {
    res.json({ user: reset() })
  })

  router.post('/seed', (req, res) => {
    const input = parseBody(seedInput, req.body, res)
    if (!input) return

    for (const user of input.users ?? []) {
      if (!findUserByEmail(user.email)) {
        createUser(user)
      }
    }

    const todos = []
    for (const todo of input.todos ?? []) {
      const owner = findUserByEmail(todo.email)
      if (!owner) {
        sendError(res, 400, 'unknown_seed_user', `No seeded user with email ${todo.email}.`)
        return
      }
      todos.push(
        createTodo({
          userId: owner.id,
          title: todo.title,
          completed: todo.completed,
          createdAt: todo.createdAt,
        }),
      )
    }

    res.status(201).json({
      users: (input.users ?? [])
        .map((user) => findUserByEmail(user.email))
        .filter((user) => user !== undefined)
        .map(toPublicUser),
      todos,
    })
  })

  return router
}
