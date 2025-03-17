// Define constants
const path = require('path');
const os = require('os');

const TEMP_DIR = path.join(os.tmpdir(), 'dictation-app');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, 'recording.webm');
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Dictation App');

// Define Groq API models
const GROQ_MODELS = {
  TRANSCRIPTION: {
    MULTILINGUAL: 'whisper-large-v3',
    MULTILINGUAL_TURBO: 'whisper-large-v3-turbo',
    ENGLISH: 'distil-whisper-large-v3-en',
  },
  TRANSLATION: 'whisper-large-v3',
};

// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  defaultLanguage: 'auto',
  transcriptionModel: GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL,
  showNotifications: true,
  saveTranscriptionsAutomatically: false,
};

module.exports = {
  TEMP_DIR,
  AUDIO_FILE_PATH,
  DEFAULT_SAVE_DIR,
  GROQ_MODELS,
  DEFAULT_SETTINGS
}; 