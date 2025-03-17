// Audio device interfaces
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

// Import the Transcription type from shared types
import { Transcription } from '../../shared/types';

interface ElectronAPI {
  // Audio recording
  getAudioSources: () => Promise<Array<{ id: string; name: string }>>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  saveRecording: (
    arrayBuffer: ArrayBuffer
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getRecordingPath: () => Promise<string>;
  startRecording: (sourceId: string) => Promise<{ success: boolean; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; error?: string }>;

  // Audio device detection
  onAudioDevicesRequest: (callback: () => void) => () => void;
  sendAudioDevicesResult: (devices: AudioDevice[]) => void;

  // Groq API
  transcribeAudio: (
    filePath: string,
    options?: { language?: string; model?: string; apiKey?: string }
  ) => Promise<{
    success: boolean;
    text?: string;
    language?: string;
    model?: string;
    error?: string;
  }>;
  translateAudio: (
    filePath: string,
    options?: { apiKey?: string }
  ) => Promise<{ success: boolean; text?: string; model?: string; error?: string }>;
  transcribeRecording: (
    language: string,
    apiKey: string
  ) => Promise<{
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
  }>;

  // File storage
  saveTranscription: (
    transcription: Transcription,
    options?: { filename?: string; format?: string }
  ) => Promise<{ success: boolean; jsonSaved?: boolean; error?: string }>;
  saveTranscriptionAs: (
    transcription: Transcription
  ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  getRecentTranscriptions: () => Promise<{
    success: boolean;
    transcriptions?: Transcription[];
    error?: string;
  }>;
  getTranscriptions: () => Promise<Transcription[]>;
  getTranscription: (id: string) => Promise<{
    success: boolean;
    transcription?: Transcription;
    error?: string;
  }>;
  deleteTranscription: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  openFile: (path: string) => Promise<{ success: boolean; error?: string }>;

  // Settings
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (
    settings: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>;

  // Window management
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => Promise<boolean>;

  // Event listeners
  onToggleRecording: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
