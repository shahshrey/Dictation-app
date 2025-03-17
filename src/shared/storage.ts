/**
 * Shared storage utilities for use across main and renderer processes
 */

import { Transcription } from './types';
import logger from './logger';

// File storage interfaces
export interface SaveTranscriptionOptions {
  filename?: string;
  format?: string;
}

export interface SaveTranscriptionResult {
  success: boolean;
  filePath?: string;
  jsonSaved?: boolean;
  error?: string;
  canceled?: boolean;
}

export interface GetTranscriptionsResult {
  success: boolean;
  transcriptions?: Transcription[];
  error?: string;
}

export interface GetTranscriptionResult {
  success: boolean;
  transcription?: Transcription;
  error?: string;
}

export interface DeleteTranscriptionResult {
  success: boolean;
  error?: string;
}

export interface OpenFileResult {
  success: boolean;
  error?: string;
}

// IPC channel constants for storage operations
export const STORAGE_CHANNELS = {
  SAVE_TRANSCRIPTION: 'save-transcription',
  SAVE_TRANSCRIPTION_AS: 'save-transcription-as',
  GET_RECENT_TRANSCRIPTIONS: 'get-recent-transcriptions',
  GET_TRANSCRIPTIONS: 'get-transcriptions',
  GET_TRANSCRIPTION: 'get-transcription',
  DELETE_TRANSCRIPTION: 'delete-transcription',
  OPEN_FILE: 'open-file',
};

// Log initialization
logger.debug('Storage module initialized');
