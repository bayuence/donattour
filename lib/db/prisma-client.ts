/**
 * Prisma Client Singleton (Prisma v7)
 *
 * Prisma v7 tidak lagi membaca `url` dari schema.prisma.
 * Koneksi harus di-inject melalui `adapter` (driver adapter)
 * atau `accelerateUrl` ke constructor PrismaClient.
 *
 * Di sini kita gunakan @prisma/adapter-pg + pg.Pool
 * agar terhubung ke PostgreSQL (Supabase) via DATABASE_URL.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { dbLogger } from '@/lib/utils/logger'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

let _prisma: PrismaClient | undefined = globalForPrisma.prisma

function createPrismaClient(): PrismaClient {
  if (_prisma) return _prisma

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      '[Prisma] DATABASE_URL is not set. Please add it to your .env.local file.'
    )
  }

  // PrismaPg menerima connection string atau pg.Pool config
  const adapter = new PrismaPg({ connectionString: databaseUrl })

  _prisma = new PrismaClient({
    adapter,
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  })

  // Log Prisma events
  ;(_prisma as any).$on('warn', (e: any) => {
    dbLogger.warn({ event: 'prisma_warn', message: e?.message, target: e?.target })
  })

  ;(_prisma as any).$on('error', (e: any) => {
    dbLogger.error({ event: 'prisma_error', message: e?.message, target: e?.target })
  })

  // Simpan di global untuk mencegah multiple instance di dev (HMR)
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _prisma
  }

  // Test koneksi secara async (tidak blocking)
  if (typeof window === 'undefined') {
    _prisma.$queryRaw`SELECT 1`.then(() => {
      dbLogger.info({ event: 'prisma_connected', message: 'Prisma client initialized' })
    }).catch((error) => {
      dbLogger.error({
        event: 'prisma_connection_failed',
        error: (error as any).message,
        hint: 'Periksa DATABASE_URL di .env.local',
      })
    })
  }

  return _prisma
}

// Export proxy yang membuat client secara lazy pada akses pertama
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = createPrismaClient()
    // @ts-ignore – delegate ke real client
    return (client as any)[prop]
  },
  apply(_target, thisArg, argArray) {
    const client = createPrismaClient()
    // @ts-ignore
    return (client as any).apply(thisArg, argArray)
  },
}) as unknown as PrismaClient

export default prisma
