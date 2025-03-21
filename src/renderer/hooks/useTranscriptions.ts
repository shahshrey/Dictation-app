import { useState, useEffect } from 'react';
import { Transcription, AppSettings } from '../../shared/types';
import logger from '../../shared/logger';

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

  const fetchTranscriptionsWithPrimaryMethod = async (): Promise<boolean> => {
    if (!(window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function')) {
      return false;
    }

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

    try {
      const result = await window.electronAPI.getRecentTranscriptions();

      if (result && result.success && result.transcriptions) {
        // Only use JSON transcriptions
        if (Array.isArray(result.transcriptions) && result.transcriptions.length > 0) {
          processTranscriptionsResult(result.transcriptions);
          return true;
        }
      }

      // If we get here, we didn't find any valid transcriptions
      logger.warn('getRecentTranscriptions returned no valid transcriptions');
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
      // Get API key from settings
      const apiKey = settings.apiKey;

      // Check if API key is available
      if (!apiKey) {
        logger.error('No API key available. Please set your Groq API key in the settings.', {});
        return;
      }

      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        const result = await window.electronAPI.transcribeRecording(
          language ?? settings.language,
          apiKey
        );

        if (!result) {
          logger.error('Received null or undefined result from transcribeRecording', {});
          return;
        }

        if (result.success) {
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
            audioFilePath: result.audioFilePath,
          };

          setCurrentTranscription(transcription);

          // Paste text at cursor if it wasn't already pasted by the main process
          if (
            !result.pastedAtCursor &&
            window.electronAPI &&
            typeof window.electronAPI.pasteTextAtCursor === 'function'
          ) {
            try {
              await window.electronAPI.pasteTextAtCursor(result.text);
            } catch (pasteError) {
              logger.exception('Failed to paste text at cursor position from renderer', pasteError);
            }
          }

          // Refresh the list of transcriptions immediately
          await refreshRecentTranscriptions();
        } else if (result.error) {
          logger.error(`Transcription failed: ${result.error}`, {});
        }
      }
    } catch (error) {
      logger.exception('Failed to transcribe recording', error);
    }
  };

  // Effect to refresh transcriptions when settings change
  useEffect(() => {
    refreshRecentTranscriptions();
  }, [settings]);

  // Public API
  return {
    currentTranscription,
    recentTranscriptions,
    refreshRecentTranscriptions,
    getTranscriptionById,
    deleteTranscription,
    transcribeRecording,
    setCurrentTranscription,
  };
};
