import { ipcMain } from 'electron';
import { 
  saveTranscription, 
  saveTranscriptionAs, 
  getRecentTranscriptions, 
  getTranscriptions,
  getTranscription,
  deleteTranscription,
  openFile
} from './storageManager';
import { STORAGE_CHANNELS } from '../../../shared/storage';

/**
 * Sets up storage-related IPC handlers
 */
export const setupStorageHandlers = (): void => {
  // Storage operations using the storage manager
  ipcMain.handle(STORAGE_CHANNELS.SAVE_TRANSCRIPTION, async (_, transcription, options) => {
    return await saveTranscription(transcription, options);
  });

  ipcMain.handle(STORAGE_CHANNELS.SAVE_TRANSCRIPTION_AS, async (_, transcription) => {
    return await saveTranscriptionAs(transcription);
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_RECENT_TRANSCRIPTIONS, async () => {
    return await getRecentTranscriptions();
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_TRANSCRIPTIONS, async () => {
    return await getTranscriptions();
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_TRANSCRIPTION, async (_, id) => {
    return await getTranscription(id);
  });

  ipcMain.handle(STORAGE_CHANNELS.DELETE_TRANSCRIPTION, async (_, id) => {
    return await deleteTranscription(id);
  });

  ipcMain.handle(STORAGE_CHANNELS.OPEN_FILE, (_, filePath) => {
    return openFile(filePath);
  });
};

export default { setupStorageHandlers }; 