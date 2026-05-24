/**
 * Universal API Handler Wrapper
 *
 * Standardizes all API responses and adds:
 * - Automatic error handling
 * - Role-based access control
 * - Zod validation
 * - Correlation ID tracking
 * - Request logging
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { prisma } from '@/lib/db/prisma-client'
import { apiLogger } from '@/lib/utils/logger'

export interface HandlerContext {
  correlationId: string
  userId: string
  userRole: string
  outlet_id: string
  prisma: typeof prisma
}

export interface HandlerOptions {
  roles?: string[]
  requireAuth?: boolean
  validateZod?: ZodSchema
  description?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta: {
    timestamp: string
    correlationId: string
    responseTime: number
  }
}

type Handler<T = any> = (
  request: NextRequest,
  context: HandlerContext,
  params?: Record<string, any>
) => Promise<T>

/**
 * Wraps API route handlers with standardized error handling, auth, validation
 *
 * @example
 * export const POST = withHandler(
 *   async (req, context) => {
 *     const data = await req.json()
 *     const order = await context.prisma.orders.create({...})
 *     return order
 *   },
 *   {
 *     requireAuth: true,
 *     roles: ['kasir', 'owner'],
 *     validateZod: CreateOrderSchema
 *   }
 * )
 */
export function withHandler<T = any>(
  handler: Handler<T>,
  options: HandlerOptions = {}
): (request: NextRequest, context: any) => Promise<NextResponse<ApiResponse<T>>> {
  return async (request: NextRequest, routeContext: any) => {
    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID()
    const startTime = Date.now()

    try {
      // 1. Extract user context from headers
      const userId = request.headers.get('x-user-id') || 'anonymous'
      const userRole = request.headers.get('x-user-role') || 'guest'
      const outlet_id = request.headers.get('x-outlet-id') || ''

      apiLogger.info({
        correlationId,
        event: 'request_start',
        method: request.method,
        path: request.nextUrl.pathname,
        userId,
        userRole,
      })

      // 2. Authentication check
      if (options.requireAuth && userRole === 'guest') {
        apiLogger.warn({
          correlationId,
          event: 'unauthorized_no_auth',
          path: request.nextUrl.pathname,
        })

        const duration = Date.now() - startTime
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Unauthorized',
            meta: {
              timestamp: new Date().toISOString(),
              correlationId,
              responseTime: duration,
            },
          },
          { status: 401 }
        )
      }

      // 3. Role-based access control
      if (options.roles && !options.roles.includes(userRole)) {
        apiLogger.warn({
          correlationId,
          event: 'forbidden_insufficient_role',
          userId,
          userRole,
          requiredRoles: options.roles,
          path: request.nextUrl.pathname,
        })

        const duration = Date.now() - startTime
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: 'Forbidden',
            meta: {
              timestamp: new Date().toISOString(),
              correlationId,
              responseTime: duration,
            },
          },
          { status: 403 }
        )
      }

      // 4. Request body validation (if needed)
      let body = null
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          body = await request.json()

          if (options.validateZod) {
            const parsed = options.validateZod.safeParse(body)
            if (!parsed.success) {
              apiLogger.warn({
                correlationId,
                event: 'validation_error',
                errors: parsed.error.flatten(),
              })

              const duration = Date.now() - startTime
              return NextResponse.json<ApiResponse>(
                {
                  success: false,
                  error: 'Validation failed',
                  data: parsed.error.flatten(),
                  meta: {
                    timestamp: new Date().toISOString(),
                    correlationId,
                    responseTime: duration,
                  },
                },
                { status: 400 }
              )
            }
            body = parsed.data
          }
        } catch (parseError: any) {
          apiLogger.warn({
            correlationId,
            event: 'json_parse_error',
            error: parseError.message,
          })

          const duration = Date.now() - startTime
          return NextResponse.json<ApiResponse>(
            {
              success: false,
              error: 'Invalid JSON',
              meta: {
                timestamp: new Date().toISOString(),
                correlationId,
                responseTime: duration,
              },
            },
            { status: 400 }
          )
        }
      }

      // 5. Call handler
      const result = await handler(request, {
        correlationId,
        userId,
        userRole,
        outlet_id,
        prisma,
      }, routeContext.params)

      // 6. Success response
      const duration = Date.now() - startTime

      apiLogger.info({
        correlationId,
        event: 'request_success',
        method: request.method,
        path: request.nextUrl.pathname,
        duration,
        userId,
      })

      return NextResponse.json<ApiResponse<T>>(
        {
          success: true,
          data: result,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId,
            responseTime: duration,
          },
        },
        { status: 200 }
      )
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Log error with full context
      apiLogger.error({
        correlationId,
        event: 'request_error',
        method: request.method,
        path: request.nextUrl.pathname,
        error: error.message,
        stack: error.stack,
        duration,
      })

      // Don't expose stack traces to client
      const errorMessage = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: errorMessage,
          meta: {
            timestamp: new Date().toISOString(),
            correlationId,
            responseTime: duration,
          },
        },
        { status: error.statusCode || 500 }
      )
    }
  }
}
