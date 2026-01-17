/**
 * Structured Logger for Portal28
 *
 * Provides consistent logging format with context and metadata
 * In production, integrate with a service like Sentry, DataDog, or LogRocket
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  /**
   * Format log entry as structured JSON
   */
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      entry.error = {
        name: error.name,
        message: error.message,
        stack: isDevelopment ? error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Output log to console (in production, send to logging service)
   */
  private output(entry: LogEntry): void {
    const logString = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }

    // In production, send to external service
    // if (!this.isDevelopment) {
    //   this.sendToExternalService(entry);
    // }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry('debug', message, context);
    this.output(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry('info', message, context);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.formatLogEntry('warn', message, context);
    this.output(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.formatLogEntry('error', message, context, error);
    this.output(entry);
  }

  /**
   * Create a child logger with pre-set context
   */
  child(baseContext: LogContext): Logger {
    const childLogger = new Logger();

    // Override methods to include base context
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (message: string, context?: LogContext) => {
      originalDebug(message, { ...baseContext, ...context });
    };

    childLogger.info = (message: string, context?: LogContext) => {
      originalInfo(message, { ...baseContext, ...context });
    };

    childLogger.warn = (message: string, context?: LogContext) => {
      originalWarn(message, { ...baseContext, ...context });
    };

    childLogger.error = (message: string, error?: Error, context?: LogContext) => {
      originalError(message, error, { ...baseContext, ...context });
    };

    return childLogger;
  }

  /**
   * Placeholder for sending to external logging service
   * In production, implement integration with Sentry, DataDog, etc.
   */
  private sendToExternalService(entry: LogEntry): void {
    // TODO: Implement external logging service integration
    // Example: Sentry.captureException(entry);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
