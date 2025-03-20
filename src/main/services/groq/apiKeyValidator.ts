import { ipcMain } from 'electron';
import logger from '../../../shared/logger';

/**
 * Sets up API key validation IPC handlers
 */
export const setupApiKeyValidatorHandlers = (): void => {
  // Test API key validity by making a simple request to the Groq API
  ipcMain.handle('testApiKey', async (_, apiKey: string): Promise<boolean> => {
    try {
      if (!apiKey || !apiKey.trim()) {
        return false;
      }

      // Import the Groq SDK dynamically to avoid loading it unnecessarily
      // Using dynamic import for TypeScript compatibility
      const { default: Groq } = await import('groq-sdk');

      // Create a temporary Groq client with the provided API key
      const groqClient = new Groq({ apiKey });

      // Make a simple request to validate the API key
      const modelsResponse = await groqClient.models.list();

      // If we get a response, the API key is valid
      return Array.isArray(modelsResponse.data);
    } catch (error) {
      logger.error('API key validation failed:', { error: (error as Error).message });
      return false;
    }
  });
};

export default { setupApiKeyValidatorHandlers };
