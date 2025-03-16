import { useState } from 'react';
import { Transcription, AppSettings } from '../../shared/types';
import { logger } from '../utils/logger';

// Define the expected response types
interface TranscriptionResult {
  success: boolean;
  id: string;
  text: string;
  timestamp: number;
  duration: number;
  language?: string;
  error?: string;
  wordCount?: number;
  confidence?: number;
  pastedAtCursor?: boolean;
}

interface GetRecentTranscriptionsResult {
  success: boolean;
  files?: Array<{ name: string; path: string; size: number; createdAt: Date; modifiedAt: Date }>;
  transcriptions?: Transcription[];
  error?: string;
}

interface GetTranscriptionResult {
  success: boolean;
  transcription?: Transcription;
  error?: string;
}

interface DeleteTranscriptionResult {
  success: boolean;
  error?: string;
}

// Extend the ElectronAPI interface
declare global {
  interface ElectronAPI {
    getTranscription: (id: string) => Promise<GetTranscriptionResult>;
    deleteTranscription: (id: string) => Promise<DeleteTranscriptionResult>;
    getRecentTranscriptions: () => Promise<GetRecentTranscriptionsResult>;
    getTranscriptions: () => Promise<Transcription[]>;
    saveTranscription: (
      transcription: Transcription,
      options?: { filename?: string; format?: string }
    ) => Promise<{ success: boolean; filePath?: string; jsonSaved?: boolean; error?: string }>;
    saveTranscriptionAs: (
      transcription: Transcription
    ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
    transcribeRecording: (language: string, apiKey: string) => Promise<TranscriptionResult>;
  }
}

export const useTranscriptions = (settings: AppSettings) => {
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);

  // Helper functions to reduce cognitive complexity
  const processTranscriptionsResult = (transcriptions: Transcription[]): void => {
    if (Array.isArray(transcriptions) && transcriptions.length > 0) {
      // Calculate word count for any transcriptions that don't have it
      const processedTranscriptions = transcriptions.map(transcription => {
        if (transcription.wordCount === undefined) {
          return {
            ...transcription,
            wordCount: transcription.text.split(/\s+/).length,
          };
        }
        return transcription;
      });

      setRecentTranscriptions(processedTranscriptions);
    } else {
      setRecentTranscriptions([]);
    }
  };

  const convertFilesToTranscriptions = (
    files: Array<{ name: string; modifiedAt?: Date; createdAt?: Date }>
  ): Transcription[] => {
    return files.map(file => {
      // Extract timestamp logic to avoid nested ternary
      let timestamp: number;
      if (file.modifiedAt instanceof Date) {
        timestamp = file.modifiedAt.getTime();
      } else if (file.createdAt instanceof Date) {
        timestamp = file.createdAt.getTime();
      } else {
        timestamp = Date.now();
      }

      return {
        id: file.name.replace(/\.txt$/, ''),
        text: '', // We don't have the content here
        timestamp,
        duration: 0,
        language: 'en',
        wordCount: 0, // Default word count
        source: 'file', // Mark source as file
      };
    });
  };

  const fetchTranscriptionsWithPrimaryMethod = async (): Promise<boolean> => {
    if (!(window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function')) {
      return false;
    }

    logger.info('Calling getTranscriptions IPC method...');
    try {
      const transcriptions = await window.electronAPI.getTranscriptions();

      // Only update if we actually got transcriptions
      if (Array.isArray(transcriptions) && transcriptions.length > 0) {
        processTranscriptionsResult(transcriptions);
        return true;
      }
      return false;
    } catch (error) {
      logger.exception('Failed to get recent transcriptions', error);
      return false;
    }
  };

  const fetchTranscriptionsWithFallbackMethod = async (): Promise<boolean> => {
    if (!(window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function')) {
      return false;
    }

    logger.info('Falling back to getRecentTranscriptions IPC method...');
    try {
      const result = await window.electronAPI.getRecentTranscriptions();
      logger.debug(`Recent transcriptions result: ${JSON.stringify(result, null, 2)}`);

      if (result && result.success) {
        // Check if we have transcriptions in the result
        if (result.transcriptions && Array.isArray(result.transcriptions)) {
          processTranscriptionsResult(result.transcriptions);
          return true;
        }
        // Fall back to files if no transcriptions
        else if (Array.isArray(result.files)) {
          // Convert file objects to transcription objects
          const transcriptions = convertFilesToTranscriptions(result.files);
          setRecentTranscriptions(transcriptions);
          return true;
        }
      }

      logger.warn(
        `getRecentTranscriptions returned invalid data: ${JSON.stringify(result, null, 2)}`
      );
      setRecentTranscriptions([]);
      return true;
    } catch (error) {
      logger.exception('Failed to get recent transcriptions (fallback)', error);
      return false;
    }
  };

  // Refresh recent transcriptions
  const refreshRecentTranscriptions = async (): Promise<void> => {
    try {
      logger.info('Attempting to refresh recent transcriptions...');
      logger.debug(`electronAPI available: ${!!window.electronAPI}`);
      logger.debug(
        `getTranscriptions method available: ${!!(window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function')}`
      );
      logger.debug(
        `getRecentTranscriptions method available: ${!!(window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function')}`
      );

      // Try primary method first
      const primarySuccess = await fetchTranscriptionsWithPrimaryMethod();

      // If primary method failed or returned no results, try fallback
      if (!primarySuccess) {
        const fallbackSuccess = await fetchTranscriptionsWithFallbackMethod();

        // If both methods failed, log a warning
        if (!fallbackSuccess) {
          logger.warn('getTranscriptions API not available');
        }
      }
    } catch (error) {
      logger.exception('Failed to get recent transcriptions', error);
    }
  };

  // Get a single transcription by ID
  const getTranscriptionById = async (id: string): Promise<Transcription | null> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getTranscription === 'function') {
        const result = await window.electronAPI.getTranscription(id);
        if (result && result.success && result.transcription) {
          return result.transcription;
        }
      }
      return null;
    } catch (error) {
      logger.exception(`Failed to get transcription with ID: ${id}`, error);
      return null;
    }
  };

  // Delete a transcription
  const deleteTranscription = async (id: string): Promise<boolean> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.deleteTranscription === 'function') {
        const result = await window.electronAPI.deleteTranscription(id);
        if (result && result.success) {
          // Remove from local state
          setRecentTranscriptions(prev => prev.filter(t => t.id !== id));
          // If current transcription is deleted, clear it
          if (currentTranscription && currentTranscription.id === id) {
            setCurrentTranscription(null);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.exception(`Failed to delete transcription with ID: ${id}`, error);
      return false;
    }
  };

  // Transcribe recording
  const transcribeRecording = async (language?: string): Promise<void> => {
    try {
      logger.info(
        `Attempting to transcribe recording with language: ${language ?? settings.language}`
      );
      logger.debug(`API key available: ${!!settings.apiKey}`);
      logger.debug(`API key length: ${settings.apiKey ? settings.apiKey.length : 0}`);
      logger.debug(
        `transcribeRecording API available: ${!!(window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function')}`
      );

      // Get API key from settings or use a default one for testing
      let apiKey = settings.apiKey;

      // Check if API key is available
      if (!apiKey) {
        logger.warn('No API key in settings, checking .env file or using default');

        // Try to get API key from environment
        if (process.env.GROQ_API_KEY) {
          apiKey = process.env.GROQ_API_KEY;
          logger.info('Using API key from environment variable');
        } else {
          // For testing purposes only - in production, always require a valid API key
          logger.error('No API key available. Please set your Groq API key in the settings.', null);
          return;
        }
      }

      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        logger.info('Calling transcribeRecording IPC method...');
        try {
          // Log the parameters being sent
          logger.debug(`Sending language: ${language ?? settings.language}`);
          logger.debug(`API key length being sent: ${apiKey.length}`);

          const result = await window.electronAPI.transcribeRecording(
            language ?? settings.language,
            apiKey
          );

          logger.debug(`Transcription result received: ${!!result}`);
          if (result) {
            logger.debug(`Transcription success: ${result.success}`);
            logger.debug(`Transcription result: ${JSON.stringify(result, null, 2)}`);
          } else {
            logger.error('Received null or undefined result from transcribeRecording', null);
            return;
          }

          if (result.success) {
            logger.info(`Transcription successful, text length: ${result.text.length}`);

            // Calculate word count if not provided
            const wordCount = result.wordCount || result.text.split(/\s+/).length;

            // Create enhanced transcription object
            const transcription: Transcription = {
              id: result.id,
              text: result.text,
              timestamp: result.timestamp,
              duration: result.duration,
              language: result.language ?? settings.language,
              pastedAtCursor: result.pastedAtCursor,
              wordCount,
              source: 'recording',
              title: `Recording ${new Date(result.timestamp).toLocaleString()}`,
              confidence: result.confidence,
            };

            setCurrentTranscription(transcription);

            // Log whether the text was pasted at the cursor
            if (result.pastedAtCursor) {
              logger.info('Transcribed text was pasted at cursor position');
            } else {
              logger.info('Transcribed text was not pasted at cursor position');
            }

            // Refresh the list of transcriptions immediately
            await refreshRecentTranscriptions();

            // Add a second refresh after a delay to ensure we get the latest data
            // This helps in case the file is still being written when the first refresh happens
            setTimeout(async () => {
              logger.debug('Performing delayed refresh of transcriptions');
              await refreshRecentTranscriptions();
            }, 2000);
          } else if (result.error) {
            logger.error(`Transcription error: ${result.error}`, null);
            // You could add error handling UI here
          }
        } catch (ipcError) {
          logger.exception('Error calling transcribeRecording IPC method', ipcError);
        }
      } else {
        logger.warn('transcribeRecording API not available');
      }
    } catch (error) {
      logger.exception('Failed to transcribe recording', error);
    }
  };

  // Save transcription
  const saveTranscription = async (transcription: Transcription): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveTranscription === 'function') {
        await window.electronAPI.saveTranscription(transcription);
        refreshRecentTranscriptions();
      } else {
        logger.warn('saveTranscription API not available');
      }
    } catch (error) {
      logger.exception('Failed to save transcription', error);
    }
  };

  return {
    currentTranscription,
    setCurrentTranscription,
    recentTranscriptions,
    refreshRecentTranscriptions,
    transcribeRecording,
    saveTranscription,
    getTranscriptionById,
    deleteTranscription,
  };
};
