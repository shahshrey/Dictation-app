/**
 * Node.js specific path constants for the main process
 */
import * as path from 'path';
import * as os from 'os';
import { AUDIO_SETTINGS } from '../../shared/constants';

// File paths and directories
export const TEMP_DIR: string = path.join(os.tmpdir(), 'voice-vibe');
export const DEFAULT_SAVE_DIR: string = path.join(os.homedir(), 'Documents', 'Voice Vibe');
export const AUDIO_FILE_PATH: string = path.join(
  TEMP_DIR,
  `recording.${AUDIO_SETTINGS.FILE_FORMAT}`
);
