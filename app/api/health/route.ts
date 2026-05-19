/**
 * Health Check Endpoint
 *
 * Monitors the health of critical system services:
 * - Supabase database connection
 * - Google Sheets API connectivity
 * - Midtrans payment gateway
 *
 * Used by: Vercel cron jobs to monitor system health
 * Hit every 5 minutes for early warning of failures
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/lib/utils/logger'
import { createClient } from '@supabase/supabase-js'

interface HealthStatus {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    supabase?: 'up' | 'down'
    googleSheets?: 'up' | 'down'
    midtrans?: 'up' | 'down'
  }
  error?: string
  responseTime: number
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now()
  const correlationId = request.headers.get('x-correlation-id') || 'health-check'

  // Verify health check secret
  const secret = request.headers.get('x-health-secret')
  if (secret !== process.env.HEALTH_CHECK_SECRET) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        services: {},
        error: 'Unauthorized',
        responseTime: Date.now() - startTime,
      },
      { status: 401 }
    )
  }

  const health: HealthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    responseTime: 0,
  }

  try {
    apiLogger.info({
      correlationId,
      event: 'health_check_start',
    })

    // 1. Check Supabase connection
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      const { error } = await supabase.from('outlets').select('id').limit(1)

      if (error) {
        health.services.supabase = 'down'
        health.status = 'degraded'
        apiLogger.warn({
          correlationId,
          event: 'health_check_supabase_down',
          error: error.message,
        })
      } else {
        health.services.supabase = 'up'
        apiLogger.info({
          correlationId,
          event: 'health_check_supabase_up',
        })
      }
    } catch (error: any) {
      health.services.supabase = 'down'
      health.status = 'degraded'
      apiLogger.error({
        correlationId,
        event: 'health_check_supabase_error',
        error: error.message,
      })
    }

    // 2. Check Google Sheets connectivity
    try {
      if (process.env.GOOGLE_SHEETS_ACCESS_TOKEN) {
        const response = await fetch(
          'https://sheets.googleapis.com/v4/spreadsheets',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.GOOGLE_SHEETS_ACCESS_TOKEN}`,
            },
          }
        )

        if (response.ok) {
          health.services.googleSheets = 'up'
          apiLogger.info({
            correlationId,
            event: 'health_check_sheets_up',
          })
        } else {
          health.services.googleSheets = 'down'
          health.status = 'degraded'
          apiLogger.warn({
            correlationId,
            event: 'health_check_sheets_down',
            statusCode: response.status,
          })
        }
      } else {
        health.services.googleSheets = 'down'
        apiLogger.warn({
          correlationId,
          event: 'health_check_sheets_not_configured',
        })
      }
    } catch (error: any) {
      health.services.googleSheets = 'down'
      health.status = 'degraded'
      apiLogger.error({
        correlationId,
        event: 'health_check_sheets_error',
        error: error.message,
      })
    }

    // 3. Check Midtrans connectivity
    try {
      if (process.env.MIDTRANS_SERVER_KEY) {
        const auth = Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64')

        const response = await fetch('https://app.sandbox.midtrans.com/api/v1/ping', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
          },
        })

        if (response.ok) {
          health.services.midtrans = 'up'
          apiLogger.info({
            correlationId,
            event: 'health_check_midtrans_up',
          })
        } else {
          health.services.midtrans = 'down'
          health.status = 'degraded'
          apiLogger.warn({
            correlationId,
            event: 'health_check_midtrans_down',
            statusCode: response.status,
          })
        }
      } else {
        health.services.midtrans = 'down'
        apiLogger.warn({
          correlationId,
          event: 'health_check_midtrans_not_configured',
        })
      }
    } catch (error: any) {
      health.services.midtrans = 'down'
      health.status = 'degraded'
      apiLogger.error({
        correlationId,
        event: 'health_check_midtrans_error',
        error: error.message,
      })
    }

    health.responseTime = Date.now() - startTime

    apiLogger.info({
      correlationId,
      event: 'health_check_complete',
      status: health.status,
      responseTime: health.responseTime,
      services: health.services,
    })

    const statusCode = health.status === 'healthy' ? 200 : 503
    return NextResponse.json(health, { status: statusCode })
  } catch (error: any) {
    health.status = 'unhealthy'
    health.error = error.message
    health.responseTime = Date.now() - startTime

    apiLogger.error({
      correlationId,
      event: 'health_check_failed',
      error: error.message,
      responseTime: health.responseTime,
    })

    return NextResponse.json(health, { status: 500 })
  }
}
