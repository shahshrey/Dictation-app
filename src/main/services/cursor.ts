/**
 * Cursor Service
 * 
 * This service handles inserting text at the current cursor position
 * in any application on macOS.
 */

import { getLogger } from '../../shared/logger';

// Initialize logger
const logger = getLogger('main');

/**
 * Insert text at the current cursor position
 * This function is now a wrapper around insertTextAtCursorViaClipboard
 * 
 * @param text - The text to insert at the cursor position
 * @param clipboard - The Electron clipboard object
 * @returns A promise that resolves when the text has been inserted
 */
export const insertTextAtCursor = async (text: string, clipboard: Electron.Clipboard): Promise<boolean> => {
  return insertTextAtCursorViaClipboard(text, clipboard);
};

/**
 * Insert text at the current cursor position using clipboard
 * 
 * @param text - The text to insert at the cursor position
 * @param clipboard - The Electron clipboard object
 * @returns A promise that resolves when the text has been inserted
 */
export const insertTextAtCursorViaClipboard = async (text: string, clipboard: Electron.Clipboard): Promise<boolean> => {
  try {
    logger.info('Inserting text at cursor position via clipboard', { textLength: text.length });
    
    // Store current clipboard content
    const previousClipboardContent = clipboard.readText();
    
    // Set new content to clipboard
    clipboard.writeText(text);
    
    // Simulate Cmd+V (paste)
    // We'll use the Electron app's built-in menu functionality instead of RobotJS
    const { app, Menu } = require('electron');
    const menu = Menu.getApplicationMenu();
    
    // Trigger paste command
    Menu.sendActionToFirstResponder('paste:');
    
    // Wait a bit to ensure paste completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restore previous clipboard content
    clipboard.writeText(previousClipboardContent);
    
    logger.info('Successfully inserted text at cursor position via clipboard');
    return true;
  } catch (error) {
    logger.exception(error as Error, 'Failed to insert text at cursor position via clipboard');
    return false;
  }
}; 