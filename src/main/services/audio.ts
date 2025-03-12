import { IpcMain, BrowserWindow, desktopCapturer } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AudioDevice, IPC_CHANNELS } from '../../shared/types';
import { AUDIO_SETTINGS } from '../../shared/constants';

// Define constants for audio recording
const TEMP_DIR = path.join(os.tmpdir(), 'dictation-app');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create temp directory:', error);
  }
}

/**
 * Sets up IPC handlers for audio recording functionality
 * @param ipcMain - Electron IPC main instance
 * @param mainWindow - Reference to the main BrowserWindow
 */
export const setupAudioRecording = (ipcMain: IpcMain, mainWindow: BrowserWindow | null): void => {
  // Get available audio input devices
  ipcMain.handle(IPC_CHANNELS.GET_AUDIO_DEVICES, async () => {
    try {
      // Note: desktopCapturer.getSources only supports 'screen' and 'window' types
      // For audio devices, we need to use navigator.mediaDevices.enumerateDevices() in the renderer
      // This is a workaround to get some audio sources
      const sources = await desktopCapturer.getSources({ types: ['window'] });
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        isDefault: false
      } as AudioDevice));
    } catch (error) {
      console.error('Failed to get audio sources:', error);
      return [];
    }
  });

  // Start recording with selected audio source
  ipcMain.handle(IPC_CHANNELS.START_RECORDING, async (_, sourceId: string) => {
    try {
      if (mainWindow) {
        // Send the sourceId to the renderer to start recording
        mainWindow.webContents.send('recording-source-selected', sourceId);
        return { success: true };
      }
      return { success: false, error: 'Main window not available' };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Save the recorded audio blob sent from the renderer
  ipcMain.handle('save-recording', async (_, arrayBuffer: ArrayBuffer) => {
    try {
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(AUDIO_FILE_PATH, buffer, { encoding: 'binary' });
      return { success: true, filePath: AUDIO_FILE_PATH };
    } catch (error) {
      console.error('Failed to save recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get the path to the saved recording
  ipcMain.handle('get-recording-path', () => {
    return AUDIO_FILE_PATH;
  });
}; 