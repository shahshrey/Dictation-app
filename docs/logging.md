# Logging System Documentation

## Overview

The Dictation App uses a structured logging system based on Winston for the main process and a custom lightweight logger for the preload/renderer processes. This document outlines the logging architecture, usage patterns, and best practices.

## Architecture

The logging system consists of two main components:

1. **Main Process Logger**: Uses Winston for comprehensive logging with file output and console formatting.
2. **Preload/Renderer Logger**: A lightweight custom logger that works in the renderer process where Winston cannot be used directly.

## Log Levels

The system supports four log levels, in order of increasing verbosity:

- **ERROR**: Critical issues that prevent the application from functioning correctly
- **WARN**: Important issues that don't prevent the application from functioning but require attention
- **INFO**: General information about application state and significant events
- **DEBUG**: Detailed information useful for debugging

The default log level is:
- `debug` in development mode
- `info` in production mode

## Log Storage

Logs are stored in the following locations:

- **Combined Log**: `{userData}/logs/combined.log` - Contains all log entries
- **Error Log**: `{userData}/logs/error.log` - Contains only error-level entries

Log files are rotated when they reach 5MB, with a maximum of 5 files kept for each log type.

## Usage

### Main Process

```typescript
import { getLogger } from '../../shared/logger';

// Get the logger instance
const logger = getLogger('main');

// Log at different levels
logger.error('Critical error occurred', { errorCode: 500 });
logger.warn('Warning condition', { component: 'audio' });
logger.info('Application started', { version: '1.0.0' });
logger.debug('Detailed debug information', { data: someObject });

// Log exceptions with stack traces
try {
  // Some code that might throw
} catch (error) {
  if (error instanceof Error) {
    logger.exception(error, 'Failed to process request');
  } else {
    logger.error('Unknown error occurred', { error: String(error) });
  }
}
```

### Preload/Renderer Process

```typescript
import { preloadLogger, rendererLogger } from '../../shared/preload-logger';

// Use the appropriate logger
const logger = preloadLogger; // or rendererLogger

// Log at different levels
logger.error('Critical error occurred', { errorCode: 500 });
logger.warn('Warning condition', { component: 'audio' });
logger.info('Application started', { version: '1.0.0' });
logger.debug('Detailed debug information', { data: someObject });

// Log exceptions with stack traces
try {
  // Some code that might throw
} catch (error) {
  if (error instanceof Error) {
    logger.exception(error, 'Failed to process request');
  } else {
    logger.error('Unknown error occurred', { error: String(error) });
  }
}
```

## Best Practices

1. **Use Structured Logging**: Always include relevant metadata as a second parameter to provide context.
   ```typescript
   // Good
   logger.info('User logged in', { userId: 123, method: 'oauth' });
   
   // Avoid
   logger.info('User 123 logged in via oauth');
   ```

2. **Choose Appropriate Log Levels**:
   - `error`: Use for exceptions and critical failures
   - `warn`: Use for important issues that don't prevent functionality
   - `info`: Use for significant events and state changes
   - `debug`: Use for detailed information helpful during development

3. **Handle Errors Properly**:
   - Always check if an error is an instance of Error before using logger.exception
   - Provide meaningful error messages
   - Include relevant context in the metadata

4. **Be Concise But Informative**:
   - Keep log messages clear and to the point
   - Include all necessary context in the metadata
   - Avoid logging sensitive information (API keys, passwords, etc.)

5. **Log Lifecycle Events**:
   - Application startup and shutdown
   - Window creation and destruction
   - Service initialization
   - API calls and responses (without sensitive data)

## Implementation Details

The logging system is implemented in two main files:

- `src/shared/logger.ts`: Winston-based logger for the main process
- `src/shared/preload-logger.ts`: Custom lightweight logger for preload/renderer processes

These loggers provide a consistent interface while addressing the different constraints of each process type. 