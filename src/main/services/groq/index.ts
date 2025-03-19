import { setupGroqAPI } from './ipc';
import {
  transcribeRecording,
  handleTranscribeAudio,
  processTranscriptionText,
} from './transcription';
import { handleTranslateAudio } from './translation';
import { initGroqClient } from './client';
import { GROQ_MODELS } from './types';

// Re-export all the functionalities
export {
  setupGroqAPI,
  transcribeRecording,
  handleTranscribeAudio,
  handleTranslateAudio,
  processTranscriptionText,
  initGroqClient,
  GROQ_MODELS,
};

// Default export for compatibility with JavaScript code
export default {
  groqClient: null, // This will be initialized when needed
  initGroqClient,
  transcribeRecording,
  setupGroqAPI,
  GROQ_MODELS,
};
