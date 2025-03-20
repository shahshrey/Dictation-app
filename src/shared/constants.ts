/**
 * Shared constants for use across main and renderer processes
 */

// Application constants
export const APP_NAME = 'Voice Vibe';
export const APP_VERSION = '1.0.0';

// Storage paths
export const STORAGE_PATHS = {
  SETTINGS: 'settings.json',
  TRANSCRIPTIONS: 'transcriptions.json',
};

// Audio recording constants
export const AUDIO_SETTINGS = {
  SAMPLE_RATE: 44100,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  FILE_FORMAT: 'wav',
};

// UI constants
export const UI_CONSTANTS = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 200,
  MAIN_WINDOW_WIDTH: 800,
  MAIN_WINDOW_HEIGHT: 600,
};

// Renderer Settings Interface
export interface RendererSettings {
  apiKey: string;
  selectedMicrophone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  saveTranscriptions: boolean;
  transcriptionSavePath: string;
  audioSavePath: string;
  autoTranscribe: boolean;
  hotkey: string;
}

// Renderer Default Settings
export const DEFAULT_RENDERER_SETTINGS: RendererSettings = {
  apiKey: '',
  selectedMicrophone: '',
  language: 'en',
  theme: 'system',
  saveTranscriptions: true,
  transcriptionSavePath: '',
  audioSavePath: '',
  autoTranscribe: false,
  hotkey: 'Home', // Default hotkey is Home
};

// Main Process Settings Interface
export interface MainProcessSettings {
  apiKey: string;
  defaultLanguage: string;
  transcriptionModel: string;
  showNotifications: boolean;
  saveTranscriptionsAutomatically: boolean;
}

// Define constants for Groq models to avoid direct dependency on the module
// These match the values in GROQ_MODELS from main/services/groq/types.ts
export const GROQ_MODEL_CONSTANTS = {
  TRANSCRIPTION: {
    MULTILINGUAL: 'whisper-large-v3',
    MULTILINGUAL_TURBO: 'whisper-large-v3-turbo',
    ENGLISH: 'distil-whisper-large-v3-en',
  },
  TRANSLATION: 'whisper-large-v3',
};

// Default placeholder for main process settings
export const DEFAULT_MAIN_SETTINGS: MainProcessSettings = {
  apiKey: '',
  defaultLanguage: 'auto',
  transcriptionModel: GROQ_MODEL_CONSTANTS.TRANSCRIPTION.ENGLISH,
  showNotifications: true,
  saveTranscriptionsAutomatically: false,
};

// For backward compatibility - should be replaced with specific settings in the codebase
export const DEFAULT_SETTINGS = DEFAULT_RENDERER_SETTINGS;
