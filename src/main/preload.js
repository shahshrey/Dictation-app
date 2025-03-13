const { contextBridge, ipcRenderer } = require('electron');
const { preloadLogger } = require('../shared/preload-logger');

preloadLogger.info('Main preload script starting...');
preloadLogger.debug('ipcRenderer available:', { available: !!ipcRenderer });
preloadLogger.debug('contextBridge available:', { available: !!contextBridge });

// Expose a minimal API to the renderer process
try {
  preloadLogger.debug('Exposing electronAPI to renderer process from main preload...');
  
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
      preloadLogger.debug('Transcribe recording called', { language: language, hasApiKey: !!apiKey });
      return ipcRenderer.invoke('transcribe-recording', language, apiKey);
    },
    testGroqAPI: (apiKey) => {
      preloadLogger.debug('Test Groq API called', { hasApiKey: !!apiKey });
      return ipcRenderer.invoke('test-groq-api', apiKey);
    },
    saveGroqApiKey: (apiKey) => {
      preloadLogger.debug('Save Groq API key called', { hasApiKey: !!apiKey });
      return ipcRenderer.invoke('save-groq-api-key', apiKey);
    },
    getGroqApiKey: () => {
      preloadLogger.debug('Get Groq API key called');
      return ipcRenderer.invoke('get-groq-api-key');
    },
    
    // File storage
    saveTranscription: (text, options) => 
      ipcRenderer.invoke('save-transcription', text, options),
    saveTranscriptionAs: (text) => 
      ipcRenderer.invoke('save-transcription-as', text),
    getRecentTranscriptions: () => 
      ipcRenderer.invoke('get-recent-transcriptions'),
    getTranscriptions: () => {
      preloadLogger.debug('getTranscriptions called');
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
    setIgnoreMouseEvents: (ignore, options) => 
      ipcRenderer.invoke('set-ignore-mouse-events', ignore, options),
    
    // Event listeners
    onToggleRecording: (callback) => {
      const subscription = () => callback();
      ipcRenderer.on('toggle-recording', subscription);
      return () => {
        ipcRenderer.removeListener('toggle-recording', subscription);
      };
    }
  };
  
  preloadLogger.debug('Exposing API methods', { methods: Object.keys(api) });
  contextBridge.exposeInMainWorld('electronAPI', api);
  preloadLogger.info('electronAPI successfully exposed to renderer process');
} catch (error) {
  preloadLogger.exception(error, 'Error in main preload script');
} 