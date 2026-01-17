/**
 * API Error Response Utilities
 *
 * Provides standardized error responses for API routes
 * Ensures consistent error format across all endpoints
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Client errors (400-499)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500-599)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  statusCode: number,
  code?: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 400 Bad Request
 */
export function badRequest(message = 'Bad request', details?: unknown): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 400, ErrorCodes.BAD_REQUEST, details);
}

/**
 * 401 Unauthorized
 */
export function unauthorized(message = 'Unauthorized'): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 401, ErrorCodes.UNAUTHORIZED);
}

/**
 * 403 Forbidden
 */
export function forbidden(message = 'Forbidden'): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 403, ErrorCodes.FORBIDDEN);
}

/**
 * 404 Not Found
 */
export function notFound(message = 'Resource not found'): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 404, ErrorCodes.NOT_FOUND);
}

/**
 * 409 Conflict
 */
export function conflict(message = 'Resource conflict', details?: unknown): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 409, ErrorCodes.CONFLICT, details);
}

/**
 * 422 Validation Error
 */
export function validationError(message = 'Validation failed', details?: unknown): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 422, ErrorCodes.VALIDATION_ERROR, details);
}

/**
 * 429 Rate Limit Exceeded
 */
export function rateLimitExceeded(message = 'Rate limit exceeded'): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED);
}

/**
 * 500 Internal Server Error
 */
export function internalError(
  message = 'Internal server error',
  error?: Error,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  // Log the error
  logger.error(message, error, context);

  // Don't expose internal error details to client
  return createErrorResponse(
    'An unexpected error occurred',
    500,
    ErrorCodes.INTERNAL_ERROR
  );
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailable(message = 'Service temporarily unavailable'): NextResponse<ErrorResponse> {
  return createErrorResponse(message, 503, ErrorCodes.SERVICE_UNAVAILABLE);
}

/**
 * Handle database errors
 */
export function databaseError(error: Error, context?: Record<string, unknown>): NextResponse<ErrorResponse> {
  logger.error('Database error', error, { ...context, type: 'database' });

  return createErrorResponse(
    'A database error occurred',
    500,
    ErrorCodes.DATABASE_ERROR
  );
}

/**
 * Handle external service errors (Stripe, Mux, etc.)
 */
export function externalServiceError(
  service: string,
  error: Error,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  logger.error(`External service error: ${service}`, error, {
    ...context,
    service,
    type: 'external-service',
  });

  return createErrorResponse(
    'An error occurred with an external service',
    500,
    ErrorCodes.EXTERNAL_SERVICE_ERROR
  );
}

/**
 * Wrap async API route handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse<ErrorResponse>> {
  return handler().catch((error: Error) => {
    return internalError('Unhandled error in API route', error);
  });
}
