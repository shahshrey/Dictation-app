import { ipcMain, dialog } from 'electron';
import logger from '../../shared/logger';

/**
 * Sets up file dialog related IPC handlers
 */
export const setupFileDialogHandlers = (): void => {
  // Show directory picker dialog
  ipcMain.handle('showDirectoryPicker', async (): Promise<string | null> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Directory for Saving Transcriptions',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      return result.filePaths[0];
    } catch (error) {
      logger.error('Error showing directory picker:', { error: (error as Error).message });
      return null;
    }
  });
};

export default { setupFileDialogHandlers }; 