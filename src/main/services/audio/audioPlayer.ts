import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import logger from '../../../shared/logger';
import * as path from 'path';

// Constants for IPC channels
const AUDIO_PLAYER_CHANNELS = {
  PLAY_AUDIO: 'play-audio',
  PAUSE_AUDIO: 'pause-audio',
  STOP_AUDIO: 'stop-audio',
  AUDIO_PLAYBACK_STATUS: 'audio-playback-status',
  GET_AUDIO_FILE_STATUS: 'get-audio-file-status',
};

interface AudioFileStatus {
  exists: boolean;
  size?: number;
  error?: string;
}

/**
 * Audio Player Service to handle playback of audio files associated with transcripts
 */
export class AudioPlayerManager {
  private ipcMain: typeof ipcMain;
  private mainWindow: BrowserWindow | null;

  constructor(ipcMainInstance: typeof ipcMain, mainWindow: BrowserWindow | null) {
    this.ipcMain = ipcMainInstance;
    this.mainWindow = mainWindow;
    this.setupIpcHandlers();
  }

  /**
   * Set up all IPC handlers related to audio playback
   */
  private setupIpcHandlers(): void {
    // Check if an audio file exists and return its status
    this.ipcMain.handle(
      AUDIO_PLAYER_CHANNELS.GET_AUDIO_FILE_STATUS,
      async (event: IpcMainInvokeEvent, filePath: string): Promise<AudioFileStatus> => {
        logger.debug('AudioPlayer (Main): getAudioFileStatus called for path:', { filePath });

        try {
          if (!filePath) {
            logger.error('AudioPlayer (Main): No file path provided');
            return { exists: false, error: 'No file path provided' };
          }

          // Log file path details for debugging
          logger.debug('AudioPlayer (Main): Checking if file exists:', {
            filePath,
            absolute: path.isAbsolute(filePath),
            normalized: path.normalize(filePath),
          });

          // Check if file exists
          const exists = fs.existsSync(filePath);
          logger.debug('AudioPlayer (Main): File exists check result:', { exists, filePath });

          if (!exists) {
            // Try to get parent directory info to check if it's accessible
            try {
              const dirPath = path.dirname(filePath);
              const dirExists = fs.existsSync(dirPath);
              logger.debug('AudioPlayer (Main): Parent directory check:', {
                dirPath,
                dirExists,
                canRead: dirExists ? fs.accessSync(dirPath, fs.constants.R_OK) : false,
              });
            } catch (dirError) {
              logger.error('AudioPlayer (Main): Error checking parent directory:', {
                error: (dirError as Error).message,
                dirPath: path.dirname(filePath),
              });
            }

            return { exists: false };
          }

          // Get file stats
          const stats = fs.statSync(filePath);
          logger.debug('AudioPlayer (Main): File stats:', {
            size: stats.size,
            isFile: stats.isFile(),
            permissions: stats.mode.toString(8),
            created: stats.birthtime,
            modified: stats.mtime,
          });

          return {
            exists: true,
            size: stats.size,
          };
        } catch (error) {
          logger.error('AudioPlayer (Main): Error checking audio file status:', {
            error: (error as Error).message,
            filePath,
            stack: (error as Error).stack,
          });

          return {
            exists: false,
            error: (error as Error).message,
          };
        }
      }
    );
  }

  /**
   * Initialize the AudioPlayerManager
   */
  public static initialize(
    ipcMainInstance: typeof ipcMain,
    mainWindow: BrowserWindow | null
  ): AudioPlayerManager {
    return new AudioPlayerManager(ipcMainInstance, mainWindow);
  }
}

export { AUDIO_PLAYER_CHANNELS };
