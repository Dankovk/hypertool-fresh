/**
 * Comprehensive Logger for Backend Services
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Structured JSON output
 * - Context/component tagging
 * - Request ID tracking
 * - Environment-aware verbosity
 * - Timestamp support
 * - Metadata attachment
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogMetadata {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  context?: string;
  requestId?: string;
  message: string;
  metadata?: LogMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private minLevel: LogLevel;
  private context?: string;
  private requestId?: string;

  constructor(context?: string, requestId?: string) {
    this.context = context;
    this.requestId = requestId;

    // Set minimum log level based on environment
    const env = process.env.NODE_ENV || 'development';
    const logLevelEnv = process.env.LOG_LEVEL?.toUpperCase();

    if (logLevelEnv) {
      this.minLevel = LogLevel[logLevelEnv as keyof typeof LogLevel] ?? LogLevel.INFO;
    } else {
      this.minLevel = env === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string, requestId?: string): Logger {
    return new Logger(
      this.context ? `${this.context}:${context}` : context,
      requestId || this.requestId
    );
  }

  /**
   * Create a logger with a request ID for tracing
   */
  withRequestId(requestId: string): Logger {
    return new Logger(this.context, requestId);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: LogLevel, message: string, metadata?: LogMetadata, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
    };

    if (this.context) {
      entry.context = this.context;
    }

    if (this.requestId) {
      entry.requestId = this.requestId;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // In production, output structured JSON for log aggregation
      console.log(JSON.stringify(entry));
    } else {
      // In development, output human-readable logs with colors
      const colors = {
        DEBUG: '\x1b[36m', // Cyan
        INFO: '\x1b[32m',  // Green
        WARN: '\x1b[33m',  // Yellow
        ERROR: '\x1b[31m', // Red
        RESET: '\x1b[0m',
        DIM: '\x1b[2m',
      };

      const levelColor = colors[entry.level as keyof typeof colors] || colors.RESET;
      const contextStr = entry.context ? `[${entry.context}]` : '';
      const requestIdStr = entry.requestId ? `{${entry.requestId}}` : '';
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();

      let logLine = `${colors.DIM}${timestamp}${colors.RESET} ${levelColor}${entry.level.padEnd(5)}${colors.RESET} ${contextStr}${requestIdStr} ${entry.message}`;

      console.log(logLine);

      if (entry.metadata) {
        console.log(`${colors.DIM}  Metadata:${colors.RESET}`, entry.metadata);
      }

      if (entry.error) {
        console.log(`${colors.DIM}  Error:${colors.RESET}`, entry.error.message);
        if (entry.error.stack) {
          console.log(`${colors.DIM}  Stack:${colors.RESET}\n${entry.error.stack}`);
        }
      }
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatLog(LogLevel.DEBUG, message, metadata);
    this.writeLog(entry);
  }

  info(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatLog(LogLevel.INFO, message, metadata);
    this.writeLog(entry);
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatLog(LogLevel.WARN, message, metadata);
    this.writeLog(entry);
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorObj = error instanceof Error ? error : undefined;
    const errorMetadata = error && !(error instanceof Error)
      ? { ...metadata, errorData: error }
      : metadata;

    const entry = this.formatLog(LogLevel.ERROR, message, errorMetadata, errorObj);
    this.writeLog(entry);
  }

  /**
   * Log timing information for performance monitoring
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { durationMs: duration });
    };
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, metadata?: LogMetadata, error?: Error): void {
    if (!this.shouldLog(level)) return;
    const entry = this.formatLog(level, message, metadata, error);
    this.writeLog(entry);
  }
}

// Export default logger instance
export const logger = new Logger();

// Export convenience function to create context-specific loggers
export function createLogger(context: string, requestId?: string): Logger {
  return new Logger(context, requestId);
}

// Export type
export type { Logger };
