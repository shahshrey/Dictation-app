const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Audio recording
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  saveRecording: (arrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),
  getRecordingPath: () => ipcRenderer.invoke('get-recording-path'),
  startRecording: (sourceId) => ipcRenderer.invoke('start-recording', sourceId),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Groq API
  transcribeAudio: (filePath, options) => 
    ipcRenderer.invoke('transcribe-audio', filePath, options),
  translateAudio: (filePath, options) => 
    ipcRenderer.invoke('translate-audio', filePath, options),
  transcribeRecording: (language, apiKey) => 
    ipcRenderer.invoke('transcribe-recording', language, apiKey),
  
  // File storage
  saveTranscription: (text, options) => 
    ipcRenderer.invoke('save-transcription', text, options),
  saveTranscriptionAs: (text) => 
    ipcRenderer.invoke('save-transcription-as', text),
  getRecentTranscriptions: () => 
    ipcRenderer.invoke('get-recent-transcriptions'),
  openFile: (path) => 
    ipcRenderer.invoke('open-file', path),
  
  // Settings
  getSettings: () => 
    ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => 
    ipcRenderer.invoke('save-settings', settings),
  
  // Event listeners
  onToggleRecording: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('toggle-recording', subscription);
    return () => {
      ipcRenderer.removeListener('toggle-recording', subscription);
    };
  }
}); 