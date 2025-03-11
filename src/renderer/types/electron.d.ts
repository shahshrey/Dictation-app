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
  getAudioSources: () => Promise<AudioSource[]>;
  startRecording: (sourceId: string) => Promise<{ success: boolean; error?: string }>;
  saveRecording: (arrayBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getRecordingPath: () => Promise<string>;
  
  // Groq API
  transcribeAudio: (filePath: string, options: { language?: string }) => 
    Promise<{ success: boolean; text?: string; language?: string; error?: string }>;
  translateAudio: (filePath: string) => 
    Promise<{ success: boolean; text?: string; error?: string }>;
  
  // File storage
  saveTranscription: (text: string, options: { filename?: string; format?: string }) => 
    Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveTranscriptionAs: (text: string) => 
    Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  getRecentTranscriptions: () => 
    Promise<{ success: boolean; files: RecentFile[]; error?: string }>;
  openFile: (path: string) => Promise<void>;
  
  // Event listeners
  onToggleRecording: (callback: () => void) => () => void;
  onRecordingSourceSelected: (callback: (sourceId: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 