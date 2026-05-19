/**
 * Prisma Client Singleton
 *
 * Ensures only one Prisma Client instance in development
 * Prevents multiple PrismaClient instances which can cause issues
 */

import { PrismaClient } from '@prisma/client'
import { dbLogger } from '@/lib/utils/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  })

// Log Prisma events
prisma.$on('warn', (e) => {
  dbLogger.warn({
    event: 'prisma_warn',
    message: e.message,
    target: e.target,
  })
})

prisma.$on('error', (e) => {
  dbLogger.error({
    event: 'prisma_error',
    message: e.message,
    target: e.target,
  })
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Test connection on module load
if (typeof window === 'undefined') {
  prisma.$queryRaw`SELECT 1`.then(() => {
    dbLogger.info({ event: 'prisma_connected', message: 'Prisma client initialized' })
  }).catch((error) => {
    dbLogger.error({
      event: 'prisma_connection_failed',
      error: error.message,
      hint: 'Check DATABASE_URL in .env.local',
    })
  })
}

export default prisma
