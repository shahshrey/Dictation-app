import { IpcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AudioDevice, IPC_CHANNELS } from '../../shared/types';
import { AUDIO_SETTINGS } from '../../shared/constants';
import logger from '../../shared/logger';
import { updateTrayMenu } from './trayManager';

// Define constants for audio recording
const TEMP_DIR = path.join(os.tmpdir(), 'voice-vibe');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);

// Ensure temp directory exists
try {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
} catch (error) {
  logger.error('Failed to create temp directory:', { error: (error as Error).message });
}

/**
 * A complete module for managing audio recording functionality
 * Consolidates all recording-related functions in one place
 */
export class RecordingManager {
  private ipcMain: IpcMain;
  private mainWindow: BrowserWindow | null;
  private popupWindow: BrowserWindow | null;
  private isRecording: boolean;

  /**
   * Creates a new RecordingManager instance
   * @param ipcMain - Electron IPC main instance
   * @param mainWindow - Reference to the main BrowserWindow
   * @param popupWindow - Reference to the popup BrowserWindow
   */
  constructor(
    ipcMain: IpcMain,
    mainWindow: BrowserWindow | null,
    popupWindow: BrowserWindow | null
  ) {
    this.ipcMain = ipcMain;
    this.mainWindow = mainWindow;
    this.popupWindow = popupWindow;
    this.isRecording = false;
    this.setupIpcHandlers();
  }

  /**
   * Set up all IPC handlers related to recording
   */
  private setupIpcHandlers(): void {
    // Get available audio input devices
    this.ipcMain.handle(IPC_CHANNELS.GET_AUDIO_DEVICES, this.getAudioDevices.bind(this));

    // Receive audio devices from renderer process
    this.ipcMain.on(IPC_CHANNELS.AUDIO_DEVICES_RESULT, this.handleAudioDevicesResult.bind(this));

    // Start recording with selected audio source
    this.ipcMain.handle(IPC_CHANNELS.START_RECORDING, this.startRecording.bind(this));

    // Stop recording
    this.ipcMain.handle('stop-recording', this.stopRecording.bind(this));

    // Save the recorded audio blob sent from the renderer
    this.ipcMain.handle('save-recording', this.saveRecording.bind(this));

    // Get the path to the saved recording
    this.ipcMain.handle('get-recording-path', this.getRecordingPath.bind(this));
  }

  /**
   * Request audio devices from the renderer process
   */
  private async getAudioDevices(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.mainWindow) {
        throw new Error('Main window not available');
      }

      // Request the renderer process to enumerate audio devices
      // This is more reliable than using desktopCapturer for audio devices
      this.mainWindow.webContents.send(IPC_CHANNELS.AUDIO_DEVICES_REQUEST);

