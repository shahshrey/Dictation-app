import { Groq } from 'groq-sdk';
import logger from '../../../shared/logger';

// Groq client state
let groqClient: Groq | null = null;

/**
 * Initialize the Groq client with the API key
 */
export const initGroqClient = (apiKey: string): Groq | null => {
  try {
    if (!apiKey) return null;

    const currentClient = groqClient as unknown as { _options?: { apiKey: string } };
    if (!groqClient || currentClient._options?.apiKey !== apiKey) {
      groqClient = new Groq({ apiKey });
    }

    return groqClient;
  } catch (error) {
    logger.error('Failed to initialize Groq client:', { error: (error as Error).message });
    return null;
  }
};

export default {
  groqClient,
  initGroqClient,
};
