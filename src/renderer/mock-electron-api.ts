// This file provides mock implementations of the Electron API for development
// It allows the app to run without the actual Electron API being available
import { AudioDevice, AppSettings, Transcription } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

// Define the window.electronAPI interface
interface ElectronAPI {
  // Audio recording
  getAudioSources: () => Promise<Array<{ id: string; name: string }>>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  startRecording: (sourceId: string) => Promise<void>;
  saveRecording: (arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getRecordingPath: () => Promise<string>;
  
  // Groq API
  transcribeAudio: (filePath: string, options: { language?: string }) => 
    Promise<{ success: boolean; text?: string; language?: string; model?: string; error?: string }>;
  translateAudio: (filePath: string) => 
    Promise<{ success: boolean; text?: string; model?: string; error?: string }>;
  transcribeRecording: (language: string) => Promise<{ 
    success: boolean; 
    id: string; 
    text: string; 
    timestamp: number; 
    duration: number; 
    language?: string; 
    error?: string 
  }>;
  
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  
  // File storage
  saveTranscription: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveTranscriptionAs: (text: string) => 
    Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  getRecentTranscriptions: () => 
    Promise<{ success: boolean; files?: Array<any>; error?: string }>;
  getTranscriptions: () => Promise<Transcription[]>;
  
  // Event listeners
  onToggleRecording: (callback: () => void) => () => void;
  onRecordingSourceSelected: (callback: (sourceId: string) => void) => () => void;
  stopRecording: () => Promise<void>;
}

// Create mock implementations
const mockElectronAPI: ElectronAPI = {
  // Audio recording
  getAudioSources: async () => {
    console.log('Mock: getAudioSources called');
    return [
      { id: 'mock-device-1', name: 'Mock Microphone 1' },
      { id: 'mock-device-2', name: 'Mock Microphone 2' }
    ];
  },
  
  getAudioDevices: async () => {
    console.log('Mock: getAudioDevices called');
    return [
      { id: 'mock-device-1', name: 'Mock Microphone 1', isDefault: true },
      { id: 'mock-device-2', name: 'Mock Microphone 2', isDefault: false }
    ];
  },
  
  startRecording: async (sourceId: string) => {
    console.log(`Mock: startRecording called with sourceId: ${sourceId}`);
  },
  
  saveRecording: async (arrayBuffer: ArrayBuffer) => {
    console.log(`Mock: saveRecording called with ${arrayBuffer.byteLength} bytes`);
    return { success: true, filePath: '/mock/path/to/recording.webm' };
  },
  
  getRecordingPath: async () => {
    console.log('Mock: getRecordingPath called');
    return '/mock/path/to/recording.webm';
  },
  
  // Groq API
  transcribeAudio: async (filePath: string, options: { language?: string }) => {
    console.log(`Mock: transcribeAudio called with filePath: ${filePath}, language: ${options.language}`);
    return { 
      success: true, 
      text: 'This is a mock transcription of the audio file.',
      language: options.language || 'en',
      model: 'mock-model'
    };
  },
  
  translateAudio: async (filePath: string) => {
    console.log(`Mock: translateAudio called with filePath: ${filePath}`);
    return { 
      success: true, 
      text: 'This is a mock translation of the audio file.',
      model: 'mock-model'
    };
  },
  
  transcribeRecording: async (language: string) => {
    console.log(`Mock: transcribeRecording called with language: ${language}`);
    return {
      success: true,
      id: `mock-${Date.now()}`,
      text: 'This is a mock transcription generated for testing purposes.',
      timestamp: Date.now(),
      duration: 30,
      language: language
    };
  },
  
  // Settings
  getSettings: async () => {
    console.log('Mock: getSettings called');
    return DEFAULT_SETTINGS;
  },
  
  saveSettings: async (settings: AppSettings) => {
    console.log(`Mock: saveSettings called with settings:`, settings);
  },
  
  // File storage
  saveTranscription: async (id: string) => {
    console.log(`Mock: saveTranscription called with id: ${id}`);
    return { success: true };
  },
  
  saveTranscriptionAs: async (text: string) => {
    console.log(`Mock: saveTranscriptionAs called with text: ${text.substring(0, 20)}...`);
    return { success: true, filePath: '/mock/path/to/user-selected-file.txt' };
  },
  
  getRecentTranscriptions: async () => {
    console.log('Mock: getRecentTranscriptions called');
    return { 
      success: true, 
      files: [
        { 
          name: 'Mock Transcription 1.txt', 
          path: '/mock/path/to/transcription1.txt',
          size: 1024,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          modifiedAt: new Date(Date.now() - 86400000)
        },
        { 
          name: 'Mock Transcription 2.txt', 
          path: '/mock/path/to/transcription2.txt',
          size: 2048,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          modifiedAt: new Date(Date.now() - 172800000)
        }
      ]
    };
  },
  
  getTranscriptions: async () => {
    console.log('Mock: getTranscriptions called');
    return [
      { 
        id: 'mock-1',
        text: 'This is a mock transcription for testing purposes.',
        timestamp: Date.now() - 86400000, // 1 day ago
        duration: 30,
        language: 'en'
      },
      { 
        id: 'mock-2',
        text: 'Another mock transcription with different content.',
        timestamp: Date.now() - 172800000, // 2 days ago
        duration: 45,
        language: 'en'
      }
    ];
  },
  
  // Event listeners
  onToggleRecording: (callback: () => void) => {
    console.log('Mock: onToggleRecording listener registered');
    // Return a function to unsubscribe
    return () => {
      console.log('Mock: onToggleRecording listener unregistered');
    };
  },
  
  onRecordingSourceSelected: (callback: (sourceId: string) => void) => {
    console.log('Mock: onRecordingSourceSelected listener registered');
    // Return a function to unsubscribe
    return () => {
      console.log('Mock: onRecordingSourceSelected listener unregistered');
    };
  },
  
  stopRecording: async () => {
    console.log('Mock: stopRecording called');
  }
};

// Check if window.electronAPI exists, if not, use the mock
if (typeof window !== 'undefined' && !window.electronAPI) {
  console.log('Using mock Electron API');
  (window as any).electronAPI = mockElectronAPI;
}

// Declare the global window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export default mockElectronAPI; 