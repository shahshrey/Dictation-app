import { IpcMain, app } from 'electron';
import { Groq } from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '../../shared/logger';

// Get the logger instance
const logger = getLogger('main');

// Initialize Groq client
let groqClient: Groq | null = null;

/**
 * Initialize the Groq client with the API key from settings
 * @param apiKey The Groq API key
 * @returns Groq client instance
 */
const initGroqClient = (apiKey: string): Groq => {
  try {
    if (!apiKey) {
      throw new Error('Groq API key not provided');
    }
    
    // Create a new client if it doesn't exist or if the API key has changed
    if (!groqClient || (groqClient as any)._options.apiKey !== apiKey) {
      groqClient = new Groq({ apiKey });
      logger.info('Groq client initialized with new API key');
    }
    
    return groqClient;
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Failed to initialize Groq client');
    } else {
      logger.error('Failed to initialize Groq client', { error: String(error) });
    }
    throw new Error('Failed to initialize Groq client');
  }
};

/**
 * Setup Groq API handlers for IPC communication
 * @param ipcMain Electron IPC main instance
 */
export const setupGroqAPI = (ipcMain: IpcMain): void => {
  logger.info('Setting up Groq API handlers');
  
  // Check if ipcMain is valid
  logger.debug('ipcMain validation', {
    objectType: typeof ipcMain,
    handleMethodAvailable: typeof ipcMain.handle === 'function'
  });
  
  // Transcribe audio file
  logger.debug('Registering transcribe-audio handler');
  ipcMain.handle('transcribe-audio', async (_, filePath: string, options: { language?: string, apiKey?: string }) => {
    logger.debug('transcribe-audio handler called', { 
      filePath, 
      language: options.language,
      apiKeyProvided: !!options.apiKey
    });
    
    try {
      const apiKey = options.apiKey || '';
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        logger.warn('Audio file not found', { filePath });
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      logger.info('Transcribing audio file', { 
        filePath, 
        language: options.language || 'auto' 
      });
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language,
      });
      
      logger.info('Audio transcription successful', { 
        textLength: transcription.text.length,
        language: options.language || 'auto'
      });
      
      return { 
        success: true, 
        text: transcription.text,
        language: options.language || 'auto'
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to transcribe audio');
      } else {
        logger.error('Failed to transcribe audio', { error: String(error) });
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Translate audio file
  logger.debug('Registering translate-audio handler');
  ipcMain.handle('translate-audio', async (_, filePath: string, options: { apiKey?: string }) => {
    logger.debug('translate-audio handler called', { 
      filePath,
      apiKeyProvided: !!options.apiKey
    });
    
    try {
      const apiKey = options.apiKey || '';
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        logger.warn('Audio file not found', { filePath });
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      logger.info('Translating audio file', { filePath });
      
      const translation = await client.audio.translations.create({
        file: audioFile,
        model: 'whisper-1',
      });
      
      logger.info('Audio translation successful', { textLength: translation.text.length });
      
      return { 
        success: true, 
        text: translation.text 
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to translate audio');
      } else {
        logger.error('Failed to translate audio', { error: String(error) });
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Transcribe the most recent recording
  logger.debug('Registering transcribe-recording handler');
  try {
    ipcMain.handle('transcribe-recording', async (_, language: string, apiKey: string) => {
      logger.debug('transcribe-recording handler called', { 
        language,
        apiKeyProvided: !!apiKey
      });
      
      try {
        const client = initGroqClient(apiKey);
        
        // Get the path to the most recent recording
        const recordingsDir = path.join(app.getPath('userData'), 'recordings');
        
        // Ensure the recordings directory exists
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
          logger.warn('No recordings found, created recordings directory', { recordingsDir });
          return { 
            success: false, 
            error: 'No recordings found. The recordings directory has been created.',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        // Find the most recent recording file
        const files = fs.readdirSync(recordingsDir)
          .filter(file => file.endsWith('.webm') || file.endsWith('.wav'))
          .map(file => ({
            name: file,
            path: path.join(recordingsDir, file),
            mtime: fs.statSync(path.join(recordingsDir, file)).mtime
          }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        if (files.length === 0) {
          logger.warn('No recordings found in directory', { recordingsDir });
          return { 
            success: false, 
            error: 'No recordings found',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        const mostRecentFile = files[0].path;
        logger.debug('Found most recent recording file', { 
          filePath: mostRecentFile,
          fileName: files[0].name
        });
        
        if (!fs.existsSync(mostRecentFile)) {
          logger.warn('Recording file not found', { filePath: mostRecentFile });
          return { 
            success: false, 
            error: 'Recording file not found',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        const audioFile = fs.createReadStream(mostRecentFile);
        const fileStats = fs.statSync(mostRecentFile);
        
        logger.info('Transcribing recording', { 
          filePath: mostRecentFile,
          fileSize: fileStats.size,
          language: language || 'auto'
        });
        
        const transcription = await client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language,
        });
        
        // Generate a unique ID for the transcription
        const id = `transcription-${Date.now()}`;
        const timestamp = Date.now();
        const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);
        
        logger.info('Recording transcription successful', { 
          id,
          textLength: transcription.text.length,
          duration
        });
        
        return { 
          success: true,
          id,
          text: transcription.text,
          timestamp,
          duration,
          language
        };
      } catch (error) {
        if (error instanceof Error) {
          logger.exception(error, 'Failed to transcribe recording');
        } else {
          logger.error('Failed to transcribe recording', { error: String(error) });
        }
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          id: '',
          text: '',
          timestamp: 0,
          duration: 0
        };
      }
    });
    logger.info('transcribe-recording handler registered successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Error registering transcribe-recording handler');
    } else {
      logger.error('Error registering transcribe-recording handler', { error: String(error) });
    }
  }
  
  // Log all registered IPC handlers for debugging
  const registeredChannels = (ipcMain as any)._events ? Object.keys((ipcMain as any)._events) : [];
  logger.debug('Groq API handlers registered', { registeredChannels });
}; 