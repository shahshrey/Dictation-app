import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio recording
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  startRecording: (sourceId: string) => ipcRenderer.invoke('start-recording', sourceId),
  saveRecording: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),
  getRecordingPath: () => ipcRenderer.invoke('get-recording-path'),
  
  // Groq API
  transcribeAudio: (filePath: string, options: { language?: string }) => 
    ipcRenderer.invoke('transcribe-audio', filePath, options),
  translateAudio: (filePath: string) => 
    ipcRenderer.invoke('translate-audio', filePath),
  
  // File storage
  saveTranscription: (text: string, options: { filename?: string, format?: string }) => 
    ipcRenderer.invoke('save-transcription', text, options),
  saveTranscriptionAs: (text: string) => 
    ipcRenderer.invoke('save-transcription-as', text),
  getRecentTranscriptions: () => 
    ipcRenderer.invoke('get-recent-transcriptions'),
  
  // Event listeners
  onToggleRecording: (callback: () => void) => {
    const subscription = (_event: Electron.IpcRendererEvent) => callback();
    ipcRenderer.on('toggle-recording', subscription);
    return () => {
      ipcRenderer.removeListener('toggle-recording', subscription);
    };
  },
  
  onRecordingSourceSelected: (callback: (sourceId: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, sourceId: string) => callback(sourceId);
    ipcRenderer.on('recording-source-selected', subscription);
    return () => {
      ipcRenderer.removeListener('recording-source-selected', subscription);
    };
  }
}); 