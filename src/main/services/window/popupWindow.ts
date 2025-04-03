import { BrowserWindow, app, screen } from 'electron';
import path from 'path';
import os from 'os';
import logger from '../../../shared/logger';
import { MouseEventsOptions, MacOSBrowserWindow } from './types';

/**
 * Creates the popup window for recording status
 * @returns The created BrowserWindow instance or null if creation fails
 */
export const createPopupWindow = (): BrowserWindow | null => {
  logger.debug('createPopupWindow called');

  try {
    // Define base options for all platforms
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: 180,
      height: 30,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      movable: true,
      hasShadow: false,
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      focusable: true,
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'logo.png')
        : path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: app.isPackaged
          ? path.join(process.resourcesPath, 'app.asar', 'dist', 'preload', 'preload.js')
          : path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
        devTools: true,
      },
      backgroundColor: '#00000000',
    };

    // Add macOS-specific options
    const macOSOptions = {
      level: 'screen-saver',
      skipDock: true,
      accessory: process.platform === 'darwin',
      visibleOnAllWorkspaces: true,
    };

    // Combine options
    const combinedOptions = {
      ...windowOptions,
      ...(process.platform === 'darwin' ? macOSOptions : {}),
    };

    // Create the window with type assertion to allow macOS-specific properties
    const popupWindowInstance = new BrowserWindow(
      combinedOptions as Electron.BrowserWindowConstructorOptions
    );

    global.popupWindow = popupWindowInstance;

    hidePopupFromDock();

    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      popupWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'popup.html'));
    } else {
      popupWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/popup.html'));
    }

    // Add dev tools keyboard shortcut and open dev tools in development mode
    if (process.env.NODE_ENV === 'development') {
      // Register the shortcut for dev tools
      popupWindowInstance.webContents.on('before-input-event', (event, input) => {
        const isMac = process.platform === 'darwin';
        const modifierKey = isMac ? input.meta : input.control;

        // Command+Option+I (Mac) or Control+Shift+I (Windows/Linux)
        if (modifierKey && input.shift && input.key.toLowerCase() === 'i') {
          event.preventDefault();
          if (!popupWindowInstance.webContents.isDevToolsOpened()) {
            popupWindowInstance.webContents.openDevTools({ mode: 'detach' });
          } else {
            popupWindowInstance.webContents.closeDevTools();
          }
        }
      });

      // Automatically open dev tools in development mode
      popupWindowInstance.webContents.openDevTools({ mode: 'detach' });
    }

    popupWindowInstance.once('ready-to-show', () => {
      logger.debug('Popup window ready to show');
    });

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // Center horizontally at the bottom of the screen
    const windowWidth = 150; // Match the width defined in windowOptions
    const popupX = Math.floor((width - windowWidth) / 2);
    const popupY = height - 10; // Position from bottom with small margin
    popupWindowInstance.setPosition(popupX, popupY);

    if (process.platform === 'darwin') {
      const macOSWindow = popupWindowInstance as MacOSBrowserWindow;
      if (typeof macOSWindow.setVisibleOnAllWorkspaces === 'function') {
        macOSWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
        });
      }

      if (typeof macOSWindow.setWindowButtonVisibility === 'function') {
        macOSWindow.setWindowButtonVisibility(false);
      }
    }

    popupWindowInstance.setAlwaysOnTop(true, 'screen-saver');
    popupWindowInstance.setIgnoreMouseEvents(true, { forward: true });

    popupWindowInstance.webContents.on('did-finish-load', () => {
      try {
        popupWindowInstance.webContents.executeJavaScript(`
          document.addEventListener('mouseover', () => {
            window.electronAPI.setIgnoreMouseEvents(false);
          });
          
          document.addEventListener('mouseout', () => {
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          });
        `);
      } catch (error) {
        logger.error('Error setting up mouse event handlers:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    popupWindowInstance.on('close', event => {
      // If the app is not actually quitting, prevent the window from being closed
      if (!global.isQuitting) {
        event.preventDefault();
        popupWindowInstance.hide();
        return false;
      }

      // Otherwise proceed with normal close behavior
      global.popupWindow = null;
      global.popupWindowMinimized = false;
    });

    popupWindowInstance.on('closed', () => {
      global.popupWindow = null;
    });

    popupWindowInstance.on('minimize', () => {
      global.popupWindowMinimized = true;
    });

    popupWindowInstance.on('restore', () => {
      global.popupWindowMinimized = false;
    });

    return popupWindowInstance;
  } catch (error) {
    logger.error('Error creating popup window:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Hides the popup window from the dock
 */
export const hidePopupFromDock = (): void => {
  if (global.popupWindow && process.platform === 'darwin') {
    try {
      global.popupWindow.setSkipTaskbar(true);

      const macOSWindow = global.popupWindow as MacOSBrowserWindow;

      if (typeof macOSWindow.setHiddenInMissionControl === 'function') {
        macOSWindow.setHiddenInMissionControl(true);
      }

      if (typeof macOSWindow.setWindowButtonVisibility === 'function') {
        macOSWindow.setWindowButtonVisibility(false);
      }

      if (typeof macOSWindow.setVisibleOnAllWorkspaces === 'function') {
        macOSWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true,
        });
      }

      const osVersion = os.release();

      if (osVersion.startsWith('24.')) {
        if (typeof macOSWindow.setWindowButtonVisibility === 'function') {
          macOSWindow.setWindowButtonVisibility(false);
        }

        if (typeof macOSWindow.setAccessoryView === 'function') {
          macOSWindow.setAccessoryView(true);
        }
      }
    } catch (error) {
      logger.error('Error setting additional properties to hide popup from dock:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

/**
 * Shows the popup window
 */
export const showPopupWindow = (): void => {
  logger.debug('showPopupWindow called');

  try {
    // Create a popup window if it doesn't exist or is destroyed
    if (
      !global.popupWindow ||
      (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
    ) {
      logger.debug('Popup window does not exist or is destroyed, creating a new one');
      global.popupWindow = createPopupWindow();
      if (!global.popupWindow) {
        logger.error('Failed to create popup window');
        return;
      }
    }

    // Restore from minimized state if needed
    if (
      global.popupWindowMinimized &&
      global.popupWindow &&
      typeof global.popupWindow.isMinimized === 'function' &&
      global.popupWindow.isMinimized()
    ) {
      try {
        global.popupWindow.restore();
        global.popupWindowMinimized = false;
      } catch (error) {
        logger.error('Error restoring minimized popup window:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Show the window if it's not visible
    if (
      global.popupWindow &&
      typeof global.popupWindow.isVisible === 'function' &&
      !global.popupWindow.isVisible()
    ) {
      global.popupWindow.show();

      // Ensure it's on top
      if (typeof global.popupWindow.setAlwaysOnTop === 'function') {
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
      }

      // Apply macOS-specific settings
      if (process.platform === 'darwin') {
        const macOSWindow = global.popupWindow as MacOSBrowserWindow;
        if (typeof macOSWindow.setVisibleOnAllWorkspaces === 'function') {
          macOSWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true,
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error showing popup window:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Hides the popup window
 */
export const hidePopupWindow = (): void => {
  logger.debug('hidePopupWindow called');

  if (
    !global.popupWindow ||
    (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
  ) {
    return; // Nothing to hide
  }

  try {
    // Set properties before hiding
    global.popupWindow.setAlwaysOnTop(true, 'screen-saver');

    if (process.platform === 'darwin') {
      const macOSWindow = global.popupWindow as MacOSBrowserWindow;
      if (typeof macOSWindow.setVisibleOnAllWorkspaces === 'function') {
        macOSWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true,
        });
      }

      if (typeof macOSWindow.setWindowButtonVisibility === 'function') {
        macOSWindow.setWindowButtonVisibility(false);
      }
    }

    // Hide the window
    if (typeof global.popupWindow.isVisible === 'function' && global.popupWindow.isVisible()) {
      global.popupWindow.hide();
    }
  } catch (error) {
    logger.error('Error hiding popup window:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Sets whether mouse events are ignored by the popup window
 * @param ignore Whether to ignore mouse events
 * @param options Mouse event options
 * @returns true if the operation was successful, false otherwise
 */
export const setIgnoreMouseEvents = (
  ignore: boolean,
  options: MouseEventsOptions = { forward: true }
): boolean => {
  if (
    global.popupWindow &&
    typeof global.popupWindow.isDestroyed === 'function' &&
    !global.popupWindow.isDestroyed()
  ) {
    try {
      const forwardOptions = options || { forward: !ignore };
      global.popupWindow.setIgnoreMouseEvents(ignore, forwardOptions);
      return true;
    } catch (error) {
      logger.error('Error setting ignore mouse events:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
  return false;
};

/**
 * Resizes the popup window based on recording status
 * @param isRecording Whether recording is active
 * @returns true if successful, false otherwise
 */
export const resizePopupWindow = (isRecording: boolean): boolean => {
  logger.debug('resizePopupWindow called with isRecording:', { isRecording });

  if (
    !global.popupWindow ||
    (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
  ) {
    logger.error('Cannot resize popup window: window does not exist or is destroyed');
    return false;
  }

  try {
    // Get the current position to maintain horizontal center
    const currentPosition = global.popupWindow.getPosition();

    // Set new dimensions based on recording state
    const newWidth = isRecording ? 200 : 180;
    const newHeight = isRecording ? 40 : 30;

    // Update the window size
    global.popupWindow.setSize(newWidth, newHeight);

    // Adjust position to keep centered horizontally while maintaining vertical position
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    const popupX = Math.floor((width - newWidth) / 2);
    global.popupWindow.setPosition(popupX, currentPosition[1]);

    logger.debug('Popup window resized successfully', {
      isRecording,
      newWidth,
      newHeight,
      position: global.popupWindow.getPosition(),
    });

    return true;
  } catch (error) {
    logger.error('Error resizing popup window:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};
