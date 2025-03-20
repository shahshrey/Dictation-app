/**
 * Node.js specific path constants for the main process
 */
import * as path from 'path';
import * as os from 'os';
import { AUDIO_SETTINGS } from '../../shared/constants';
import { storeService } from './StoreService';
import logger from '../../shared/logger';

// Default file paths and directories (used as fallbacks)
export const DEFAULT_TEMP_DIR: string = path.join(os.tmpdir(), 'voice-vibe');
export const DEFAULT_SAVE_DIR: string = path.join(os.homedir(), 'Documents', 'Voice Vibe');

// Get actual directories from settings or use defaults
export const getSettingsPath = (): { tempDir: string; saveDir: string } => {
  // Get settings from store service
  const settings = storeService.getSettings();

  // Safely check for transcriptionSavePath
  const transcriptionPath = (settings as Record<string, unknown>).transcriptionSavePath;

  // Use transcriptionSavePath from settings or fall back to default
  const saveDir =
    typeof transcriptionPath === 'string' && transcriptionPath.trim()
      ? transcriptionPath
      : DEFAULT_SAVE_DIR;

  // Safely check for audioSavePath
  const audioPath = (settings as Record<string, unknown>).audioSavePath;

  // Use audioSavePath from settings or fall back to default temp dir
  const tempDir = typeof audioPath === 'string' && audioPath.trim() ? audioPath : DEFAULT_TEMP_DIR;

  logger.debug('Path Constants: Got settings paths', { tempDir, saveDir });
  return { tempDir, saveDir };
};

// Dynamic path getters that read from settings
export const getTempDir = (): string => {
  const tempDir = getSettingsPath().tempDir;
  logger.debug('Path Constants: getTempDir() returned:', { tempDir });
  return tempDir;
};

export const getSaveDir = (): string => {
  const saveDir = getSettingsPath().saveDir;
  logger.debug('Path Constants: getSaveDir() returned:', { saveDir });
  return saveDir;
};

export const getAudioFilePath = (fileId?: string): string => {
  const fileName = fileId ? `${fileId}` : 'recording';
  const tempDir = getTempDir();
  const filePath = path.join(tempDir, `${fileName}.${AUDIO_SETTINGS.FILE_FORMAT}`);

  logger.debug('Path Constants: getAudioFilePath() generated path:', {
    fileId,
    tempDir,
    filePath,
    format: AUDIO_SETTINGS.FILE_FORMAT,
  });

  return filePath;
};

// For backward compatibility - should be used only in places that can't use the dynamic getters
export const TEMP_DIR: string = DEFAULT_TEMP_DIR;
export const AUDIO_FILE_PATH: string = path.join(
  TEMP_DIR,
  `recording.${AUDIO_SETTINGS.FILE_FORMAT}`
);
