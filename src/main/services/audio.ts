import { ipcMain, BrowserWindow } from 'electron';
import logger from '../../shared/logger';

interface AudioSource {
  id: string;
  name: string;
}

/**
 * Sets up audio-related IPC handlers
 * @param mainWindow - The main application window
 */
export const setupAudioHandlers = (mainWindow: BrowserWindow): void => {
  // Get available audio input devices
  ipcMain.handle('get-audio-sources', async (): Promise<AudioSource[]> => {
    try {
      return await mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.filter(device => device.kind === 'audioinput')
          .map(device => ({ id: device.deviceId, name: device.label || 'Microphone ' + device.deviceId })))
      `);
    } catch (error) {
      logger.error('Failed to get audio sources:', { error: (error as Error).message });
      return [];
    }
  });
};

export default { setupAudioHandlers }; 