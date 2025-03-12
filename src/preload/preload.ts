import { contextBridge, ipcRenderer } from 'electron';
import { AudioDevice, IPC_CHANNELS } from '../shared/types';
import { preloadLogger } from '../shared/preload-logger';

preloadLogger.info('Preload script starting');
preloadLogger.debug('ipcRenderer available:', { available: !!ipcRenderer });
preloadLogger.debug('contextBridge available:', { available: !!contextBridge });

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  preloadLogger.info('Exposing electronAPI to renderer process');
  
  const api = {
    // Audio recording
    getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
    getAudioDevices: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUDIO_DEVICES),
    startRecording: (sourceId: string) => ipcRenderer.invoke('start-recording', sourceId),
    saveRecording: (arrayBuffer: ArrayBuffer) => ipcRenderer.invoke('save-recording', arrayBuffer),
    getRecordingPath: () => ipcRenderer.invoke('get-recording-path'),
    
    // Audio device detection
    onAudioDevicesRequest: (callback: () => void) => {
      const subscription = (_event: Electron.IpcRendererEvent) => callback();
      ipcRenderer.on(IPC_CHANNELS.AUDIO_DEVICES_REQUEST, subscription);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_DEVICES_REQUEST, subscription);
      };
    },
    
    sendAudioDevicesResult: (devices: AudioDevice[]) => {
      ipcRenderer.send(IPC_CHANNELS.AUDIO_DEVICES_RESULT, devices);
    },
    
    // Groq API
    transcribeAudio: (filePath: string, options: { language?: string }) => 
      ipcRenderer.invoke('transcribe-audio', filePath, options),
    translateAudio: (filePath: string) => 
      ipcRenderer.invoke('translate-audio', filePath),
    
    transcribeRecording: (language: string, apiKey: string) => {
      preloadLogger.debug('transcribeRecording called', { language, apiKeyAvailable: !!apiKey });
      return ipcRenderer.invoke('transcribe-recording', language, apiKey);
    },
    
    // File storage
    saveTranscription: (text: string, options: { filename?: string, format?: string }) => 
      ipcRenderer.invoke('save-transcription', text, options),
    saveTranscriptionAs: (text: string) => 
      ipcRenderer.invoke('save-transcription-as', text),
    getRecentTranscriptions: () => 
      ipcRenderer.invoke('get-recent-transcriptions'),
    getTranscriptions: () => {
      preloadLogger.debug('getTranscriptions called');
      return ipcRenderer.invoke('get-transcriptions');
    },
    
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
  };
  
  preloadLogger.debug('API methods being exposed', { methods: Object.keys(api) });
  contextBridge.exposeInMainWorld('electronAPI', api);
  preloadLogger.info('electronAPI successfully exposed to renderer process');
} catch (error: unknown) {
  if (error instanceof Error) {
    preloadLogger.exception(error, 'Error in preload script');
  } else {
    preloadLogger.error('Error in preload script', { error: String(error) });
  }
} 