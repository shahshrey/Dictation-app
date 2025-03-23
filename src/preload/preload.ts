import { contextBridge, ipcRenderer } from 'electron';
import { AudioDevice, IPC_CHANNELS, Transcription } from '../shared/types';
import { STORAGE_CHANNELS } from '../shared/storage';
import logger from '../shared/logger';
import { AUDIO_PLAYER_CHANNELS } from '../main/services/audio/audioPlayer';

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
    notifyRecordingStateChange: (isRecording: boolean) =>
      ipcRenderer.invoke('notify-recording-state-change', isRecording),

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

    // Audio playback
    getAudioFileStatus: (filePath: string) => {
      logger.debug('Preload: getAudioFileStatus called for path:', { filePath });

      // Log the file:// URL that would be created for this path
      const fileUrl = `file://${filePath}`;
      logger.debug('Preload: Constructed file URL would be:', {
        fileUrl,
        encodedUrl: encodeURI(fileUrl),
      });

      try {
        const result = ipcRenderer.invoke(AUDIO_PLAYER_CHANNELS.GET_AUDIO_FILE_STATUS, filePath);

        // Add debug logging for the promise
        result
          .then(status => {
            logger.debug('Preload: getAudioFileStatus returned result:', {
              status,
              exists: status.exists,
              filePath,
            });
          })
          .catch(error => {
            logger.error('Preload: getAudioFileStatus promise rejected:', {
              error: error.message,
              filePath,
            });
          });

        return result;
      } catch (error) {
        logger.error('Preload: getAudioFileStatus threw an exception:', {
          error: (error as Error).message,
          stack: (error as Error).stack,
          filePath,
        });
        throw error;
      }
    },

    // Permissions
    notifyPermissionIssue: (permissionType: 'microphone' | 'accessibility') => {
      logger.debug('Preload: notifyPermissionIssue called for permission type:', {
        permissionType,
      });
      ipcRenderer.send('permission-issue', permissionType);
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

    // API validation
    testApiKey: (apiKey: string) => {
      logger.debug('Preload: testApiKey called with API key available:', { available: !!apiKey });
      return ipcRenderer.invoke('testApiKey', apiKey);
    },

    // File storage
    saveTranscription: (
      transcription: Transcription,
      options?: { filename?: string; format?: string }
    ) => {
      logger.debug('Preload: saveTranscription called with transcription ID:', {
        id: transcription.id,
      });
      return ipcRenderer.invoke(STORAGE_CHANNELS.SAVE_TRANSCRIPTION, transcription, options || {});
    },
    saveTranscriptionAs: (transcription: Transcription) => {
      logger.debug('Preload: saveTranscriptionAs called with transcription ID:', {
        id: transcription.id,
      });
      return ipcRenderer.invoke(STORAGE_CHANNELS.SAVE_TRANSCRIPTION_AS, transcription);
    },
    getRecentTranscriptions: () => ipcRenderer.invoke(STORAGE_CHANNELS.GET_RECENT_TRANSCRIPTIONS),
    getTranscriptions: () => {
      logger.debug('Preload: getTranscriptions called');
      return ipcRenderer.invoke(STORAGE_CHANNELS.GET_TRANSCRIPTIONS);
    },
    getTranscription: (id: string) => {
      logger.debug('Preload: getTranscription called for ID:', { id });
      return ipcRenderer.invoke(STORAGE_CHANNELS.GET_TRANSCRIPTION, id);
    },
    deleteTranscription: (id: string) => {
      logger.debug('Preload: deleteTranscription called for ID:', { id });
      return ipcRenderer.invoke(STORAGE_CHANNELS.DELETE_TRANSCRIPTION, id);
    },
    openFile: (path: string) => {
      logger.debug('Preload: openFile called for path:', { path });
      return ipcRenderer.invoke(STORAGE_CHANNELS.OPEN_FILE, path);
    },

    // Directory picker
    showDirectoryPicker: () => {
      logger.debug('Preload: showDirectoryPicker called');
      return ipcRenderer.invoke('showDirectoryPicker');
    },

    // Event listeners
    onToggleRecording: (callback: () => void) => {
      const subscription = (_event: Electron.IpcRendererEvent) => callback();
      ipcRenderer.on('toggle-recording', subscription);
      return () => {
        ipcRenderer.removeListener('toggle-recording', subscription);
      };
    },

    onRecordingToggleRequested: (callback: () => void) => {
      const subscription = (_event: Electron.IpcRendererEvent) => callback();
      ipcRenderer.on('recording-toggle-requested', subscription);
      return () => {
        ipcRenderer.removeListener('recording-toggle-requested', subscription);
      };
    },

    onUpdateRecordingState: (callback: (isRecording: boolean) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, isRecording: boolean) =>
        callback(isRecording);
      ipcRenderer.on('update-recording-state', subscription);
      return () => {
        ipcRenderer.removeListener('update-recording-state', subscription);
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

    // Add minimize window function
    minimizeMainWindow: () => ipcRenderer.invoke('minimize-main-window'),

    // Add resize popup window function
    resizePopupWindow: (isRecording: boolean) =>
      ipcRenderer.invoke('resize-popup-window', isRecording),

    // Clipboard utilities
    pasteTextAtCursor: (text: string) => ipcRenderer.invoke('paste-text-at-cursor', text),
  };

  logger.debug('API methods being exposed:', { methods: Object.keys(api) });
  contextBridge.exposeInMainWorld('electronAPI', api);
  logger.debug('electronAPI successfully exposed to renderer process');
} catch (error) {
  logger.error('Error in preload script:', { error: (error as Error).message });
}
