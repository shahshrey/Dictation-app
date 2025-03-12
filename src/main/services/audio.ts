import { IpcMain, BrowserWindow, desktopCapturer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AudioDevice, IPC_CHANNELS } from '../../shared/types';
import { AUDIO_SETTINGS } from '../../shared/constants';
import { getLogger } from '../../shared/logger';

// Get the logger instance
const logger = getLogger('main');

// Define constants for audio recording
const TEMP_DIR = path.join(os.tmpdir(), 'dictation-app');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Failed to create temp directory');
    } else {
      logger.error('Failed to create temp directory', { error: String(error) });
    }
  }
}

/**
 * Sets up IPC handlers for audio recording functionality
 * @param ipcMain - Electron IPC main instance
 * @param mainWindow - Reference to the main BrowserWindow
 */
export const setupAudioRecording = (ipcMain: IpcMain, mainWindow: BrowserWindow | null): void => {
  logger.info('Setting up audio recording handlers');
  
  // Get available audio input devices
  ipcMain.handle(IPC_CHANNELS.GET_AUDIO_DEVICES, async () => {
    try {
      if (!mainWindow) {
        logger.warn('Main window not available for audio device request');
        throw new Error('Main window not available');
      }
      
      logger.debug('Requesting audio devices from renderer process');
      // Request the renderer process to enumerate audio devices
      // This is more reliable than using desktopCapturer for audio devices
      mainWindow.webContents.send(IPC_CHANNELS.AUDIO_DEVICES_REQUEST);
      
      // The actual device list will be sent back from the renderer process
      // via a separate IPC channel (AUDIO_DEVICES_RESULT)
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to request audio devices');
      } else {
        logger.error('Failed to request audio devices', { error: String(error) });
      }
      return { success: false, error: String(error) };
    }
  });

  // Receive audio devices from renderer process
  ipcMain.on(IPC_CHANNELS.AUDIO_DEVICES_RESULT, (_, devices: AudioDevice[]) => {
    logger.debug('Received audio devices from renderer', { deviceCount: devices.length });
    
    if (mainWindow) {
      // Store the devices in the main process if needed
      // And send them back to any renderer process that might need them
      mainWindow.webContents.send(IPC_CHANNELS.AUDIO_DEVICES_RESULT, devices);
      logger.debug('Forwarded audio devices to main window');
    } else {
      logger.warn('Main window not available to forward audio devices');
    }
  });

  // Start recording with selected audio source
  ipcMain.handle(IPC_CHANNELS.START_RECORDING, async (_, sourceId: string) => {
    try {
      logger.debug('Start recording request received', { sourceId });
      
      if (mainWindow) {
        // Send the sourceId to the renderer to start recording
        mainWindow.webContents.send('recording-source-selected', sourceId);
        logger.info('Recording started with source', { sourceId });
        return { success: true };
      }
      
      logger.warn('Main window not available for recording');
      return { success: false, error: 'Main window not available' };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to start recording');
      } else {
        logger.error('Failed to start recording', { error: String(error) });
      }
      return { success: false, error: String(error) };
    }
  });

  // Save the recorded audio blob sent from the renderer
  ipcMain.handle('save-recording', async (_, arrayBuffer: ArrayBuffer) => {
    try {
      logger.debug('Saving recording', { size: arrayBuffer.byteLength });
      
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(AUDIO_FILE_PATH, buffer, { encoding: 'binary' });
      
      const stats = fs.statSync(AUDIO_FILE_PATH);
      logger.info('Recording saved successfully', { 
        filePath: AUDIO_FILE_PATH, 
        size: stats.size 
      });
      
      return { success: true, filePath: AUDIO_FILE_PATH };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to save recording');
      } else {
        logger.error('Failed to save recording', { error: String(error) });
      }
      return { success: false, error: String(error) };
    }
  });

  // Get the path to the saved recording
  ipcMain.handle('get-recording-path', () => {
    logger.debug('Getting recording path', { path: AUDIO_FILE_PATH });
    return AUDIO_FILE_PATH;
  });
  
  logger.info('Audio recording handlers registered successfully');
}; 