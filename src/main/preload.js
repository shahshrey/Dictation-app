const { contextBridge, ipcRenderer } = require('electron');

console.log('Main preload script starting...');
console.log('ipcRenderer available:', !!ipcRenderer);
console.log('contextBridge available:', !!contextBridge);

// Expose a minimal API to the renderer process
try {
  console.log('Exposing electronAPI to renderer process from main preload...');
  
  const api = {
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
    transcribeRecording: (language, apiKey) => {
      console.log('Main preload: transcribeRecording called with language:', language);
      console.log('Main preload: API key available:', !!apiKey);
      return ipcRenderer.invoke('transcribe-recording', language, apiKey);
    },
    
    // File storage
    saveTranscription: (text, options) => 
      ipcRenderer.invoke('save-transcription', text, options),
    saveTranscriptionAs: (text) => 
      ipcRenderer.invoke('save-transcription-as', text),
    getRecentTranscriptions: () => 
      ipcRenderer.invoke('get-recent-transcriptions'),
    getTranscriptions: () => {
      console.log('Main preload: getTranscriptions called');
      return ipcRenderer.invoke('get-transcriptions');
    },
    openFile: (path) => 
      ipcRenderer.invoke('open-file', path),
    
    // Settings
    getSettings: () => 
      ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => 
      ipcRenderer.invoke('save-settings', settings),
    
    // Window management
    setIgnoreMouseEvents: (ignore) => 
      ipcRenderer.invoke('set-ignore-mouse-events', ignore),
    
    // Event listeners
    onToggleRecording: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('toggle-recording', subscription);
      return () => {
        ipcRenderer.removeListener('toggle-recording', subscription);
      };
    }
  };
  
  console.log('API methods being exposed from main preload:', Object.keys(api));
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('electronAPI successfully exposed to renderer process from main preload');
} catch (error) {
  console.error('Error in main preload script:', error);
} 