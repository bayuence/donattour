/**
 * Enhanced Production Logger with Pino
 *
 * Combines Pino for structured logging (JSON in prod)
 * with colored console output in dev mode.
 * Backward compatible with existing logger API.
 */

import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Create Pino logger instance
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'warn'),
  transport: isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
})

// Backward compatible logger class
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private prefix: string

  constructor(prefix: string = '') {
    this.prefix = prefix
  }

  private shouldLog(level: LogLevel): boolean {
    if (isProduction) {
      return level === 'warn' || level === 'error'
    }
    return true
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      pinoLogger.debug({ prefix: this.prefix }, ...args)
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      pinoLogger.info({ prefix: this.prefix }, ...args)
    }
  }

  success(...args: any[]) {
    if (this.shouldLog('info')) {
      pinoLogger.info({ prefix: this.prefix, event: 'success' }, ...args)
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      pinoLogger.warn({ prefix: this.prefix }, ...args)
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      pinoLogger.error({ prefix: this.prefix }, ...args)
    }
  }

  realtime(message: string, data?: any) {
    if (isDevelopment) {
      pinoLogger.debug({ module: 'realtime' }, message, data || '')
    }
  }

  sync(message: string, data?: any) {
    if (isDevelopment) {
      pinoLogger.debug({ module: 'sync' }, message, data || '')
    }
  }

  pwa(message: string, data?: any) {
    if (isDevelopment) {
      pinoLogger.debug({ module: 'pwa' }, message, data || '')
    }
  }
}

// Export Pino logger for structured logging
export const apiLogger = pinoLogger.child({ module: 'api' })
export const dbLogger = pinoLogger.child({ module: 'db' })
export const syncLogger = pinoLogger.child({ module: 'sync' })
export const pwaLogger = pinoLogger.child({ module: 'pwa' })

// Backward compatible exports
export const logger = new Logger()
export const realtimeLogger = {
  log: (msg: string, data?: any) => isDevelopment && apiLogger.debug({ msg }, data || ''),
  success: (msg: string) => isDevelopment && apiLogger.info({ msg, event: 'success' }),
  error: (msg: string, err?: any) => apiLogger.error({ msg, error: err }),
}

export default Logger
