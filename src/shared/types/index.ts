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
  pastedAtCursor?: boolean;
  title?: string;
  tags?: string[];
  confidence?: number;
  wordCount?: number;
  source?: string;
  speakerCount?: number;
  speakers?: Speaker[];
  segments?: TranscriptionSegment[];
  audioFilePath?: string;
}

export interface Speaker {
  id: string;
  name?: string;
}

export interface TranscriptionSegment {
  id: string;
  speakerId?: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
}

// Settings related types
export interface AppSettings {
  apiKey: string;
  selectedMicrophone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  saveTranscriptions: boolean;
  transcriptionSavePath: string;
  audioSavePath: string;
  autoTranscribe: boolean;
  hotkey: string;
  transcriptionSystemPrompt?: string; // Custom system prompt for transcription
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
  ERROR: 'error-message',
};
