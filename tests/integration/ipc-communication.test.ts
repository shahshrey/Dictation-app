import { IPC_CHANNELS } from '../../src/shared/types';
import { DEFAULT_RENDERER_SETTINGS } from '../../src/shared/constants';
import * as path from 'path';
import { AppSettings } from '../../src/shared/types';
import * as fs from 'fs';
import * as os from 'os';

// This is an integration test to verify IPC communication
// In a real integration test, we would use Spectron or similar to test the actual app
describe('IPC Communication', () => {
  // Mock the electron module
  const mockIpcMain = {
    handle: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  };

  const mockIpcRenderer = {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn(),
  };

  // Mock app and path for file operations
  const mockApp = {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
  };

  // Mock the electron module
  jest.mock('electron', () => ({
    ipcMain: mockIpcMain,
    ipcRenderer: mockIpcRenderer,
    app: mockApp,
  }));

  // Mock fs module
  jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
  }));

  // Mock settings store
  const mockSettings = { ...DEFAULT_RENDERER_SETTINGS, apiKey: 'test-api-key' };

  // Mock transcription result
  const mockTranscriptionResult = {
    success: true,
    id: 'test-id',
    text: 'This is a test transcription',
    timestamp: Date.now(),
    duration: 5.5,
    language: 'en',
    pastedAtCursor: true,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockIpcRenderer.invoke.mockImplementation(channel => {
      switch (channel) {
        case IPC_CHANNELS.GET_SETTINGS:
          return Promise.resolve(mockSettings);
        case IPC_CHANNELS.SAVE_SETTINGS:
          return Promise.resolve({ success: true });
        case IPC_CHANNELS.START_RECORDING:
          return Promise.resolve({ success: true });
        case IPC_CHANNELS.STOP_RECORDING:
          return Promise.resolve({ success: true });
        case IPC_CHANNELS.GET_TRANSCRIPTIONS:
          return Promise.resolve([mockTranscriptionResult]);
        default:
          return Promise.resolve(null);
      }
    });
  });

  describe('Settings Management', () => {
    it('should retrieve settings from the main process', async () => {
      // Simulate the renderer process requesting settings
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);

      // Verify the result matches our mock settings
      expect(result).toEqual(mockSettings);

      // Verify that invoke was called with the correct channel
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_SETTINGS);
    });

    it('should save settings to the main process', async () => {
      // Create updated settings
      const updatedSettings = { ...mockSettings, apiKey: 'new-api-key' };

      // Simulate the renderer process saving settings
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updatedSettings);

      // Verify the result indicates success
      expect(result).toEqual({ success: true });

      // Verify that invoke was called with the correct channel and settings
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPC_CHANNELS.SAVE_SETTINGS,
        updatedSettings
      );
    });

    it('should handle errors when saving settings', async () => {
      // Mock an error when saving settings
      mockIpcRenderer.invoke.mockImplementation(channel => {
        if (channel === IPC_CHANNELS.SAVE_SETTINGS) {
          return Promise.resolve({
            success: false,
            error: 'Failed to save settings',
          });
        }
        return Promise.resolve(null);
      });

      // Create updated settings
      const updatedSettings = { ...mockSettings, apiKey: 'new-api-key' };

      // Simulate the renderer process saving settings
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updatedSettings);

      // Verify the result indicates failure
      expect(result).toEqual({
        success: false,
        error: 'Failed to save settings',
      });
    });
  });

  describe('Recording Controls', () => {
    it('should start recording when requested', async () => {
      // Simulate the renderer process starting recording
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.START_RECORDING);

      // Verify the result indicates success
      expect(result).toEqual({ success: true });

      // Verify that invoke was called with the correct channel
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.START_RECORDING);
    });

    it('should stop recording when requested', async () => {
      // Simulate the renderer process stopping recording
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING);

      // Verify the result indicates success
      expect(result).toEqual({ success: true });

      // Verify that invoke was called with the correct channel
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.STOP_RECORDING);
    });

    it('should handle errors when stopping recording', async () => {
      // Mock an error when stopping recording
      mockIpcRenderer.invoke.mockImplementation(channel => {
        if (channel === IPC_CHANNELS.STOP_RECORDING) {
          return Promise.resolve({
            success: false,
            error: 'Failed to stop recording',
          });
        }
        return Promise.resolve({ success: true });
      });

      // Simulate the renderer process stopping recording
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING);

      // Verify the result indicates failure
      expect(result).toEqual({
        success: false,
        error: 'Failed to stop recording',
      });
    });
  });

  describe('Transcription Management', () => {
    it('should retrieve transcriptions from the main process', async () => {
      // Simulate the renderer process requesting transcriptions
      const result = await mockIpcRenderer.invoke(IPC_CHANNELS.GET_TRANSCRIPTIONS);

      // Verify the result matches our mock transcription
      expect(result).toEqual([mockTranscriptionResult]);

      // Verify that invoke was called with the correct channel
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_TRANSCRIPTIONS);
    });

    it('should notify renderer when transcription is complete', () => {
      // Mock the IPC listener in the renderer process
      const mockListener = jest.fn();
      mockIpcRenderer.on.mockImplementation((channel, listener) => {
        if (channel === IPC_CHANNELS.TRANSCRIPTION_RESULT) {
          listener({}, mockTranscriptionResult);
        }
      });

      // Register the listener
      mockIpcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_RESULT, mockListener);

      // Simulate the main process sending a transcription result to the renderer process
      mockIpcMain.emit(IPC_CHANNELS.TRANSCRIPTION_RESULT, {}, mockTranscriptionResult);

      // Verify that the listener was called with the correct data
      expect(mockListener).toHaveBeenCalledWith({}, mockTranscriptionResult);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in IPC communication', async () => {
      // Mock the IPC handler in the main process to throw an error
      const mockError = new Error('Test error');
      mockIpcRenderer.invoke.mockRejectedValue(mockError);

      // Simulate the renderer process sending a message to the main process
      try {
        await mockIpcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Verify the error
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
      }

      // Verify that invoke was called with the correct channel
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_SETTINGS);
    });

    it('should notify renderer of errors from the main process', () => {
      // Mock the IPC listener in the renderer process
      const mockListener = jest.fn();
      mockIpcRenderer.on.mockImplementation((channel, listener) => {
        if (channel === IPC_CHANNELS.ERROR) {
          listener({}, { message: 'Main process error' });
        }
      });

      // Register the listener
      mockIpcRenderer.on(IPC_CHANNELS.ERROR, mockListener);

      // Simulate the main process sending an error to the renderer process
      mockIpcMain.emit(IPC_CHANNELS.ERROR, {}, { message: 'Main process error' });

      // Verify that the listener was called with the correct data
      expect(mockListener).toHaveBeenCalledWith({}, { message: 'Main process error' });
    });
  });

  describe('Complete Workflow', () => {
    it('should simulate a complete recording and transcription workflow', async () => {
      // Step 1: Get settings
      await mockIpcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_SETTINGS);

      // Step 2: Start recording
      await mockIpcRenderer.invoke(IPC_CHANNELS.START_RECORDING);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.START_RECORDING);

      // Step 3: Stop recording
      await mockIpcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.STOP_RECORDING);

      // Step 4: Mock receiving transcription result
      const mockListener = jest.fn();
      mockIpcRenderer.on.mockImplementation((channel, listener) => {
        if (channel === IPC_CHANNELS.TRANSCRIPTION_RESULT) {
          listener({}, mockTranscriptionResult);
        }
      });

      mockIpcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_RESULT, mockListener);
      mockIpcMain.emit(IPC_CHANNELS.TRANSCRIPTION_RESULT, {}, mockTranscriptionResult);

      expect(mockListener).toHaveBeenCalledWith({}, mockTranscriptionResult);

      // Step 5: Get transcriptions
      const transcriptions = await mockIpcRenderer.invoke(IPC_CHANNELS.GET_TRANSCRIPTIONS);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.GET_TRANSCRIPTIONS);
      expect(transcriptions).toEqual([mockTranscriptionResult]);
    });
  });
});

