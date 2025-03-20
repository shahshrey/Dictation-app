import * as path from 'path';
import * as os from 'os';
import { AUDIO_SETTINGS } from '../../shared/constants';
import { GROQ_MODELS } from './groq';

// Define constants
export const TEMP_DIR: string = path.join(os.tmpdir(), 'voice-vibe');
export const AUDIO_FILE_PATH: string = path.join(
  TEMP_DIR,
  `recording.${AUDIO_SETTINGS.FILE_FORMAT}`
);
export const DEFAULT_SAVE_DIR: string = path.join(os.homedir(), 'Documents', 'Voice Vibe');

// Default settings
export interface DefaultSettings {
  apiKey: string;
  defaultLanguage: string;
  transcriptionModel: string;
  showNotifications: boolean;
  saveTranscriptionsAutomatically: boolean;
}

export const DEFAULT_SETTINGS: DefaultSettings = {
  apiKey: '',
  defaultLanguage: 'auto',
  transcriptionModel: GROQ_MODELS.TRANSCRIPTION.ENGLISH,
  showNotifications: true,
  saveTranscriptionsAutomatically: false,
};
