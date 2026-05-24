/**
 * API Response Formatters
 *
 * Standard response shapes for consistency across all endpoints
 */

import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  meta: {
    timestamp: string
    correlationId: string
    responseTime: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: string
  meta: {
    timestamp: string
    correlationId: string
    responseTime: number
  }
}

export interface ApiPaginatedResponse<T = any> {
  success: true
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  meta: {
    timestamp: string
    correlationId: string
    responseTime: number
  }
}

/**
 * Format successful response with data
 */
export const formatSuccess = <T = any>(
  data: T,
  correlationId: string,
  responseTime: number
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    correlationId,
    responseTime,
  },
})

/**
 * Format error response
 */
export const formatError = (
  error: string,
  correlationId: string,
  responseTime: number
): ApiErrorResponse => ({
  success: false,
  error,
  meta: {
    timestamp: new Date().toISOString(),
    correlationId,
    responseTime,
  },
})

/**
 * Format paginated response
 */
export const formatPaginated = <T = any>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  correlationId: string,
  responseTime: number
): ApiPaginatedResponse<T> => ({
  success: true,
  data,
  pagination: {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  },
  meta: {
    timestamp: new Date().toISOString(),
    correlationId,
    responseTime,
  },
})

/**
 * Create NextResponse with standard format
 */
export const successResponse = <T = any>(
  data: T,
  correlationId: string,
  responseTime: number,
  statusCode: number = 200
) => {
  return NextResponse.json(formatSuccess(data, correlationId, responseTime), {
    status: statusCode,
  })
}

/**
 * Create NextResponse error format
 */
export const errorResponse = (
  error: string,
  correlationId: string,
  responseTime: number,
  statusCode: number = 500
) => {
  return NextResponse.json(formatError(error, correlationId, responseTime), {
    status: statusCode,
  })
}
