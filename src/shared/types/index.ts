/**
 * Shared TypeScript interfaces for use across main and renderer processes
 */

// Transcription related types
export interface Transcription {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
  language?: string;
}

// Settings related types
export interface AppSettings {
  apiKey: string;
  selectedMicrophone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  saveTranscriptions: boolean;
  transcriptionSavePath: string;
  autoTranscribe: boolean;
  hotkey: string;
}

// Audio related types
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

// IPC channel constants
export const IPC_CHANNELS = {
  TOGGLE_RECORDING: 'toggle-recording',
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  TRANSCRIPTION_RESULT: 'transcription-result',
  GET_AUDIO_DEVICES: 'get-audio-devices',
  AUDIO_DEVICES_REQUEST: 'audio-devices-request',
  AUDIO_DEVICES_RESULT: 'audio-devices-result',
  SAVE_SETTINGS: 'save-settings',
  GET_SETTINGS: 'get-settings',
  SETTINGS_RESULT: 'settings-result',
  GET_TRANSCRIPTIONS: 'get-transcriptions',
  TRANSCRIPTIONS_RESULT: 'transcriptions-result',
  ERROR: 'error-message'
}; 