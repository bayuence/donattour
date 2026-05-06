/**
 * Custom Database Error Classes
 * 
 * Standardized error handling for database operations
 */

/**
 * Base database error class
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Validation error - invalid input data
 */
export class ValidationError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error - record doesn't exist
 */
export class NotFoundError extends DatabaseError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Duplicate error - unique constraint violation
 */
export class DuplicateError extends DatabaseError {
  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, 'DUPLICATE_ENTRY', 409);
    this.name = 'DuplicateError';
  }
}

/**
 * Constraint error - database constraint violation
 */
export class ConstraintError extends DatabaseError {
  constructor(message: string, constraint?: string) {
    super(message, 'CONSTRAINT_VIOLATION', 422, { constraint });
    this.name = 'ConstraintError';
  }
}

/**
 * Foreign key error - referenced record doesn't exist
 */
export class ForeignKeyError extends DatabaseError {
  constructor(table: string, foreignKey: string) {
    super(
      `Referenced ${foreignKey} does not exist in ${table}`,
      'FOREIGN_KEY_VIOLATION',
      422
    );
    this.name = 'ForeignKeyError';
  }
}

/**
 * Unauthorized error - user doesn't have permission
 */
export class UnauthorizedError extends DatabaseError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error - user is authenticated but doesn't have permission
 */
export class ForbiddenError extends DatabaseError {
  constructor(message: string = 'Forbidden - insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict error - operation conflicts with current state
 */
export class ConflictError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Transaction error - transaction failed
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_FAILED', 500, details);
    this.name = 'TransactionError';
  }
}

/**
 * Connection error - database connection failed
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed') {
    super(message, 'CONNECTION_ERROR', 503);
    this.name = 'ConnectionError';
  }
}

/**
 * Timeout error - operation timed out
 */
export class TimeoutError extends DatabaseError {
  constructor(operation: string) {
    super(`Operation '${operation}' timed out`, 'TIMEOUT', 504);
    this.name = 'TimeoutError';
  }
}

/**
 * Parse Supabase error and convert to custom error
 */
export function parseSupabaseError(error: any): DatabaseError {
  const message = error.message || 'Database operation failed';
  const code = error.code || 'UNKNOWN_ERROR';

  // Check for specific error codes
  if (code === '23505') {
    // Unique constraint violation
    return new DuplicateError('Record', extractFieldFromError(error));
  }

  if (code === '23503') {
    // Foreign key violation
    return new ForeignKeyError('table', extractFieldFromError(error));
  }

  if (code === '23514') {
    // Check constraint violation
    return new ConstraintError(message, extractFieldFromError(error));
  }

  if (code === 'PGRST116') {
    // Not found
    return new NotFoundError('Record');
  }

  if (code === '42501') {
    // Insufficient privilege
    return new ForbiddenError(message);
  }

  if (message.includes('JWT')) {
    // Authentication error
    return new UnauthorizedError(message);
  }

  if (message.includes('timeout')) {
    return new TimeoutError('database operation');
  }

  if (message.includes('connection')) {
    return new ConnectionError(message);
  }

  // Default to generic database error
  return new DatabaseError(message, code, 500, error);
}

/**
 * Extract field name from error message
 */
function extractFieldFromError(error: any): string | undefined {
  const message = error.message || '';
  const match = message.match(/Key \(([^)]+)\)/);
  return match ? match[1] : undefined;
}

/**
 * Check if error is a database error
 */
export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Handle database error and return standardized response
 */
export function handleDatabaseError(error: any): {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  statusCode: number;
} {
  if (isDatabaseError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      statusCode: error.statusCode,
    };
  }

  // Parse Supabase error
  const dbError = parseSupabaseError(error);
  return {
    success: false,
    error: {
      code: dbError.code,
      message: dbError.message,
      details: dbError.details,
    },
    statusCode: dbError.statusCode,
  };
}

/**
 * Wrap async database operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>
): Promise<{ data: T | null; error: DatabaseError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const dbError = isDatabaseError(error) ? error : parseSupabaseError(error);
    console.error('Database operation error:', dbError);
    return { data: null, error: dbError };
  }
}
