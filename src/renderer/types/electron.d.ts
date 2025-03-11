interface AudioSource {
  id: string;
  name: string;
}

interface Transcription {
  text: string;
  language: string;
  timestamp: Date;
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
  saveRecording: (arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getRecordingPath: () => Promise<string>;
  startRecording: (sourceId: string) => Promise<{ success: boolean; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; error?: string }>;
  
  // Groq API
  transcribeAudio: (filePath: string, options?: { language?: string; model?: string }) => 
    Promise<{ success: boolean; text?: string; language?: string; model?: string; error?: string }>;
  translateAudio: (filePath: string) => 
    Promise<{ success: boolean; text?: string; model?: string; error?: string }>;
  
  // File storage
  saveTranscription: (text: string, options?: { filename?: string; format?: string }) => 
    Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveTranscriptionAs: (text: string) => 
    Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  getRecentTranscriptions: () => 
    Promise<{ success: boolean; files?: Array<{ name: string; path: string; size: number; createdAt: Date; modifiedAt: Date }>; error?: string }>;
  openFile: (path: string) => 
    Promise<{ success: boolean; error?: string }>;
  
  // Settings
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners
  onToggleRecording: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 