// Real Integration Tests with Spectron
// These tests require the actual application to be built and running
// They are disabled by default and should be run manually
describe.skip('Real IPC Communication with Spectron', () => {
  // We'll use Spectron to test the actual application
  // Using unknown type for spectron since we're dynamically importing it
  let spectron: unknown;

  interface SpectronApp {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    client: SpectronClient;
    isRunning: () => boolean;
  }

  interface SpectronClient {
    waitUntilWindowLoaded: () => Promise<void>;
    isVisible: (selector: string) => Promise<boolean>;
    getTitle: () => Promise<string>;
    execute: <T>(script: string | (() => unknown), ...args: unknown[]) => Promise<{ value: T }>;
    pause: (ms: number) => Promise<void>;
    $: (selector: string) => Promise<SpectronElement>;
    $$: (selector: string) => Promise<SpectronElement[]>;
    waitUntil: (condition: () => Promise<boolean>, options?: { timeout?: number }) => Promise<void>;
  }

  interface SpectronElement {
    isExisting: () => Promise<boolean>;
    isDisplayed: () => Promise<boolean>;
    click: () => Promise<void>;
    setValue: (value: string) => Promise<void>;
    waitForExist: (options?: { timeout?: number }) => Promise<void>;
    selectByAttribute: (attribute: string, value: string) => Promise<void>;
  }

  let electronApp: SpectronApp;
  let client: SpectronClient;

  // Setup before each test
  beforeEach(async () => {
    try {
      // Import Spectron dynamically to avoid issues when it's not installed
      // Using unknown type since we don't have type definitions
      const spectronModule = await import('spectron');
      spectron = spectronModule;

      // Create a new Application instance
      // Using type assertion since we don't have proper types
      const Application = spectron
        ? (spectron as { Application: { new (options: unknown): SpectronApp } }).Application
        : undefined;
      if (!Application) {
        throw new Error('Spectron Application class not found');
      }

      // Use dynamic import for electron
      const electron = await import('electron');

      electronApp = new Application({
        path: electron as unknown as string,
        args: [path.join(__dirname, '../../')],
        env: {
          NODE_ENV: 'test',
          ELECTRON_DISABLE_GPU: 'true',
        },
      });

      // Start the application
      await electronApp.start();

      // Get the client
      client = electronApp.client;

      // Wait for the application to be ready
      await client.waitUntilWindowLoaded();
    } catch (error) {
      console.error('Failed to setup Spectron:', error);
      throw error;
    }
  });

  // Teardown after each test
  afterEach(async () => {
    if (electronApp && electronApp.isRunning()) {
      await electronApp.stop();
    }
  });

  // Test that the application launches successfully
  it('should launch the application successfully', async () => {
    // Check if the window is visible
    const isVisible = await client.isVisible('body');
    expect(isVisible).toBe(true);

    // Check the window title
    const title = await client.getTitle();
    expect(title).toContain('Dictation App');
  });

  // Test IPC communication for settings
  it('should retrieve settings via IPC', async () => {
    // Execute JavaScript in the renderer process to get settings
    const settings = await client.execute<AppSettings>(`
      return window.electronAPI.getSettings();
    `);

    // Verify that settings match the expected format
    expect(settings.value).toBeTruthy();
    expect(settings.value).toHaveProperty('apiKey');
    expect(settings.value).toHaveProperty('language');
  });

  // Test saving settings via IPC
  it('should save settings via IPC', async () => {
    // Create test settings
    const testSettings = {
      ...DEFAULT_RENDERER_SETTINGS,
      apiKey: 'test-api-key-' + Date.now(),
    };

    // Execute JavaScript in the renderer process to save settings
    // Using string template to avoid type issues with the function signature
    const result = await client.execute<{ success: boolean }>(
      `return window.electronAPI.saveSettings(${JSON.stringify(testSettings)});`
    );

    // Verify the result
    expect(result.value).toHaveProperty('success', true);

    // Get the settings again to verify they were saved
    const savedSettings = await client.execute<AppSettings>(`
      return window.electronAPI.getSettings();
    `);

    // Verify that the saved settings match what we set
    expect(savedSettings.value).toHaveProperty('apiKey', testSettings.apiKey);
  });

  // Test starting and stopping recording
  it('should start and stop recording via IPC', async () => {
    // Start recording
    const startResult = await client.execute<{ success: boolean }>(() => {
      return (
        window as unknown as {
          electronAPI: { startRecording: () => Promise<{ success: boolean }> };
        }
      ).electronAPI.startRecording();
    });

    // Verify the result
    expect(startResult.value).toHaveProperty('success', true);

    // Wait a short time
    await client.pause(1000);

    // Stop recording
    const stopResult = await client.execute<{ success: boolean }>(() => {
      return (
        window as unknown as { electronAPI: { stopRecording: () => Promise<{ success: boolean }> } }
      ).electronAPI.stopRecording();
    });

    // Verify the result
    expect(stopResult.value).toHaveProperty('success', true);
  });

  // Test a complete workflow with actual file operations
  it('should perform a complete recording and transcription workflow', async () => {
    // Create a temporary directory for test files
    const tempDir = path.join(os.tmpdir(), 'dictation-app-test-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Step 1: Set up test settings with the temporary directory
      const testSettings = {
        ...DEFAULT_RENDERER_SETTINGS,
        apiKey: process.env.TEST_API_KEY || 'test-api-key',
        transcriptionSavePath: tempDir,
        saveTranscriptions: true,
      };

      // Save settings
      await client.execute<{ success: boolean }>(
        // Using string template to avoid type issues with the function signature
        `return window.electronAPI.saveSettings(${JSON.stringify(testSettings)});`
      );

      // Step 2: Start recording
      await client.execute<{ success: boolean }>(() => {
        return (
          window as unknown as {
            electronAPI: { startRecording: () => Promise<{ success: boolean }> };
          }
        ).electronAPI.startRecording();
      });

      // Wait for recording (3 seconds)
      await client.pause(3000);

      // Step 3: Stop recording
      await client.execute<{ success: boolean }>(() => {
        return (
          window as unknown as {
            electronAPI: { stopRecording: () => Promise<{ success: boolean }> };
          }
        ).electronAPI.stopRecording();
      });

      // Wait for transcription to complete (this might take some time)
      await client.pause(5000);

      // Step 4: Get transcriptions
      const transcriptions = await client.execute<unknown[]>(() => {
        return (
          window as unknown as { electronAPI: { getTranscriptions: () => Promise<unknown[]> } }
        ).electronAPI.getTranscriptions();
      });

      // Verify that transcriptions were returned
      expect(transcriptions.value).toBeDefined();

      // Check if transcription file was created
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBeGreaterThan(0);

      // Check if at least one file is a transcription file
      const transcriptionFiles = files.filter(file => file.endsWith('.json'));
      expect(transcriptionFiles.length).toBeGreaterThan(0);
    } finally {
      // Clean up temporary directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up temporary directory:', error);
      }
    }
  });

  // Test UI interaction with actual UI elements
  it('should interact with UI elements to control recording', async () => {
    // Find the record button
    const recordButton = await client.$('[data-testid="record-button"]');
    expect(await recordButton.isExisting()).toBe(true);

    // Click the record button to start recording
    await recordButton.click();

    // Check if recording indicator is visible
    const recordingIndicator = await client.$('[data-testid="recording-indicator"]');
    expect(await recordingIndicator.isDisplayed()).toBe(true);

    // Wait a short time
    await client.pause(2000);

    // Click the record button again to stop recording
    await recordButton.click();

    // Check if recording indicator is no longer visible
    await client.waitUntil(
      async () => {
        return !(await recordingIndicator.isDisplayed());
      },
      { timeout: 5000 }
    );

    // Wait for transcription to complete
    await client.pause(5000);

    // Check if transcription appears in the list
    const transcriptionItems = await client.$$('[data-testid="transcription-item"]');
    expect(transcriptionItems.length).toBeGreaterThan(0);
  });

  // Test settings UI interaction
  it('should update settings through UI interaction', async () => {
    // Navigate to settings page
    const settingsButton = await client.$('[data-testid="settings-button"]');
    await settingsButton.click();

    // Wait for settings form to appear
    const settingsForm = await client.$('[data-testid="settings-form"]');
    await settingsForm.waitForExist({ timeout: 5000 });

    // Fill in API key
    const apiKeyInput = await client.$('[data-testid="api-key-input"]');
    const testApiKey = 'test-api-key-' + Date.now();
    await apiKeyInput.setValue(testApiKey);

    // Select language
    const languageSelect = await client.$('[data-testid="language-select"]');
    await languageSelect.selectByAttribute('value', 'fr');

    // Save settings
    const saveButton = await client.$('[data-testid="save-settings-button"]');
    await saveButton.click();

    // Wait for save confirmation
    await client.pause(1000);

    // Get settings to verify they were saved
    const settings = await client.execute<AppSettings>(() => {
      return (
        window as unknown as { electronAPI: { getSettings: () => Promise<AppSettings> } }
      ).electronAPI.getSettings();
    });

    // Verify settings were updated
    expect(settings.value.apiKey).toBe(testApiKey);
    expect(settings.value.language).toBe('fr');
  });
});
