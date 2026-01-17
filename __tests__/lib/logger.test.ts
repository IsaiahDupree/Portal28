/**
 * Tests for structured logger
 * Test ID: PLT-ERR-004
 */

import { Logger, logger, type LogEntry } from '@/lib/logger';

describe('Logger (PLT-ERR-004)', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleDebugSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.level).toBe('debug');
      expect(logEntry.message).toBe('Debug message');
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.level).toBe('warn');
      expect(logEntry.message).toBe('Warning message');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('Error message');
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error?.name).toBe('Error');
      expect(logEntry.error?.message).toBe('Test error');
    });
  });

  describe('Context logging', () => {
    it('should include context in log entries', () => {
      logger.info('Message with context', {
        userId: '123',
        route: '/test',
      });

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context).toEqual({
        userId: '123',
        route: '/test',
      });
    });

    it('should not include context when empty', () => {
      logger.info('Message without context', {});

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context).toBeUndefined();
    });

    it('should handle complex context objects', () => {
      logger.error(
        'Error with complex context',
        new Error('Test'),
        {
          userId: '123',
          metadata: {
            action: 'purchase',
            amount: 100,
          },
          tags: ['payment', 'error'],
        }
      );

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context).toBeDefined();
      expect(logEntry.context?.userId).toBe('123');
      expect(logEntry.context?.metadata).toEqual({
        action: 'purchase',
        amount: 100,
      });
      expect(logEntry.context?.tags).toEqual(['payment', 'error']);
    });
  });

  describe('Error logging', () => {
    it('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      const logEntry = JSON.parse(consoleErrorSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.error).toBeDefined();
      expect(logEntry.error?.name).toBe('Error');
      expect(logEntry.error?.message).toBe('Test error');
      expect(logEntry.error?.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testLogger = new Logger();
      const spy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      testLogger.error('Error occurred', error);

      const logEntry = JSON.parse(spy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.error).toBeDefined();
      expect(logEntry.error?.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
      spy.mockRestore();
    });
  });

  describe('Child logger', () => {
    it('should create child logger with base context', () => {
      const childLogger = logger.child({
        requestId: 'req-123',
        userId: 'user-456',
      });

      childLogger.info('Child message');

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context).toEqual({
        requestId: 'req-123',
        userId: 'user-456',
      });
    });

    it('should merge child context with base context', () => {
      const childLogger = logger.child({
        requestId: 'req-123',
      });

      childLogger.info('Child message', {
        action: 'test',
      });

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context).toEqual({
        requestId: 'req-123',
        action: 'test',
      });
    });

    it('should allow child context to override base context', () => {
      const childLogger = logger.child({
        userId: 'user-123',
        action: 'base',
      });

      childLogger.warn('Override message', {
        action: 'override',
      });

      const logEntry = JSON.parse(consoleWarnSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry.context?.userId).toBe('user-123');
      expect(logEntry.context?.action).toBe('override');
    });
  });

  describe('Structured output', () => {
    it('should output valid JSON', () => {
      logger.info('JSON test', { key: 'value' });

      const output = consoleInfoSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include timestamp in ISO format', () => {
      logger.info('Timestamp test');

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;
      const timestamp = new Date(logEntry.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should include all required fields', () => {
      logger.info('Required fields test');

      const logEntry = JSON.parse(consoleInfoSpy.mock.calls[0][0]) as LogEntry;

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level');
      expect(logEntry).toHaveProperty('message');
    });
  });
});
