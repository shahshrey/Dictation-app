// This logger is used in the preload script and renderer process
// where we can't directly import the electron app module

// Define log levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Simple structured logging for preload/renderer
class PreloadLogger {
  private processType: string;
  private logLevel: string;

  constructor(processType: string) {
    this.processType = processType;
    // Default to debug in development, info in production
    this.logLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
  }

  private shouldLog(level: string): boolean {
    const levels = {
      [LOG_LEVELS.ERROR]: 0,
      [LOG_LEVELS.WARN]: 1,
      [LOG_LEVELS.INFO]: 2,
      [LOG_LEVELS.DEBUG]: 3,
    };

    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, metadata?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaString = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${this.processType}]: ${message}${metaString}`;
  }

  error(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage(LOG_LEVELS.ERROR, message, metadata));
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, metadata));
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage(LOG_LEVELS.INFO, message, metadata));
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(this.formatMessage(LOG_LEVELS.DEBUG, message, metadata));
    }
  }

  // For compatibility with try-catch blocks
  exception(error: Error, message?: string, metadata?: Record<string, any>): void {
    const errorMeta = {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    this.error(message || error.message, errorMeta);
  }
}

// Create and export preload logger instances
export const preloadLogger = new PreloadLogger('preload');
export const rendererLogger = new PreloadLogger('renderer'); 