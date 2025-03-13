# Integration Tests for Dictation App

This directory contains integration tests for the Dictation App, focusing on testing the actual functionality of the application rather than just mocking components.

## Test Files

- `ipc-communication.test.ts`: Tests IPC communication between main and renderer processes using mocks
- `app.mock.test.ts`: Mock tests for UI interactions, visual testing, performance testing, and accessibility testing

## Test Types

The tests cover several aspects of the application:

1. **IPC Communication Tests**: Verify that the main and renderer processes can communicate correctly
2. **UI Interaction Tests**: Test interactions with UI elements like buttons and forms
3. **Visual Testing**: Verify the visual appearance of the application using snapshots
4. **Performance Testing**: Measure the performance of operations like recording and transcription
5. **Accessibility Testing**: Verify the accessibility of the application

## Running the Tests

### Prerequisites

- Node.js 14+
- pnpm installed
- Electron application built

### Install Dependencies

```bash
pnpm install
```

### Run Integration Tests

These tests use mocks and don't require the actual application to be running:

```bash
pnpm test:integration
```

### Run Specific Test Types

The package.json includes several specialized test scripts:

```bash
# Run all tests (unit and integration)
pnpm test:all

# Run only unit tests
pnpm test:unit

# Run only mock integration tests
pnpm test:integration:mock

# Run only Spectron tests (after enabling them)
pnpm test:integration:spectron

# Run Playwright tests with UI
pnpm test:e2e:ui

# Run Playwright tests in debug mode
pnpm test:e2e:debug
```

### Run Spectron Tests

The Spectron tests are skipped by default because they require the actual application to be built and running. We've added helper scripts to make it easier to enable and run these tests:

1. Enable the Spectron tests:

```bash
node scripts/prepare-spectron-tests.js
```

This script will:

- Check if the application is built
- Create a backup of the test file
- Remove the `.skip` from the test suite
- Provide instructions for running the tests

2. Run the Spectron tests:

```bash
pnpm test:integration:spectron
```

3. Restore the original test file (to skip the tests again):

```bash
node scripts/restore-spectron-tests.js
```

## Test Coverage

The tests cover:

- Settings management (retrieving and saving settings)
- Recording controls (starting and stopping recording)
- Transcription management (retrieving and displaying transcriptions)
- Error handling
- Complete workflow (recording, transcribing, and displaying results)
- UI interactions
- Visual appearance
- Performance metrics
- Accessibility features

## Notes on Test Implementation

### IPC Communication Tests

The `ipc-communication.test.ts` file contains two types of tests:

1. **Mock Tests**: These tests use Jest mocks to simulate IPC communication between the main and renderer processes. They're useful for quick feedback but don't test the actual application.

2. **Spectron Tests**: These tests use Spectron to test the actual application, including UI interactions and file operations. They're skipped by default but can be enabled using the helper scripts.

### UI Interaction Tests

The `app.mock.test.ts` file contains mock tests for UI interactions, visual testing, performance testing, and accessibility testing. These tests use Jest mocks to simulate the DOM and IPC communication.

### Playwright Tests

The Playwright tests are currently disabled due to compatibility issues with Jest. To run Playwright tests, you would need to use the Playwright test runner directly:

```bash
pnpm test:e2e
```

However, this is currently not working due to compatibility issues. Instead, we're using mock tests to simulate the functionality.

## Helper Scripts

The project includes helper scripts to make testing easier:

- `scripts/prepare-spectron-tests.js`: Enables Spectron tests by removing the `.skip` from the test suite
- `scripts/restore-spectron-tests.js`: Restores the original test file (with tests skipped)

These scripts include:

- Automatic backup creation
- Application build verification
- Colorful console output
- Clear instructions for next steps

## Future Improvements

- Fix Playwright tests to work with Jest
- Add more visual regression tests
- Implement performance benchmarks
- Add more accessibility tests
- Add tests for keyboard shortcuts
- Add tests for different platforms (Windows, macOS, Linux)
- Add continuous integration support for automated testing
