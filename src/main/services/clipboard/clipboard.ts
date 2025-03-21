import { ipcMain, clipboard } from 'electron';
import { exec } from 'child_process';
import logger from '../../../shared/logger';

/**
 * Pastes text at the current cursor position
 * @param text The text to paste
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const pasteTextAtCursor = async (text: string): Promise<boolean> => {
  try {
    logger.debug('Attempting to paste text at cursor position');
    logger.debug(
      `Text to paste (first 50 chars): ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
    );

    // Save the original clipboard content
    const originalClipboardContent = clipboard.readText();
    logger.debug('Saved original clipboard content');

    // Set the clipboard to the transcribed text
    clipboard.writeText(text);
    logger.debug('Set clipboard to transcribed text');

    // Use platform-specific commands to paste at the current cursor position
    if (process.platform === 'darwin') {
      logger.debug('Using macOS paste command (Command+V)');
      // On macOS, use AppleScript to simulate Command+V
      return new Promise<boolean>(resolve => {
        exec(
          'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
          error => {
            if (error) {
              logger.exception('Error executing AppleScript paste command', error);
              resolve(false);
            } else {
              logger.debug('Successfully pasted text at cursor position');
              resolve(true);
            }

            // Restore the original clipboard content after a short delay
            setTimeout(() => {
              clipboard.writeText(originalClipboardContent);
              logger.debug('Restored original clipboard content');
            }, 500);
          }
        );
      });
    } else if (process.platform === 'win32') {
      logger.debug('Using Windows paste command (Ctrl+V)');
      // On Windows, use PowerShell to simulate Ctrl+V
      return new Promise<boolean>(resolve => {
        exec(
          'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"',
          error => {
            if (error) {
              logger.exception('Error executing PowerShell paste command', error);
              resolve(false);
            } else {
              logger.debug('Successfully pasted text at cursor position');
              resolve(true);
            }

            // Restore the original clipboard content after a short delay
            setTimeout(() => {
              clipboard.writeText(originalClipboardContent);
              logger.debug('Restored original clipboard content');
            }, 500);
          }
        );
      });
    } else {
      logger.error('Unsupported platform for paste operation', { platform: process.platform });
      // Restore the original clipboard content
      clipboard.writeText(originalClipboardContent);
      return false;
    }
  } catch (error) {
    logger.exception('Failed to paste text at cursor position', error);
    return false;
  }
};

/**
 * Sets up clipboard-related IPC handlers
 */
export const setupClipboardHandlers = (): void => {
  // Add handler for pasting text at cursor position
  ipcMain.handle(
    'paste-text-at-cursor',
    async (_, text: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await pasteTextAtCursor(text);
        return { success: result };
      } catch (error) {
        logger.error('Error pasting text at cursor:', { error: (error as Error).message });
        return { success: false, error: String(error) };
      }
    }
  );
};

export default { setupClipboardHandlers, pasteTextAtCursor };
