/**
 * Environment Variables Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast if any required variable is missing.
 */

import { z } from 'zod'

const envSchema = z.object({
  // Required
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),

  // Optional with defaults
  PORT: z.string().optional().default('3333'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  GEMINI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),

  // Google Calendar OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().length(32).optional(),
})

export type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

/**
 * Validates environment variables and throws if invalid.
 * Should be called at application startup.
 */
export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n')

    throw new Error(`Environment validation failed:\n${errors}`)
  }

  validatedEnv = result.data

  // Warn about optional but recommended variables
  if (!validatedEnv.GEMINI_API_KEY) {
  }

  return validatedEnv
}

/**
 * Gets validated environment variables.
 * Throws if validateEnv() hasn't been called.
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first.')
  }
  return validatedEnv
}
