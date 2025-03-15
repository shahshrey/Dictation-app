const { clipboard } = require('electron');
const { exec } = require('child_process');
const { logger } = require('./constants');

// Function to paste text at the current cursor position
const pasteTextAtCursor = async text => {
  try {
    logger.info('Attempting to paste text at cursor position');
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
      exec(
        'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
        error => {
          if (error) {
            logger.exception('Error executing AppleScript paste command', error);
          } else {
            logger.info('Successfully pasted text at cursor position');
          }

          // Restore the original clipboard content after a short delay
          setTimeout(() => {
            clipboard.writeText(originalClipboardContent);
            logger.debug('Restored original clipboard content');
          }, 500);
        }
      );
    } else if (process.platform === 'win32') {
      logger.debug('Using Windows paste command (Ctrl+V)');
      // On Windows, use PowerShell to simulate Ctrl+V
      exec(
        'powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"',
        error => {
          if (error) {
            logger.exception('Error executing PowerShell paste command', error);
          } else {
            logger.info('Successfully pasted text at cursor position');
          }

          // Restore the original clipboard content after a short delay
          setTimeout(() => {
            clipboard.writeText(originalClipboardContent);
            logger.debug('Restored original clipboard content');
          }, 500);
        }
      );
    } else {
      logger.error('Unsupported platform for paste operation', { platform: process.platform });
      // Restore the original clipboard content
      clipboard.writeText(originalClipboardContent);
    }

    return true;
  } catch (error) {
    logger.exception('Failed to paste text at cursor position', error);
    return false;
  }
};

module.exports = {
  pasteTextAtCursor
}; 