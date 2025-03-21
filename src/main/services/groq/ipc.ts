import { IpcMain } from 'electron';
import logger from '../../../shared/logger';
import { handleTranscribeAudio } from './transcription';
import { handleTranslateAudio } from './translation';
import { transcribeRecording } from './transcription';
import { TranscribeOptions, TranslateOptions } from './types';

/**
 * Setup Groq API handlers for IPC communication
 */
export const setupGroqAPI = (ipcMain: IpcMain): void => {
  try {
    // Transcribe audio file
    ipcMain.handle('transcribe-audio', async (_, filePath: string, options: TranscribeOptions) => {
      return await handleTranscribeAudio(filePath, options);
    });

    // Translate audio file
    ipcMain.handle('translate-audio', async (_, filePath: string, options: TranslateOptions) => {
      return await handleTranslateAudio(filePath, options);
    });

    // Transcribe the most recent recording
    ipcMain.handle('transcribe-recording', async (_, language: string, apiKey: string) => {
      return await transcribeRecording(language, apiKey);
    });
  } catch (error) {
    logger.error('Error setting up Groq API handlers:', {
      error: (error as Error).message,
    });
  }
};
