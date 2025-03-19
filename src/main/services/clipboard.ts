import { ipcMain } from 'electron';
import logger from '../../shared/logger';
import { pasteTextAtCursor } from '../components/clipboardUtils';

/**
 * Sets up clipboard-related IPC handlers
 */
export const setupClipboardHandlers = (): void => {
  // Add handler for pasting text at cursor position
  ipcMain.handle('paste-text-at-cursor', async (_, text: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await pasteTextAtCursor(text);
      return { success: result };
    } catch (error) {
      logger.error('Error pasting text at cursor:', { error: (error as Error).message });
      return { success: false, error: String(error) };
    }
  });
};

export default { setupClipboardHandlers }; 