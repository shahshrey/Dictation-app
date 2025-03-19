import * as fs from 'fs';
import logger from '../../../shared/logger';
import { initGroqClient } from './client';
import { saveTranscriptionToFile, validateAudioFile, getFileStats } from './file-utils';
import {
  GROQ_MODELS,
  TranscriptionResult,
  TranscriptionObject,
  TranscriptionParams,
  TranscribeAudioResult,
  TranscribeOptions,
} from './types';
import { AUDIO_FILE_PATH } from './constants';

/**
 * Process transcription text with Groq LLM to improve clarity
 */
export const processTranscriptionText = async (text: string, apiKey: string): Promise<string> => {
  try {
    logger.debug('Processing transcription text:', { text });
    if (!text) return '';

    const client = initGroqClient(apiKey);
    if (!client) return text;

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert transcription editor. Your task is to:
                    1. Clean up the transcribed text
                    2. Improve clarity while preserving meaning
                    3. Format using markdown
                    4. Do not add any commentary or extra text.
                    5. Create bullet points from the text if appropriate.
                    6. If the text is a long Paragraph, preserve the original meaning and structure but make it more readable.
                    7. you MUST ONLY return the cleaned transcription text and nothing else`,
        },
        {
          role: 'user',
          content: `Please clean up this transcription text to make it clearer and more understandable: <text>${text}</text>`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
    });

    return completion.choices[0]?.message?.content || text;
  } catch (error) {
    logger.error('Failed to process transcription text:', { error: (error as Error).message });
    return text;
  }
};

/**
 * Select appropriate transcription model based on language
 */
const selectTranscriptionModel = (language: string): string => {
  return language === 'en'
    ? GROQ_MODELS.TRANSCRIPTION.ENGLISH
    : GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL;
};

/**
 * Normalize language parameter
 */
const normalizeLanguage = (language: string): string => {
  return language && language !== 'auto' ? language : 'en';
};

/**
 * Create transcription metadata
 */
const createTranscriptionMetadata = (
  rawText: string,
  processedText: string,
  language: string,
  fileStats: fs.Stats
): {
  id: string;
  timestamp: number;
  duration: number;
  transcriptionObject: TranscriptionObject;
} => {
  const id = `transcription-${Date.now()}`;
  const timestamp = Date.now();
  const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);

  const transcriptionObject: TranscriptionObject = {
    id: `transcription_${new Date().toISOString().replace(/[:.]/g, '-')}`,
    text: processedText,
    rawText,
    timestamp,
    duration,
    language,
    wordCount: processedText.split(/\s+/).length,
    source: 'recording',
    confidence: 0.95, // Default confidence value
  };

  return { id, timestamp, duration, transcriptionObject };
};

/**
 * Transcribe a recording file using Groq API
 */
export const transcribeRecording = async (
  language: string,
  apiKey: string
): Promise<TranscriptionResult> => {
  try {
    if (!apiKey) {
      return { success: false, error: 'No API key provided' };
    }

    const client = initGroqClient(apiKey);
    if (!client) {
      return { success: false, error: 'Failed to initialize Groq client' };
    }

    if (!validateAudioFile(AUDIO_FILE_PATH)) {
      return { success: false, error: 'Invalid audio file' };
    }

    const fileStats = getFileStats(AUDIO_FILE_PATH);
    if (!fileStats) {
      return { success: false, error: 'Failed to get file stats' };
    }

    const audioFile = fs.createReadStream(AUDIO_FILE_PATH);

    // Prepare transcription parameters
    const normalizedLanguage = normalizeLanguage(language);
    const model = selectTranscriptionModel(normalizedLanguage);

    const transcriptionParams: TranscriptionParams = {
      file: audioFile,
      model,
      language: normalizedLanguage,
    };

    const transcription = await client.audio.transcriptions.create(transcriptionParams);
    const rawText = transcription.text;

    // Process the transcription
    logger.debug('Raw transcription text:', { rawText });
    const processedText = await processTranscriptionText(rawText, apiKey);
    logger.debug('Processed transcription text:', { processedText });
    // Create metadata and save transcription
    const { id, timestamp, duration, transcriptionObject } = createTranscriptionMetadata(
      rawText,
      processedText,
      normalizedLanguage,
      fileStats
    );

    // Save to file
    const filePath = saveTranscriptionToFile(transcriptionObject);

    // Add a small delay to ensure file system operations are complete
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      id,
      text: processedText,
      rawText,
      timestamp,
      duration,
      language: normalizedLanguage,
      filePath,
      pastedAtCursor: false,
    };
  } catch (error: unknown) {
    logger.error('Failed to transcribe recording', { error: (error as Error).message });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Transcribe audio from file path
 */
export const handleTranscribeAudio = async (
  filePath: string,
  options: TranscribeOptions
): Promise<TranscribeAudioResult> => {
  try {
    const apiKey = options.apiKey ?? '';
    const client = initGroqClient(apiKey);

    if (!client) {
      return { success: false, error: 'Groq API key not set or invalid' };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Audio file not found' };
    }

    const audioFile = fs.createReadStream(filePath);
    const language = normalizeLanguage(options.language || 'auto');
    const model = options.model || selectTranscriptionModel(language);

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model,
      language,
    });

    const processedText = await processTranscriptionText(transcription.text, apiKey);

    return {
      success: true,
      text: processedText,
      rawText: transcription.text,
      language,
      model,
    };
  } catch (error) {
    logger.error('Failed to transcribe audio:', { error: (error as Error).message });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
