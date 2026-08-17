import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import type { PublicUser, Todo } from '../shared/types'

/**
 * In-memory data store. A real app would use a database; the point of this file
 * is that the *test* seam is explicit and cheap, so specs never have to build
 * state through the UI.
 */

export interface User extends PublicUser {
  passwordHash: string
}

interface Store {
  users: User[]
  todos: Todo[]
}

/** Low cost factor is fine locally and in CI; production should use 12+. */
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10)

export const DEFAULT_USER = {
  email: 'demo@example.com',
  name: 'Demo User',
  /**
   * Kept in sync with `testUserPassword` in cypress.env.example.json.
   * In a real project both sides read this from a secret store.
   */
  password: process.env.SEED_USER_PASSWORD ?? 'Password123!',
}

const store: Store = { users: [], todos: [] }

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name }
}

export function createUser(input: { email: string; password: string; name: string }): User {
  const user: User = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash: hashPassword(input.password),
  }
  store.users.push(user)
  return user
}

export function findUserByEmail(email: string): User | undefined {
  return store.users.find((user) => user.email === email.toLowerCase())
}

export function findUserById(id: string): User | undefined {
  return store.users.find((user) => user.id === id)
}

export function listTodos(userId: string): Todo[] {
  return store.todos.filter((todo) => todo.userId === userId)
}

export function findTodo(userId: string, id: string): Todo | undefined {
  return store.todos.find((todo) => todo.id === id && todo.userId === userId)
}

export function createTodo(input: {
  userId: string
  title: string
  completed?: boolean
  createdAt?: string
}): Todo {
  const todo: Todo = {
    id: randomUUID(),
    userId: input.userId,
    title: input.title,
    completed: input.completed ?? false,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  store.todos.push(todo)
  return todo
}

export function updateTodo(todo: Todo, patch: Partial<Pick<Todo, 'title' | 'completed'>>): Todo {
  Object.assign(todo, patch)
  return todo
}

export function deleteTodo(todo: Todo): void {
  store.todos.splice(store.todos.indexOf(todo), 1)
}

/**
 * Wipes everything and re-creates the default user. Called by the test-only
 * route so each spec starts from a known, empty state.
 */
export function reset(): PublicUser {
  store.users = []
  store.todos = []
  return toPublicUser(
    createUser({
      email: DEFAULT_USER.email,
      password: DEFAULT_USER.password,
      name: DEFAULT_USER.name,
    }),
  )
}
