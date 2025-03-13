/**
 * Shared constants for use across main and renderer processes
 */

// Application constants
export const APP_NAME = 'Dictation App';
export const APP_VERSION = '1.0.0';

// Default settings
export const DEFAULT_SETTINGS = {
  apiKey: '',
  selectedMicrophone: '',
  language: 'en',
  theme: 'system' as const,
  saveTranscriptions: true,
  transcriptionSavePath: '',
  autoTranscribe: false,
  hotkey: 'Home' // Default hotkey is Home
};

// Language options
export const LANGUAGES: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'zh': 'Chinese',
  'ru': 'Russian',
  'ko': 'Korean'
};

// File paths
export const STORAGE_PATHS = {
  SETTINGS: 'settings.json',
  TRANSCRIPTIONS: 'transcriptions.json'
};

// Audio recording constants
export const AUDIO_SETTINGS = {
  SAMPLE_RATE: 44100,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  FILE_FORMAT: 'wav'
};

// UI constants
export const UI_CONSTANTS = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 200,
  MAIN_WINDOW_WIDTH: 800,
  MAIN_WINDOW_HEIGHT: 600
}; 