interface AudioSource {
  id: string;
  name: string;
}

interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

interface Transcription {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
  language?: string;
}

interface RecentFile {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

interface ElectronAPI {
  // Audio recording
  getAudioSources: () => Promise<Array<{ id: string; name: string }>>;
  getAudioDevices: () => Promise<AudioDevice[]>;
  saveRecording: (arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getRecordingPath: () => Promise<string>;
  startRecording: (sourceId: string) => Promise<{ success: boolean; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; error?: string }>;
  
  // Audio device detection
  onAudioDevicesRequest: (callback: () => void) => () => void;
  sendAudioDevicesResult: (devices: AudioDevice[]) => void;
  
  // Groq API
  transcribeAudio: (filePath: string, options?: { language?: string; model?: string; apiKey?: string }) => 
    Promise<{ success: boolean; text?: string; language?: string; model?: string; error?: string }>;
  translateAudio: (filePath: string, options?: { apiKey?: string }) => 
    Promise<{ success: boolean; text?: string; model?: string; error?: string }>;
  transcribeRecording: (language: string, apiKey: string) => Promise<{ 
    success: boolean; 
    id: string; 
    text: string; 
    timestamp: number; 
    duration: number; 
    language?: string; 
    error?: string 
  }>;
  testGroqAPI: (apiKey: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    text?: string;
  }>;
  saveGroqApiKey: (apiKey: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  getGroqApiKey: () => Promise<{
    success: boolean;
    apiKey: string;
    error?: string;
  }>;
  
  // File storage
  saveTranscription: (text: string, options?: { filename?: string; format?: string }) => 
    Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveTranscriptionAs: (text: string) => 
    Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  getRecentTranscriptions: () => 
    Promise<{ success: boolean; files?: Array<{ name: string; path: string; size: number; createdAt: Date; modifiedAt: Date }>; error?: string }>;
  getTranscriptions: () => Promise<Transcription[]>;
  openFile: (path: string) => 
    Promise<{ success: boolean; error?: string }>;
  
  // Settings
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  
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