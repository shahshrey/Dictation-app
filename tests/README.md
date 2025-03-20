# Tests for Voice Vibe

This directory contains tests for the Voice Vibe.

## Structure

- `unit/` - Unit tests for individual components and services
  - `main/` - Tests for main process code
    - `services/` - Tests for main process services
  - `shared/` - Tests for shared code between main and renderer processes
- `integration/` - Integration tests for testing application functionality
  - `app.mock.test.ts` - Mock tests for UI interactions, visual testing, performance, and accessibility
  - `ipc-communication.test.ts` - Tests for IPC communication between main and renderer processes

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests (unit and integration)
pnpm test:all

# Run only unit tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run only integration tests
pnpm test:integration

# Run only mock integration tests
pnpm test:integration:mock

# Run only Spectron tests (after enabling them)
pnpm test:integration:spectron

# Run end-to-end tests with Playwright
pnpm test:e2e

# Run Playwright tests with UI
pnpm test:e2e:ui

# Run Playwright tests in debug mode
pnpm test:e2e:debug
```

## Helper Scripts

The project includes helper scripts to make testing easier:

- `scripts/prepare-spectron-tests.js`: Enables Spectron tests by removing the `.skip` from the test suite
- `scripts/restore-spectron-tests.js`: Restores the original test file (with tests skipped)

To use these scripts:

```bash
# Enable Spectron tests
node scripts/prepare-spectron-tests.js

# Restore original test file (skip tests)
node scripts/restore-spectron-tests.js
```

## Test Coverage

The test coverage report will be generated in the `coverage/` directory at the root of the project.

## Writing Tests

When writing tests, follow these guidelines:

1. Create test files with the `.test.ts` extension
2. Place tests in the appropriate directory based on the code being tested
3. Use descriptive test names that explain what is being tested
4. Use the Jest testing framework and its assertion methods
5. Mock external dependencies using Jest's mocking capabilities
6. Test both success and error cases

## Mocking

The tests use Jest's mocking capabilities to mock external dependencies:

- `electron` - Mocked using `electron-mock-ipc`
- `fs` - Mocked to avoid actual file system operations
- `path` - Mocked for consistent path handling
- `groq-sdk` - Mocked to avoid actual API calls

See `tests/setup.js` for the mock implementations.

## Integration Tests

For more details about the integration tests, see the [Integration Tests README](integration/README.md).
