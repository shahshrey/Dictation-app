import { contextBridge, ipcRenderer } from 'electron';
import { AudioDevice, IPC_CHANNELS, Transcription } from '../shared/types';

console.log('Preload script starting...');
console.log('ipcRenderer available:', !!ipcRenderer);
console.log('contextBridge available:', !!contextBridge);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  console.log('Exposing electronAPI to renderer process...');

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
    translateAudio: (filePath: string) => ipcRenderer.invoke('translate-audio', filePath),

    transcribeRecording: (language: string, apiKey: string) => {
      console.log('Preload: transcribeRecording called with language:', language);
      console.log('Preload: API key available:', !!apiKey);
      return ipcRenderer.invoke('transcribe-recording', language, apiKey);
    },

    // File storage
    saveTranscription: (
      transcription: Transcription,
      options?: { filename?: string; format?: string }
    ) => {
      console.log('Preload: saveTranscription called with transcription ID:', transcription.id);
      return ipcRenderer.invoke('save-transcription', transcription, options || {});
    },
    saveTranscriptionAs: (transcription: Transcription) => {
      console.log('Preload: saveTranscriptionAs called with transcription ID:', transcription.id);
      return ipcRenderer.invoke('save-transcription-as', transcription);
    },
    getRecentTranscriptions: () => ipcRenderer.invoke('get-recent-transcriptions'),
    getTranscriptions: () => {
      console.log('Preload: getTranscriptions called');
      return ipcRenderer.invoke('get-transcriptions');
    },
    getTranscription: (id: string) => {
      console.log('Preload: getTranscription called for ID:', id);
      return ipcRenderer.invoke('get-transcription', id);
    },
    deleteTranscription: (id: string) => {
      console.log('Preload: deleteTranscription called for ID:', id);
      return ipcRenderer.invoke('delete-transcription', id);
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
      const subscription = (_event: Electron.IpcRendererEvent, sourceId: string) =>
        callback(sourceId);
      ipcRenderer.on('recording-source-selected', subscription);
      return () => {
        ipcRenderer.removeListener('recording-source-selected', subscription);
      };
    },

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke('save-settings', settings),

    // Window management
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
      ipcRenderer.invoke('set-ignore-mouse-events', ignore, options),
  };

  console.log('API methods being exposed:', Object.keys(api));
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('electronAPI successfully exposed to renderer process');
} catch (error) {
  console.error('Error in preload script:', error);
}
