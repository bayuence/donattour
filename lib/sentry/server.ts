/**
 * Sentry initialization for server-side error tracking
 * Captures all unhandled exceptions and reports to Sentry dashboard
 */

import * as Sentry from '@sentry/nextjs'

export const initSentryServer = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 1.0,
    debug: false,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  })
}
