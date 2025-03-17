// Define log levels as string literals
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Define metadata type
type LogMetadata = Record<string, unknown>;

// Create a browser-compatible logger
const browserLogger = {
  error: (message: string, meta: Record<string, unknown> = {}): void => {
    console.error(`[ERROR] ${message}`, meta);
  },

  warn: (message: string, meta: Record<string, unknown> = {}): void => {
    console.warn(`[WARN] ${message}`, meta);
  },

  info: (message: string, meta: Record<string, unknown> = {}): void => {
    console.info(`[INFO] ${message}`, meta);
  },

  debug: (message: string, meta: Record<string, unknown> = {}): void => {
    console.debug(`[DEBUG] ${message}`, meta);
  },

  log: (level: LogLevel, message: string, meta: Record<string, unknown> = {}): void => {
    switch (level) {
      case 'error':
        console.error(`[ERROR] ${message}`, meta);
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, meta);
        break;
      case 'info':
        console.info(`[INFO] ${message}`, meta);
        break;
      case 'debug':
        console.debug(`[DEBUG] ${message}`, meta);
        break;
    }
  },
};

// Export a simplified interface that works in the renderer process
const logger = {
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

export { logger };
export default logger;
