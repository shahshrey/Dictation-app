import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Constants for log levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Get the app data path for storing logs
const getLogPath = () => {
  const userDataPath = app?.getPath('userData') || process.cwd();
  const logDir = path.join(userDataPath, 'logs');
  
  // Create logs directory if it doesn't exist
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    // Use a simple error log since the logger isn't initialized yet
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: Failed to create log directory: ${error instanceof Error ? error.message : String(error)}`;
    
    // Log to stderr
    process.stderr.write(errorMessage + '\n');
  }
  
  return logDir;
};

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const metaString = Object.keys(metadata).length 
    ? ` | ${JSON.stringify(metadata)}`
    : '';
  
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
});

// Extend the Winston Logger type to include our exception method
interface ExtendedLogger extends winston.Logger {
  exception(error: Error, message?: string, metadata?: Record<string, any>): void;
}

// Create the logger instance
const createLogger = (processType: string): ExtendedLogger => {
  const logPath = getLogPath();
  
  const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
      structuredFormat
    ),
    defaultMeta: { process: processType },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          structuredFormat
        ),
      }),
      // File transport for all logs
      new winston.transports.File({ 
        filename: path.join(logPath, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // File transport for error logs
      new winston.transports.File({ 
        filename: path.join(logPath, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  }) as ExtendedLogger;
  
  // Add the exception method to the logger
  logger.exception = (error: Error, message?: string, metadata?: Record<string, any>) => {
    const errorMeta = {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
    logger.error(message || error.message, errorMeta);
  };
  
  return logger;
};

// Create loggers for different processes
let mainLogger: ExtendedLogger;
let rendererLogger: ExtendedLogger;

// Initialize loggers
export const initLoggers = () => {
  mainLogger = createLogger('main');
  rendererLogger = createLogger('renderer');
  
  mainLogger.info('Logging system initialized');
};

// Get the appropriate logger based on process type
export const getLogger = (processType: 'main' | 'renderer' = 'main'): ExtendedLogger => {
  // Initialize loggers if not already done
  if (!mainLogger || !rendererLogger) {
    initLoggers();
  }
  
  return processType === 'main' ? mainLogger : rendererLogger;
};

// Export log levels for use throughout the app
export { LOG_LEVELS }; 