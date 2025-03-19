import * as fs from 'fs';

// Groq API models
export const GROQ_MODELS = {
  TRANSCRIPTION: {
    MULTILINGUAL: 'whisper-large-v3',
    MULTILINGUAL_TURBO: 'whisper-large-v3-turbo',
    ENGLISH: 'distil-whisper-large-v3-en',
  },
  TRANSLATION: 'whisper-large-v3',
};

export interface TranscriptionResult {
  success: boolean;
  id?: string;
  text?: string;
  rawText?: string;
  timestamp?: number;
  duration?: number;
  language?: string;
  filePath?: string;
  pastedAtCursor?: boolean;
  error?: string;
}

export interface TranscriptionObject {
  id: string;
  text: string;
  rawText: string;
  timestamp: number;
  duration: number;
  language: string;
  wordCount: number;
  source: string;
  confidence: number;
}

export interface TranscriptionParams {
  file: fs.ReadStream;
  model: string;
  language?: string;
}

export interface TranscribeAudioResult {
  success: boolean;
  text?: string;
  rawText?: string;
  language?: string;
  model?: string;
  error?: string;
}

export interface TranslateAudioResult {
  success: boolean;
  text?: string;
  model?: string;
  error?: string;
}

export interface TranscribeOptions {
  language?: string;
  apiKey?: string;
  model?: string;
}

export interface TranslateOptions {
  apiKey?: string;
}
