/**
 * Centralized error handling utilities
 * Provides consistent error formatting and logging across the application
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class ValidationError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string = 'Data tidak ditemukan') {
    super(message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
    this.statusCode = 404;
  }
}

export class UnauthorizedError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string = 'Tidak memiliki akses') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'UNAUTHORIZED';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string = 'Akses ditolak') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = 'FORBIDDEN';
    this.statusCode = 403;
  }
}

export class ConflictError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ConflictError';
    this.code = 'CONFLICT';
    this.statusCode = 409;
    this.details = details;
  }
}

export class InternalServerError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string = 'Terjadi kesalahan server', details?: any) {
    super(message);
    this.name = 'InternalServerError';
    this.code = 'INTERNAL_ERROR';
    this.statusCode = 500;
    this.details = details;
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown): {
  success: false;
  error: AppError;
} {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof ConflictError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
      },
    };
  }

  if (error instanceof InternalServerError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
      },
    };
  }

  // Handle generic Error
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'Terjadi kesalahan yang tidak diketahui',
        statusCode: 500,
      },
    };
  }

  // Handle unknown error types
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'Terjadi kesalahan yang tidak diketahui',
      statusCode: 500,
    },
  };
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ValidationError) return error.statusCode;
  if (error instanceof NotFoundError) return error.statusCode;
  if (error instanceof UnauthorizedError) return error.statusCode;
  if (error instanceof ForbiddenError) return error.statusCode;
  if (error instanceof ConflictError) return error.statusCode;
  if (error instanceof InternalServerError) return error.statusCode;
  
  return 500; // Default to internal server error
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}] ` : '';
  
  if (error instanceof Error) {
    console.error(`${timestamp} ${contextStr}${error.name}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(`${timestamp} ${contextStr}Unknown error:`, error);
  }
}

/**
 * Handle API errors in client components
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    // Try to parse as API error response
    try {
      const apiError = JSON.parse(error.message);
      if (apiError.error?.message) {
        return apiError.error.message;
      }
    } catch {
      // Not a JSON error, use the error message directly
      return error.message;
    }
  }
  
  return 'Terjadi kesalahan yang tidak diketahui';
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, any>, fields: string[]): void {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new ValidationError(
      `Field wajib tidak boleh kosong: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: any, fieldName: string): void {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} harus berupa angka positif`);
  }
}

/**
 * Validate non-negative number
 */
export function validateNonNegativeNumber(value: any, fieldName: string): void {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} tidak boleh negatif`);
  }
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(value: string, fieldName: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new ValidationError(`${fieldName} harus dalam format YYYY-MM-DD`);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} bukan tanggal yang valid`);
  }
}

/**
 * Validate date not in future
 */
export function validateNotFutureDate(value: string, fieldName: string): void {
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (date > today) {
    throw new ValidationError(`${fieldName} tidak boleh di masa depan`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum(value: any, allowedValues: any[], fieldName: string): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} harus salah satu dari: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Validate array not empty
 */
export function validateArrayNotEmpty(value: any[], fieldName: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError(`${fieldName} tidak boleh kosong`);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string, 
  minLength: number, 
  maxLength: number, 
  fieldName: string
): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} harus berupa teks`);
  }

  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} minimal ${minLength} karakter`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} maksimal ${maxLength} karakter`);
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} harus berupa UUID yang valid`);
  }
}

/**
 * Create error response for API routes
 */
export function createErrorResponse(error: unknown, defaultMessage?: string) {
  const errorResponse = formatErrorResponse(error);
  const statusCode = getErrorStatusCode(error);
  
  // Log error for debugging
  logError(error, 'API');
  
  return Response.json(errorResponse, { status: statusCode });
}

/**
 * Async error wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, 'API Handler');
      throw error;
    }
  };
}