      // The actual device list will be sent back from the renderer process
      // via a separate IPC channel (AUDIO_DEVICES_RESULT)
      return { success: true };
    } catch (error) {
      logger.error('Failed to request audio devices:', { error: (error as Error).message });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Handle audio devices result from renderer process
   */
  private handleAudioDevicesResult(_: Electron.IpcMainEvent, devices: AudioDevice[]): void {
    try {
      if (this.mainWindow) {
        // Store the devices in the main process if needed
        // And send them back to any renderer process that might need them
        this.mainWindow.webContents.send(IPC_CHANNELS.AUDIO_DEVICES_RESULT, devices);
      }
    } catch (error) {
      logger.error('Error handling audio devices result:', { error: (error as Error).message });
    }
  }

  /**
   * Start recording with the selected audio source
   */
  private async startRecording(
    _: Electron.IpcMainInvokeEvent,
    sourceId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('Starting recording with source ID:', { sourceId });

      // Update recording state
      this.isRecording = true;
      // For backward compatibility with existing code
      if (typeof global !== 'undefined') {
        // Using type assertion to avoid TypeScript errors
        (global as Record<string, unknown>).isRecording = true;
      }

      // Update tray menu to reflect recording state
      updateTrayMenu();

      if (this.mainWindow) {
        // Send the sourceId to the renderer to start recording
        this.mainWindow.webContents.send('recording-source-selected', sourceId);
      }

      // Update popup window UI if available
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        try {
          this.popupWindow.webContents.send('update-recording-state', true);
        } catch (error) {
          logger.error('Error updating popup recording state:', {
            error: (error as Error).message,
          });
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to start recording:', { error: (error as Error).message });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Stop recording
   */
  private async stopRecording(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug('Stopping recording');

      // Update recording state
      this.isRecording = false;
      // For backward compatibility with existing code
      if (typeof global !== 'undefined') {
        // Using type assertion to avoid TypeScript errors
        (global as Record<string, unknown>).isRecording = false;
      }

      // Update tray menu to reflect recording state
      updateTrayMenu();

      // Update popup window to show not recording state
      if (this.popupWindow && !this.popupWindow.isDestroyed()) {
        try {
          // Update UI to show not recording state
          this.popupWindow.webContents.send('update-recording-state', false);

          // Ensure popup window stays on top
          this.popupWindow.setAlwaysOnTop(true, 'screen-saver');
          if (typeof this.popupWindow.setVisibleOnAllWorkspaces === 'function') {
            this.popupWindow.setVisibleOnAllWorkspaces(true, {
              visibleOnFullScreen: true,
              skipTransformProcessType: true,
            });
          }

          // For macOS, ensure window level is set to floating
          if (process.platform === 'darwin') {
            if (typeof this.popupWindow.setWindowButtonVisibility === 'function') {
              this.popupWindow.setWindowButtonVisibility(false);
            }
          }
        } catch (error) {
          logger.error('Error updating popup window:', { error: (error as Error).message });
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to stop recording:', { error: (error as Error).message });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get recording state
   */
  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Save the recorded audio blob sent from the renderer
   */
  private async saveRecording(
    _: Electron.IpcMainInvokeEvent,
    arrayBuffer: ArrayBuffer
  ): Promise<{ success: boolean; filePath?: string; size?: number; error?: string }> {
    try {
      logger.debug('Saving recording, buffer size:', { size: arrayBuffer.byteLength });

      // Validate that we have actual data
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        logger.error('Error: Empty audio buffer received');
        return { success: false, error: 'Empty audio buffer received' };
      }

      const buffer = Buffer.from(arrayBuffer);

      // Ensure the temp directory exists
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(AUDIO_FILE_PATH, buffer, { encoding: 'binary' });

      // Verify the file was written correctly
      if (fs.existsSync(AUDIO_FILE_PATH)) {
        const stats = fs.statSync(AUDIO_FILE_PATH);
        logger.debug(`Recording saved successfully: ${AUDIO_FILE_PATH}, size: ${stats.size} bytes`);

        if (stats.size === 0) {
          logger.error('Error: File was saved but is empty');
          return {
            success: false,
            error: 'File was saved but is empty',
            filePath: AUDIO_FILE_PATH,
          };
        }

        return { success: true, filePath: AUDIO_FILE_PATH, size: stats.size };
      } else {
        logger.error('Error: File was not saved');
        return { success: false, error: 'File was not saved' };
      }
    } catch (error) {
      logger.error('Failed to save recording:', { error: (error as Error).message });
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get the path to the saved recording
   */
  private getRecordingPath(): string {
    return AUDIO_FILE_PATH;
  }

  /**
   * Helper method to create a RecordingManager instance
   */
  public static initialize(
    ipcMain: IpcMain,
    mainWindow: BrowserWindow | null,
    popupWindow: BrowserWindow | null
  ): RecordingManager {
    return new RecordingManager(ipcMain, mainWindow, popupWindow);
  }
}

// Export constants for use in other modules
export { TEMP_DIR, AUDIO_FILE_PATH };
