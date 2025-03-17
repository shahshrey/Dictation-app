// Define log levels as string literals
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Define metadata type
type LogMetadata = Record<string, unknown>;

// Define log level values
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Set default log level based on environment
// In production, only show errors and warnings
// In development, show all logs
const DEFAULT_LOG_LEVEL = isProduction ? LOG_LEVELS.warn : LOG_LEVELS.debug;

// Create a browser-compatible logger with production optimizations
const browserLogger = {
  error: (message: string, meta: Record<string, unknown> = {}): void => {
    console.error(`[ERROR] ${message}`, meta);
  },

  warn: (message: string, meta: Record<string, unknown> = {}): void => {
    if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, meta);
    }
  },

  info: (message: string, meta: Record<string, unknown> = {}): void => {
    if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.info) {
      console.info(`[INFO] ${message}`, meta);
    }
  },

  debug: (message: string, meta: Record<string, unknown> = {}): void => {
    if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.debug) {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },

  log: (level: LogLevel, message: string, meta: Record<string, unknown> = {}): void => {
    switch (level) {
      case 'error':
        console.error(`[ERROR] ${message}`, meta);
        break;
      case 'warn':
        if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.warn) {
          console.warn(`[WARN] ${message}`, meta);
        }
        break;
      case 'info':
        if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.info) {
          console.info(`[INFO] ${message}`, meta);
        }
        break;
      case 'debug':
        if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.debug) {
          console.debug(`[DEBUG] ${message}`, meta);
        }
        break;
    }
  },
};

// Create optimized no-op functions for production
const noOpLogger = {
  // Always log errors
  error: browserLogger.error,

  // For non-error levels, use no-op functions in production when level is higher than default
  warn: isProduction
    ? DEFAULT_LOG_LEVEL >= LOG_LEVELS.warn
      ? browserLogger.warn
      : () => {}
    : browserLogger.warn,

  info: isProduction
    ? DEFAULT_LOG_LEVEL >= LOG_LEVELS.info
      ? browserLogger.info
      : () => {}
    : browserLogger.info,

  debug: isProduction
    ? DEFAULT_LOG_LEVEL >= LOG_LEVELS.debug
      ? browserLogger.debug
      : () => {}
    : browserLogger.debug,

  log: isProduction
    ? (level: LogLevel, message: string, meta: Record<string, unknown> = {}): void => {
        if (level === 'error' || (level === 'warn' && DEFAULT_LOG_LEVEL >= LOG_LEVELS.warn)) {
          browserLogger.log(level, message, meta);
        }
        // Skip other levels in production
      }
    : browserLogger.log,

  // Helper method to log objects with proper formatting
  logObject: isProduction
    ? (level: LogLevel, message: string, obj: unknown): void => {
        if (level === 'error' || (level === 'warn' && DEFAULT_LOG_LEVEL >= LOG_LEVELS.warn)) {
          browserLogger.log(level, message, { data: obj });
        }
        // Skip other levels in production
      }
    : (level: LogLevel, message: string, obj: unknown): void => {
        browserLogger.log(level, message, { data: obj });
      },

  // For compatibility with existing code
  exception: browserLogger.error,
};

// Export a simplified interface that works in both main and renderer processes
// Use the optimized logger in production
export default {
  error: (message: string, meta: LogMetadata = {}): void => {
    noOpLogger.error(message, meta);
  },

  warn: (message: string, meta: LogMetadata = {}): void => {
    noOpLogger.warn(message, meta);
  },

  info: (message: string, meta: LogMetadata = {}): void => {
    noOpLogger.debug(message, meta);
  },

  debug: (message: string, meta: LogMetadata = {}): void => {
    noOpLogger.debug(message, meta);
  },

  // Helper method to log objects with proper formatting
  logObject: (level: LogLevel, message: string, obj: unknown): void => {
    noOpLogger.logObject(level, message, obj);
  },

  // For compatibility with existing code
  exception: (message: string, error: unknown): void => {
    noOpLogger.error(message, { error });
  },
};
