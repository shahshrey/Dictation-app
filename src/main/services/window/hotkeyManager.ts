import { globalShortcut } from 'electron';
import logger from '../../../shared/logger';
import { WindowSettings } from './types';
import { createMainWindow } from './mainWindow';
import { createPopupWindow, showPopupWindow } from './popupWindow';

/**
 * Handles the hotkey toggle action
 */
export const handleHotkeyToggle = (): void => {
  logger.debug('Hotkey pressed!');

  global.mainWindowShowRequested = true;

  if (
    !global.mainWindow ||
    (typeof global.mainWindow.isDestroyed === 'function' && global.mainWindow.isDestroyed())
  ) {
    global.mainWindow = createMainWindow();
    if (global.mainWindow) {
      global.mainWindow.webContents.once('did-finish-load', () => {
        logger.debug('Main window loaded');
      });
    }
  }

  if (
    !global.popupWindow ||
    (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
  ) {
    global.popupWindow = createPopupWindow();

    if (global.popupWindow) {
      showPopupWindow();
    }
  } else {
    if (
      global.popupWindowMinimized &&
      global.popupWindow &&
      typeof global.popupWindow.isDestroyed === 'function' &&
      !global.popupWindow.isDestroyed()
    ) {
      global.popupWindow.restore();
      global.popupWindowMinimized = false;
    } else if (
      global.popupWindow &&
      typeof global.popupWindow.isVisible === 'function' &&
      !global.popupWindow.isVisible()
    ) {
      showPopupWindow();
    }
  }

  if (global.recordingManager) {
    logger.debug('Current recording state:', {
      isRecording: global.recordingManager.getIsRecording(),
    });
  } else {
    logger.debug('Current recording state:', { isRecording: global.isRecording });
  }

  // Only send the recording-toggle-requested event to the popup window
  if (
    global.popupWindow &&
    typeof global.popupWindow.isDestroyed === 'function' &&
    !global.popupWindow.isDestroyed()
  ) {
    try {
      global.popupWindow.webContents.send('recording-toggle-requested');
    } catch (error) {
      logger.error('Error sending recording-toggle-requested event:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

/**
 * Registers global hotkeys based on settings
 * @param _ Unused parameter (for IPC handler compatibility)
 * @param settings Window settings containing hotkey configuration
 */
export const registerGlobalHotkey = (_: unknown, settings: WindowSettings): void => {
  globalShortcut.unregisterAll();

  const hotkey = settings.hotkey || 'Home';

  try {
    const registered = globalShortcut.register(hotkey, handleHotkeyToggle);

    if (!registered) {
      logger.error(`Failed to register hotkey: ${hotkey}`);
    }
  } catch (error) {
    logger.error(`Error registering hotkey ${hotkey}:`, {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      globalShortcut.register('Home', handleHotkeyToggle);
    } catch (fallbackError) {
      logger.error('Failed to register fallback hotkey:', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }
  }
};
