import type { Response } from 'express'
import type { ZodType } from 'zod'
import type { ApiErrorBody } from '../shared/types'

/**
 * Turns a Zod failure into the same error shape every endpoint uses, so specs
 * can assert on `body.error.code` and `body.error.fields` instead of scraping
 * strings out of the UI.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | undefined {
  const result = schema.safeParse(body)

  if (result.success) {
    return result.data
  }

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !(field in fields)) {
      fields[field] = issue.message
    }
  }

  const payload: ApiErrorBody = {
    error: { message: 'Please fix the highlighted fields.', code: 'validation_failed', fields },
  }
  res.status(400).json(payload)
  return undefined
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): void {
  const payload: ApiErrorBody = { error: { message, code, fields } }
  res.status(status).json(payload)
}
