import * as fs from 'fs';
import logger from '../../../shared/logger';
import { initGroqClient } from './client';
import { GROQ_MODELS, TranslateAudioResult, TranslateOptions } from './types';

/**
 * Translate audio from file path
 */
export const handleTranslateAudio = async (
  filePath: string,
  options: TranslateOptions
): Promise<TranslateAudioResult> => {
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

    const translation = await client.audio.translations.create({
      file: audioFile,
      model: GROQ_MODELS.TRANSLATION,
    });

    return {
      success: true,
      text: translation.text,
      model: GROQ_MODELS.TRANSLATION,
    };
  } catch (error) {
    logger.error('Failed to translate audio:', { error: (error as Error).message });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
