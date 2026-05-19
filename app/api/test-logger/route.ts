/**
 * Test endpoint for Pino logger
 *
 * Used for verifying structured logging works correctly
 * This will be deleted after testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || 'no-id'
  const startTime = Date.now()

  try {
    // Log request start
    apiLogger.info({
      correlationId,
      event: 'test_logger_start',
      method: 'GET',
      path: '/api/test-logger',
      timestamp: new Date().toISOString(),
    })

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100))

    // Log success
    const duration = Date.now() - startTime
    apiLogger.info({
      correlationId,
      event: 'test_logger_success',
      duration,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Logger test successful',
      correlationId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log error
    apiLogger.error({
      correlationId,
      event: 'test_logger_error',
      error: error.message,
      stack: error.stack,
      duration,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        correlationId,
      },
      { status: 500 }
    )
  }
}
