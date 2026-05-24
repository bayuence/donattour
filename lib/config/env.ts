/**
 * Environment Configuration & Validation
 *
 * Validate all required env vars on app startup
 * Fail fast if config is missing or invalid
 */

import { z } from 'zod'
import { apiLogger } from '@/lib/utils/logger'

const EnvSchema = z.object({
  // ========================================================================
  // SUPABASE
  // ========================================================================
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key required'),

  // ========================================================================
  // SENTRY (Optional)
  // ========================================================================
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ========================================================================
  // MIDTRANS PAYMENT GATEWAY
  // ========================================================================
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1, 'Midtrans client key required'),
  MIDTRANS_SERVER_KEY: z.string().min(1, 'Midtrans server key required'),

  // ========================================================================
  // GOOGLE SHEETS INTEGRATION
  // ========================================================================
  GOOGLE_SHEETS_ACCESS_TOKEN: z.string().min(1, 'Google Sheets access token required'),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1, 'Google Sheets spreadsheet ID required'),

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================
  HEALTH_CHECK_SECRET: z.string().min(1, 'Health check secret required'),

  // ========================================================================
  // LOGGING
  // ========================================================================
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // ========================================================================
  // ENVIRONMENT
  // ========================================================================
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

export type Environment = z.infer<typeof EnvSchema>

let cachedEnv: Environment | null = null

/**
 * Get validated environment variables
 * Throws on validation failure
 */
export function getEnv(): Environment {
  if (cachedEnv) return cachedEnv

  const parsed = EnvSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors

    console.error('❌ ENVIRONMENT VALIDATION FAILED')
    console.error('================================')
    console.error('Missing or invalid environment variables:\n')

    Object.entries(errors).forEach(([key, messages]) => {
      console.error(`  ${key}:`)
      messages?.forEach((msg) => console.error(`    - ${msg}`))
    })

    console.error('\n================================')
    console.error('Please check your .env.local file')
    console.error('Template: .env.example\n')

    // Also log via logger if available
    apiLogger.error({
      event: 'env_validation_failed',
      errors: errors,
    })

    throw new Error('Environment validation failed')
  }

  cachedEnv = parsed.data

  apiLogger.info({
    event: 'env_loaded_successfully',
    nodeEnv: cachedEnv.NODE_ENV,
    hasSentry: !!cachedEnv.NEXT_PUBLIC_SENTRY_DSN,
  })

  return cachedEnv
}

/**
 * Validate environment on module load (server-side only)
 */
if (typeof window === 'undefined') {
  try {
    getEnv()
  } catch (error) {
    // Logger not available yet, just console
    console.error('Failed to validate environment on startup')
    process.exit(1)
  }
}

export default getEnv
