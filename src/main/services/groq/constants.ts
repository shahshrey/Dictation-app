import * as path from 'path';
import * as os from 'os';
import { AUDIO_SETTINGS } from '../../../shared/constants';

// File paths and directories
export const TEMP_DIR = path.join(os.tmpdir(), 'voice-vibe');
export const AUDIO_FILE_PATH = path.join(TEMP_DIR, `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);
export const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Voice Vibe');
