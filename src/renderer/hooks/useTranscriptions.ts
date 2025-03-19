import { useState, useEffect } from 'react';
import { Transcription, AppSettings } from '../../shared/types';
import logger from '../../shared/logger';

export const useTranscriptions = (settings: AppSettings) => {
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);

  // Log when settings change, particularly the API key
  useEffect(() => {
    logger.debug(`useTranscriptions received settings update`);
    logger.debug(`API key available in useTranscriptions: ${!!settings.apiKey}`);
    logger.debug(
      `API key length in useTranscriptions: ${settings.apiKey ? settings.apiKey.length : 0}`
    );
  }, [settings, settings.apiKey]);

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

  const fetchTranscriptionsWithPrimaryMethod = async (): Promise<boolean> => {
    if (!(window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function')) {
      return false;
    }

    logger.debug('Calling getTranscriptions IPC method...');
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

    logger.debug('Falling back to getRecentTranscriptions IPC method...');
    try {
      const result = await window.electronAPI.getRecentTranscriptions();
      logger.debug(`Recent transcriptions result: ${JSON.stringify(result, null, 2)}`);

      if (result && result.success && result.transcriptions) {
        // Only use JSON transcriptions
        if (Array.isArray(result.transcriptions) && result.transcriptions.length > 0) {
          processTranscriptionsResult(result.transcriptions);
          return true;
        }
      }

      // If we get here, we didn't find any valid transcriptions
      logger.warn(
        `getRecentTranscriptions returned no valid transcriptions: ${JSON.stringify(result, null, 2)}`
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
      logger.debug('Attempting to refresh recent transcriptions...');
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
      logger.debug(
        `Attempting to transcribe recording with language: ${language ?? settings.language}`
      );
      logger.debug(`API key available: ${!!settings.apiKey}`);
      logger.debug(`API key length: ${settings.apiKey ? settings.apiKey.length : 0}`);
      logger.debug(
        `transcribeRecording API available: ${!!(window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function')}`
      );

      // Get API key from settings
      const apiKey = settings.apiKey;

      // Check if API key is available
      if (!apiKey) {
        logger.warn('No API key in settings, checking .env file or using default');

        // Error out since we don't have an API key
        logger.error('No API key available. Please set your Groq API key in the settings.', {});
        return;
      }

      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        logger.debug('Calling transcribeRecording IPC method...');
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
            logger.error('Received null or undefined result from transcribeRecording', {});
            return;
          }

          if (result.success) {
            logger.debug(`Transcription successful, text length: ${result.text.length}`);

            // Calculate word count if not provided
            const wordCount = result.wordCount ?? result.text.split(/\s+/).length;

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
              logger.debug('Transcribed text was pasted at cursor position');
            } else {
              logger.debug('Transcribed text was not pasted at cursor position');

              // Paste text at cursor since it wasn't already pasted by the main process
              if (
                window.electronAPI &&
                typeof window.electronAPI.pasteTextAtCursor === 'function'
              ) {
                try {
                  await window.electronAPI.pasteTextAtCursor(result.text);
                  logger.debug('Pasted transcribed text at cursor position from renderer');
                } catch (pasteError) {
                  logger.exception(
                    'Failed to paste text at cursor position from renderer',
                    pasteError
                  );
                }
              }
            }

            // Save the transcription to JSON
            if (window.electronAPI && typeof window.electronAPI.saveTranscription === 'function') {
              try {
                await window.electronAPI.saveTranscription(transcription);
                logger.debug('Transcription saved to JSON database');
              } catch (saveError) {
                logger.exception('Failed to save transcription to JSON database', saveError);
              }
            }

            // Refresh the list of transcriptions immediately
            await refreshRecentTranscriptions();

            // Add a second refresh after a delay to ensure we get the latest data
            setTimeout(async () => {
              logger.debug('Performing delayed refresh of transcriptions');
              await refreshRecentTranscriptions();
            }, 2000);
          } else if (result.error) {
            logger.error(`Transcription error: ${result.error}`, {});
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
