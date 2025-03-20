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
import { getAudioFilePath, getTempDir } from '../path-constants';
import * as path from 'path';

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
                    7. Don't provide any headers or titles.
                    8. you MUST ONLY return the cleaned transcription text and nothing else`,
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

    // Get the temporary audio file path (the original recording)
    const originalAudioFilePath = getAudioFilePath();

    if (!validateAudioFile(originalAudioFilePath)) {
      return { success: false, error: 'Invalid audio file' };
    }

    const fileStats = getFileStats(originalAudioFilePath);
    if (!fileStats) {
      return { success: false, error: 'Failed to get file stats' };
    }

    // Generate a unique ID for both transcript and audio files
    const datePart = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14); // YYYYMMDDHHMMSS
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const fileId = `transcript_${datePart}_${randomPart}`;

    // Create the permanent audio file path with the same ID
    const permanentAudioFilePath = getAudioFilePath(fileId);

    // Copy the audio file from temporary location to permanent location with unique name
    fs.copyFileSync(originalAudioFilePath, permanentAudioFilePath);
    logger.debug('Audio file copied to permanent location:', { path: permanentAudioFilePath });

    // Use the permanent file for transcription
    const audioFile = fs.createReadStream(permanentAudioFilePath);

    // Prepare transcription parameters
    const normalizedLanguage = normalizeLanguage(language);
    const model = selectTranscriptionModel(normalizedLanguage);

    const transcriptionParams: TranscriptionParams = {
      file: audioFile,
      model,
      language: normalizedLanguage,
    };
    console.log('transcriptionParams', JSON.stringify(transcriptionParams));
    const transcription = await client.audio.transcriptions.create(transcriptionParams);
    const rawText = transcription.text;

    // Process the transcription
    logger.debug('Raw transcription text:', { rawText });
    const processedText = await processTranscriptionText(rawText, apiKey);
    logger.debug('Processed transcription text:', { processedText });

    // Create metadata using our pre-generated ID
    const timestamp = Date.now();
    const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);

    const transcriptionObject: TranscriptionObject = {
      id: fileId,
      text: processedText,
      rawText,
      timestamp,
      duration,
      language: normalizedLanguage,
      wordCount: processedText.split(/\s+/).length,
      source: 'recording',
      confidence: 0.95, // Default confidence value
      audioFilePath: permanentAudioFilePath,
      title: `Recording ${new Date(timestamp).toLocaleString()}`,
      pastedAtCursor: false,
    };

    // Save to file with our consistent ID
    const { filePath } = saveTranscriptionToFile(transcriptionObject);

    // Add a small delay to ensure file system operations are complete
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      id: fileId,
      text: processedText,
      rawText,
      timestamp,
      duration,
      language: normalizedLanguage,
      filePath,
      audioFilePath: permanentAudioFilePath,
      pastedAtCursor: false,
      title: transcriptionObject.title,
      wordCount: transcriptionObject.wordCount,
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

    // Generate a unique ID for both transcript and audio files
    const datePart = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14); // YYYYMMDDHHMMSS
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const fileId = `transcript_${datePart}_${randomPart}`;

    const tempDir = getTempDir();
    // Create new path with our consistent ID
    const newFilePath = path.join(tempDir, `${fileId}.${path.extname(filePath).substring(1)}`);

    // Create a copy of the file with the unique ID as filename
    fs.copyFileSync(filePath, newFilePath);
    logger.debug('Audio file copied with unique ID:', { path: newFilePath });

    const audioFile = fs.createReadStream(newFilePath);
    const language = normalizeLanguage(options.language || 'auto');
    const model = options.model || selectTranscriptionModel(language);

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model,
      language,
    });

    const processedText = await processTranscriptionText(transcription.text, apiKey);

    // Create and save transcript with the same ID
    const timestamp = Date.now();
    const transcriptionObject: TranscriptionObject = {
      id: fileId,
      text: processedText,
      rawText: transcription.text,
      timestamp,
      duration: 0, // We don't have duration info for uploaded files
      language,
      wordCount: processedText.split(/\s+/).length,
      source: 'upload',
      confidence: 0.95,
      audioFilePath: newFilePath,
    };

    const { filePath: transcriptPath } = saveTranscriptionToFile(transcriptionObject);

    return {
      success: true,
      text: processedText,
      rawText: transcription.text,
      language,
      model,
      audioFilePath: newFilePath,
      transcriptFilePath: transcriptPath,
      id: fileId,
    };
  } catch (error) {
    logger.error('Failed to transcribe audio:', { error: (error as Error).message });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
