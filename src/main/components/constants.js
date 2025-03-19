// Define constants
const path = require('path');
const os = require('os');
const { AUDIO_SETTINGS } = require('../../shared/constants');

const TEMP_DIR = path.join(os.tmpdir(), 'voice-vibe');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, `recording.${AUDIO_SETTINGS.FILE_FORMAT}`);
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Voice Vibe');
const GROQ_MODELS = require('../services/groq').GROQ_MODELS;
// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  defaultLanguage: 'auto',
  transcriptionModel: GROQ_MODELS.TRANSCRIPTION.ENGLISH,
  showNotifications: true,
  saveTranscriptionsAutomatically: false,
};

module.exports = {
  TEMP_DIR,
  AUDIO_FILE_PATH,
  DEFAULT_SAVE_DIR,
  DEFAULT_SETTINGS
}; 