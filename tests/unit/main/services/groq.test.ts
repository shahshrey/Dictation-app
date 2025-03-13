import { IpcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Groq } from 'groq-sdk';
import { setupGroqAPI } from '../../../../src/main/services/groq';

// Mock the required modules
jest.mock('fs');
jest.mock('path');
jest.mock('groq-sdk');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/userData'),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    _events: {},
  },
}));

// Create a more realistic mock for Date.now() to make tests deterministic
const MOCK_TIMESTAMP = 1647270000000; // Fixed timestamp for testing
global.Date.now = jest.fn().mockReturnValue(MOCK_TIMESTAMP);

describe('Groq Service', () => {
  let mockIpcMain: {
    handle: jest.Mock;
    on: jest.Mock;
    _events?: Record<string, unknown>;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock IpcMain
    mockIpcMain = {
      handle: jest.fn(),
      on: jest.fn(),
      _events: {},
    };

    // Setup the Groq API service
    setupGroqAPI(mockIpcMain as unknown as IpcMain);
  });

  describe('setupGroqAPI', () => {
    it('should register IPC handlers for Groq API', () => {
      // Verify that the IPC handlers are registered
      expect(mockIpcMain.handle).toHaveBeenCalledWith('transcribe-audio', expect.any(Function));

      expect(mockIpcMain.handle).toHaveBeenCalledWith('translate-audio', expect.any(Function));

      expect(mockIpcMain.handle).toHaveBeenCalledWith('transcribe-recording', expect.any(Function));
    });

    it('should transcribe audio file with correct parameters', async () => {
      // Mock the Groq client for this test
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue({ text: 'Mock transcription text' }),
          },
          translations: {
            create: jest.fn(),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'transcribe-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/audio.wav';
      const mockOptions = { language: 'en', apiKey: 'test-api-key' };

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock createReadStream to return a specific value we can check
      const mockReadStream = { path: mockFilePath, mock: true };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify that the file existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);

      // Verify that a read stream was created with the correct path
      expect(fs.createReadStream).toHaveBeenCalledWith(mockFilePath);

      // Verify that the transcription API was called with the correct parameters
      expect(mockGroqInstance.audio.transcriptions.create).toHaveBeenCalledWith({
        file: mockReadStream,
        model: 'whisper-1',
        language: 'en',
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        text: 'Mock transcription text',
        language: 'en',
      });
    });

    it('should handle file not found error during transcription', async () => {
      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'transcribe-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/nonexistent.wav';
      const mockOptions = { language: 'en', apiKey: 'test-api-key' };

      // Mock fs.existsSync to return false
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify that the file existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'Audio file not found',
      });
    });

    it('should translate audio file with correct parameters', async () => {
      // Mock the Groq client for this test
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn(),
          },
          translations: {
            create: jest.fn().mockResolvedValue({ text: 'Mock translation text' }),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'translate-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/audio.wav';
      const mockOptions = { apiKey: 'test-api-key' };

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock createReadStream to return a specific value we can check
      const mockReadStream = { path: mockFilePath, mock: true };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify that the file existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);

      // Verify that a read stream was created with the correct path
      expect(fs.createReadStream).toHaveBeenCalledWith(mockFilePath);

      // Verify that the translation API was called with the correct parameters
      expect(mockGroqInstance.audio.translations.create).toHaveBeenCalledWith({
        file: mockReadStream,
        model: 'whisper-1',
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        text: 'Mock translation text',
      });
    });

    it('should handle file not found error during translation', async () => {
      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'translate-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/nonexistent.wav';
      const mockOptions = { apiKey: 'test-api-key' };

      // Mock fs.existsSync to return false
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify that the file existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'Audio file not found',
      });
    });

    it('should handle API errors during transcription', async () => {
      // Mock the Groq client for this test with a rejected promise
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
          translations: {
            create: jest.fn(),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'transcribe-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/audio.wav';
      const mockOptions = { language: 'en', apiKey: 'test-api-key' };

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'API error',
      });
    });

    it('should handle API errors during translation', async () => {
      // Mock the Groq client for this test with a rejected promise
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn(),
          },
          translations: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'translate-audio')[1];

      // Mock file path and options
      const mockFilePath = '/path/to/audio.wav';
      const mockOptions = { apiKey: 'test-api-key' };

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'API error',
      });
    });

    it('should handle missing API key during transcription', async () => {
      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(call => call[0] === 'transcribe-audio')[1];

      // Mock file path and options with missing API key
      const mockFilePath = '/path/to/audio.wav';
      const mockOptions = { language: 'en' };

      // Call the handler
      const result = await handler({}, mockFilePath, mockOptions);

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize Groq client');
    });

    it('should transcribe the most recent recording with correct parameters', async () => {
      // Mock the Groq client for this test
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue({ text: 'Mock transcription text' }),
          },
          translations: {
            create: jest.fn(),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'transcribe-recording'
      )[1];

      // Mock app.getPath
      (app.getPath as jest.Mock).mockReturnValue('/mock/userData');

      // Mock path.join to return a predictable path
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.readdirSync to return some files
      (fs.readdirSync as jest.Mock).mockReturnValue(['recording1.wav', 'recording2.wav']);

      // Mock fs.statSync to return file stats with different mtimes to test sorting
      (fs.statSync as jest.Mock).mockImplementation(filePath => {
        if (filePath === '/mock/userData/recordings/recording1.wav') {
          return {
            mtime: new Date('2023-01-02'), // newer
            birthtime: new Date('2023-01-01'),
          };
        } else {
          return {
            mtime: new Date('2023-01-01'), // older
            birthtime: new Date('2023-01-01'),
          };
        }
      });

      // Mock createReadStream to return a specific value we can check
      const mockReadStream = { path: '/mock/userData/recordings/recording1.wav', mock: true };
      (fs.createReadStream as jest.Mock).mockReturnValue(mockReadStream);

      // Call the handler
      const result = await handler({}, 'en', 'test-api-key');

      // Verify that the recordings directory path was constructed correctly
      expect(path.join).toHaveBeenCalledWith('/mock/userData', 'recordings');

      // Verify that the directory existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/userData/recordings');

      // Verify that the directory was read
      expect(fs.readdirSync).toHaveBeenCalledWith('/mock/userData/recordings');

      // Verify that the file stats were checked for both files
      expect(fs.statSync).toHaveBeenCalledWith('/mock/userData/recordings/recording1.wav');
      expect(fs.statSync).toHaveBeenCalledWith('/mock/userData/recordings/recording2.wav');

      // Verify that a read stream was created for the most recent file
      expect(fs.createReadStream).toHaveBeenCalledWith('/mock/userData/recordings/recording1.wav');

      // Verify that the transcription API was called with the correct parameters
      expect(mockGroqInstance.audio.transcriptions.create).toHaveBeenCalledWith({
        file: mockReadStream,
        model: 'whisper-1',
        language: 'en',
      });

      // Verify the result
      expect(result).toEqual({
        success: true,
        id: `transcription-${MOCK_TIMESTAMP}`,
        text: 'Mock transcription text',
        timestamp: MOCK_TIMESTAMP,
        duration: 86400, // 1 day in seconds (Jan 2 - Jan 1)
        language: 'en',
      });
    });

    it('should handle no recordings found', async () => {
      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'transcribe-recording'
      )[1];

      // Mock app.getPath
      (app.getPath as jest.Mock).mockReturnValue('/mock/userData');

      // Mock path.join to return a predictable path
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.readdirSync to return empty array
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      // Call the handler
      const result = await handler({}, 'en', 'test-api-key');

      // Verify that the directory was read
      expect(fs.readdirSync).toHaveBeenCalledWith('/mock/userData/recordings');

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'No recordings found',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      });
    });

    it('should handle recordings directory not found and create it', async () => {
      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'transcribe-recording'
      )[1];

      // Mock app.getPath
      (app.getPath as jest.Mock).mockReturnValue('/mock/userData');

      // Mock path.join to return a predictable path
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      // Mock fs.existsSync to return false for the recordings directory
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Mock fs.mkdirSync
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      // Call the handler
      const result = await handler({}, 'en', 'test-api-key');

      // Verify that the directory existence was checked
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/userData/recordings');

      // Verify that the directory was created
      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/userData/recordings', { recursive: true });

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'No recordings found. The recordings directory has been created.',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      });
    });

    it('should handle API errors during recording transcription', async () => {
      // Mock the Groq client for this test with a rejected promise
      const mockGroqInstance = {
        audio: {
          transcriptions: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
          translations: {
            create: jest.fn(),
          },
        },
      };
      (Groq as jest.Mock).mockReturnValue(mockGroqInstance);

      // Get the handler function
      const handler = mockIpcMain.handle.mock.calls.find(
        call => call[0] === 'transcribe-recording'
      )[1];

      // Mock app.getPath
      (app.getPath as jest.Mock).mockReturnValue('/mock/userData');

      // Mock path.join to return a predictable path
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.readdirSync to return some files
      (fs.readdirSync as jest.Mock).mockReturnValue(['recording1.wav']);

      // Mock fs.statSync to return file stats
      (fs.statSync as jest.Mock).mockReturnValue({
        mtime: new Date('2023-01-02'),
        birthtime: new Date('2023-01-01'),
      });

      // Call the handler
      const result = await handler({}, 'en', 'test-api-key');

      // Verify the result
      expect(result).toEqual({
        success: false,
        error: 'API error',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      });
    });
  });
});
