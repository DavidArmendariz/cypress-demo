import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../auth'
import { createTodo, deleteTodo, findTodo, listTodos, updateTodo } from '../store'
import { parseBody, sendError } from '../validation'

const createInput = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120, 'Keep it under 120 characters.'),
})

const patchInput = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120).optional(),
  completed: z.boolean().optional(),
})

/**
 * Small artificial latency on writes. Without it, a mutation resolves so fast
 * that a sloppy spec passes by accident; with it, specs are forced to wait on
 * a real signal (an aliased intercept or a DOM assertion).
 */
const WRITE_DELAY_MS = Number(process.env.WRITE_DELAY_MS ?? 150)
const delay = () => new Promise((resolve) => setTimeout(resolve, WRITE_DELAY_MS))

export const todosRouter = Router()

todosRouter.use(requireAuth)

todosRouter.get('/', (req, res) => {
  res.json({ todos: listTodos(req.user!.id) })
})

todosRouter.post('/', async (req, res) => {
  const input = parseBody(createInput, req.body, res)
  if (!input) return

  await delay()
  res.status(201).json({ todo: createTodo({ userId: req.user!.id, title: input.title }) })
})

todosRouter.patch('/:id', async (req, res) => {
  const input = parseBody(patchInput, req.body, res)
  if (!input) return

  // Scoped to the caller: another user's id must read as "not found", never 403.
  const todo = findTodo(req.user!.id, req.params.id)
  if (!todo) {
    sendError(res, 404, 'todo_not_found', 'That todo no longer exists.')
    return
  }

  await delay()
  res.json({ todo: updateTodo(todo, input) })
})

todosRouter.delete('/:id', async (req, res) => {
  const todo = findTodo(req.user!.id, req.params.id)
  if (!todo) {
    sendError(res, 404, 'todo_not_found', 'That todo no longer exists.')
    return
  }

  await delay()
  deleteTodo(todo)
  res.status(204).end()
})
