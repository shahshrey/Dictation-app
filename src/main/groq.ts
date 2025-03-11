import { IpcMain } from 'electron';
import { Groq } from 'groq-sdk';
import * as fs from 'fs';

// Define constants for Groq API
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Initialize Groq client
let groqClient: Groq | null = null;

const initGroqClient = (): Groq => {
  if (!groqClient) {
    try {
      groqClient = new Groq({ apiKey: GROQ_API_KEY });
    } catch (error) {
      console.error('Failed to initialize Groq client:', error);
      throw new Error('Failed to initialize Groq client');
    }
  }
  return groqClient;
};

export const setupGroqAPI = (ipcMain: IpcMain): void => {
  // Transcribe audio file
  ipcMain.handle('transcribe-audio', async (_, filePath: string, options: { language?: string }) => {
    try {
      const client = initGroqClient();
      
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
      return { success: false, error: String(error) };
    }
  });
  
  // Translate audio file
  ipcMain.handle('translate-audio', async (_, filePath: string) => {
    try {
      const client = initGroqClient();
      
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
      return { success: false, error: String(error) };
    }
  });
}; 