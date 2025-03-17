import { contextBridge, ipcRenderer } from 'electron';
import { AudioDevice, IPC_CHANNELS, Transcription } from '../shared/types';
import logger from '../shared/logger';

logger.debug('Preload script starting...');
logger.debug('ipcRenderer available:', { available: !!ipcRenderer });
logger.debug('contextBridge available:', { available: !!contextBridge });

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  logger.debug('Exposing electronAPI to renderer process...');

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
      logger.debug('Preload: transcribeRecording called with language:', { language });
      logger.debug('Preload: API key available:', { available: !!apiKey });
      return ipcRenderer.invoke('transcribe-recording', language, apiKey);
    },

    // File storage
    saveTranscription: (
      transcription: Transcription,
      options?: { filename?: string; format?: string }
    ) => {
      logger.debug('Preload: saveTranscription called with transcription ID:', {
        id: transcription.id,
      });
      return ipcRenderer.invoke('save-transcription', transcription, options || {});
    },
    saveTranscriptionAs: (transcription: Transcription) => {
      logger.debug('Preload: saveTranscriptionAs called with transcription ID:', {
        id: transcription.id,
      });
      return ipcRenderer.invoke('save-transcription-as', transcription);
    },
    getRecentTranscriptions: () => ipcRenderer.invoke('get-recent-transcriptions'),
    getTranscriptions: () => {
      logger.debug('Preload: getTranscriptions called');
      return ipcRenderer.invoke('get-transcriptions');
    },
    getTranscription: (id: string) => {
      logger.debug('Preload: getTranscription called for ID:', { id });
      return ipcRenderer.invoke('get-transcription', id);
    },
    deleteTranscription: (id: string) => {
      logger.debug('Preload: deleteTranscription called for ID:', { id });
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

  logger.debug('API methods being exposed:', { methods: Object.keys(api) });
  contextBridge.exposeInMainWorld('electronAPI', api);
  logger.debug('electronAPI successfully exposed to renderer process');
} catch (error) {
  logger.error('Error in preload script:', { error: (error as Error).message });
}
