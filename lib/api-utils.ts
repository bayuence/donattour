import { NextResponse } from 'next/server';

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
}

/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Create standardized error response
 * 
 * @param message - Error message untuk user
 * @param status - HTTP status code (default: 500)
 * @param details - Additional error details (hanya tampil di development)
 * @returns NextResponse dengan format error yang konsisten
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: any
): NextResponse<ApiErrorResponse> {
  console.error(`[API Error ${status}]`, message, details);
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create standardized success response
 * 
 * @param data - Data yang akan dikirim ke client
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse dengan format success yang konsisten
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Validate required fields in request body
 * 
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Array of missing field names (empty array jika semua ada)
 */
export function validateRequired(
  body: any,
  requiredFields: string[]
): string[] {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    const value = body[field];
    
    // Check if field is missing, null, undefined, or empty string
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Sanitize data untuk logging (remove sensitive fields)
 * 
 * @param data - Data yang akan di-log
 * @returns Sanitized data dengan sensitive fields di-redact
 */
export function sanitizeForLog(data: any): any {
  if (!data) return data;
  
  const sensitive = ['password', 'token', 'key', 'secret', 'phone', 'email'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * Log API request dengan format yang konsisten
 * 
 * @param method - HTTP method
 * @param path - API path
 * @param body - Request body (akan di-sanitize)
 */
export function logApiRequest(method: string, path: string, body?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API ${method}] ${path}`);
    if (body) {
      console.log('Body:', sanitizeForLog(body));
    }
  }
}

/**
 * Log API response dengan format yang konsisten
 * 
 * @param method - HTTP method
 * @param path - API path
 * @param status - HTTP status code
 * @param duration - Request duration in ms
 */
export function logApiResponse(
  method: string,
  path: string,
  status: number,
  duration?: number
) {
  if (process.env.NODE_ENV === 'development') {
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`[API ${method}] ${path} → ${status}${durationStr}`);
  }
}
