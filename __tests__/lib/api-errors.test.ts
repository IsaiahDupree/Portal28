/**
 * Tests for API error responses
 * Test ID: PLT-ERR-003
 */

import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  rateLimitExceeded,
  internalError,
  serviceUnavailable,
  databaseError,
  externalServiceError,
  ErrorCodes,
  type ErrorResponse,
} from '@/lib/api-errors';
import { logger } from '@/lib/logger';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('API Errors (PLT-ERR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error response format', () => {
    it('should return JSON format with error property', async () => {
      const response = badRequest('Invalid input');
      const data = (await response.json()) as ErrorResponse;

      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('message');
    });

    it('should include error code when provided', async () => {
      const response = badRequest('Invalid input');
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.code).toBe(ErrorCodes.BAD_REQUEST);
    });

    it('should include details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = validationError('Validation failed', {
        field: 'email',
        issue: 'invalid format',
      });
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.details).toEqual({
        field: 'email',
        issue: 'invalid format',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include details in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = validationError('Validation failed', {
        field: 'email',
        issue: 'invalid format',
      });
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Client errors (4xx)', () => {
    it('should return 400 for bad request', async () => {
      const response = badRequest('Invalid input');

      expect(response.status).toBe(400);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Invalid input');
      expect(data.error.code).toBe(ErrorCodes.BAD_REQUEST);
    });

    it('should return 401 for unauthorized', async () => {
      const response = unauthorized('Not authenticated');

      expect(response.status).toBe(401);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Not authenticated');
      expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED);
    });

    it('should return 403 for forbidden', async () => {
      const response = forbidden('Access denied');

      expect(response.status).toBe(403);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Access denied');
      expect(data.error.code).toBe(ErrorCodes.FORBIDDEN);
    });

    it('should return 404 for not found', async () => {
      const response = notFound('Course not found');

      expect(response.status).toBe(404);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Course not found');
      expect(data.error.code).toBe(ErrorCodes.NOT_FOUND);
    });

    it('should return 409 for conflict', async () => {
      const response = conflict('Email already exists');

      expect(response.status).toBe(409);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Email already exists');
      expect(data.error.code).toBe(ErrorCodes.CONFLICT);
    });

    it('should return 422 for validation error', async () => {
      const response = validationError('Invalid email format');

      expect(response.status).toBe(422);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Invalid email format');
      expect(data.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    });

    it('should return 429 for rate limit exceeded', async () => {
      const response = rateLimitExceeded('Too many requests');

      expect(response.status).toBe(429);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Too many requests');
      expect(data.error.code).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Server errors (5xx)', () => {
    it('should return 500 for internal error', async () => {
      const error = new Error('Database connection failed');
      const response = internalError('Internal error', error);

      expect(response.status).toBe(500);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('An unexpected error occurred');
      expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    });

    it('should log internal errors', async () => {
      const error = new Error('Database connection failed');
      const context = { userId: '123', route: '/api/test' };

      internalError('Internal error', error, context);

      expect(logger.error).toHaveBeenCalledWith(
        'Internal error',
        error,
        context
      );
    });

    it('should return 503 for service unavailable', async () => {
      const response = serviceUnavailable('Database is down');

      expect(response.status).toBe(503);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.message).toBe('Database is down');
      expect(data.error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
    });

    it('should handle database errors', async () => {
      const error = new Error('Connection timeout');
      const context = { query: 'SELECT * FROM users' };

      const response = databaseError(error, context);

      expect(response.status).toBe(500);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.code).toBe(ErrorCodes.DATABASE_ERROR);

      expect(logger.error).toHaveBeenCalledWith(
        'Database error',
        error,
        expect.objectContaining({ type: 'database', query: 'SELECT * FROM users' })
      );
    });

    it('should handle external service errors', async () => {
      const error = new Error('Stripe API timeout');
      const context = { operation: 'create_checkout' };

      const response = externalServiceError('Stripe', error, context);

      expect(response.status).toBe(500);
      const data = (await response.json()) as ErrorResponse;
      expect(data.error.code).toBe(ErrorCodes.EXTERNAL_SERVICE_ERROR);

      expect(logger.error).toHaveBeenCalledWith(
        'External service error: Stripe',
        error,
        expect.objectContaining({
          service: 'Stripe',
          type: 'external-service',
          operation: 'create_checkout',
        })
      );
    });
  });

  describe('Default messages', () => {
    it('should use default message for badRequest', async () => {
      const response = badRequest();
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.message).toBe('Bad request');
    });

    it('should use default message for unauthorized', async () => {
      const response = unauthorized();
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.message).toBe('Unauthorized');
    });

    it('should use default message for forbidden', async () => {
      const response = forbidden();
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.message).toBe('Forbidden');
    });

    it('should use default message for notFound', async () => {
      const response = notFound();
      const data = (await response.json()) as ErrorResponse;

      expect(data.error.message).toBe('Resource not found');
    });
  });
});
