/**
 * Node.js specific path constants for the main process
 */
import * as path from 'path';
import * as os from 'os';
import { AUDIO_SETTINGS } from '../../shared/constants';
import { storeService } from './StoreService';

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

  return { tempDir, saveDir };
};

// Dynamic path getters that read from settings
export const getTempDir = (): string => {
  return getSettingsPath().tempDir;
};

export const getSaveDir = (): string => {
  return getSettingsPath().saveDir;
};

export const getAudioFilePath = (): string => {
  return path.join(getTempDir(), `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);
};

// For backward compatibility - should be used only in places that can't use the dynamic getters
export const TEMP_DIR: string = DEFAULT_TEMP_DIR;
export const AUDIO_FILE_PATH: string = path.join(
  TEMP_DIR,
  `recording.${AUDIO_SETTINGS.FILE_FORMAT}`
);
