/**
 * A failed Supabase Edge Function call.
 *
 * Carries the HTTP status and the optional field-level errors the function
 * returned, so a form can highlight the offending inputs instead of showing a
 * single generic message.
 *
 * Kept in its own module so it stays free of any dependency on the Supabase
 * client and can be imported by tests.
 */
export class FunctionError extends Error {
  readonly status: number
  readonly fields?: Record<string, string>

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message)
    this.name = 'FunctionError'
    this.status = status
    this.fields = fields
  }
}
