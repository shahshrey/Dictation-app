import { IpcMain, app } from 'electron';
import { Groq } from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';

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
    }
    
    return groqClient;
  } catch (error) {
    console.error('Failed to initialize Groq client:', error);
    throw new Error('Failed to initialize Groq client');
  }
};

/**
 * Setup Groq API handlers for IPC communication
 * @param ipcMain Electron IPC main instance
 */
export const setupGroqAPI = (ipcMain: IpcMain): void => {
  // Transcribe audio file
  ipcMain.handle('transcribe-audio', async (_, filePath: string, options: { language?: string, apiKey?: string }) => {
    try {
      const apiKey = options.apiKey || '';
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language,
      });
      
      return { 
        success: true, 
        text: transcription.text,
        language: options.language || 'auto'
      };
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Translate audio file
  ipcMain.handle('translate-audio', async (_, filePath: string, options: { apiKey?: string }) => {
    try {
      const apiKey = options.apiKey || '';
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      const translation = await client.audio.translations.create({
        file: audioFile,
        model: 'whisper-1',
      });
      
      return { 
        success: true, 
        text: translation.text 
      };
    } catch (error) {
      console.error('Failed to translate audio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Transcribe the most recent recording
  ipcMain.handle('transcribe-recording', async (_, language: string, apiKey: string) => {
    try {
      const client = initGroqClient(apiKey);
      
      // Get the path to the most recent recording
      const recordingsDir = path.join(app.getPath('userData'), 'recordings');
      
      // Ensure the recordings directory exists
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
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
      
      if (!fs.existsSync(mostRecentFile)) {
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
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language,
      });
      
      // Generate a unique ID for the transcription
      const id = `transcription-${Date.now()}`;
      const timestamp = Date.now();
      const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);
      
      return { 
        success: true,
        id,
        text: transcription.text,
        timestamp,
        duration,
        language
      };
    } catch (error) {
      console.error('Failed to transcribe recording:', error);
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
}; 