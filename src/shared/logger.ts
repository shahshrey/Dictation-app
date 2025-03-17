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

// Set default log level to only show errors
const DEFAULT_LOG_LEVEL = LOG_LEVELS.error;

// Create a browser-compatible logger
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

// Export a simplified interface that works in both main and renderer processes
export default {
  error: (message: string, meta: LogMetadata = {}): void => {
    browserLogger.error(message, meta);
  },

  warn: (message: string, meta: LogMetadata = {}): void => {
    browserLogger.warn(message, meta);
  },

  info: (message: string, meta: LogMetadata = {}): void => {
    browserLogger.debug(message, meta);
  },

  debug: (message: string, meta: LogMetadata = {}): void => {
    browserLogger.debug(message, meta);
  },

  // Helper method to log objects with proper formatting
  logObject: (level: LogLevel, message: string, obj: unknown): void => {
    browserLogger.log(level, message, { data: obj });
  },

  // For compatibility with existing code
  exception: (message: string, error: unknown): void => {
    browserLogger.error(message, { error });
  },
};
