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
      height: 50,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      movable: true,
      hasShadow: false,
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      focusable: false,
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

    popupWindowInstance.once('ready-to-show', () => {
      logger.debug('Popup window ready to show');
    });

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    popupWindowInstance.setPosition(width - 200, height - 100);

    if (process.platform === 'darwin') {
      const macOSWindow = popupWindowInstance as MacOSBrowserWindow;
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
    if (!global.popupWindow) {
      global.popupWindow = createPopupWindow();
    }

    if (global.popupWindow) {
      if (
        typeof global.popupWindow.isDestroyed === 'function' &&
        global.popupWindow.isDestroyed()
      ) {
        global.popupWindow = createPopupWindow();
      }

      if (
        global.popupWindowMinimized &&
        global.popupWindow &&
        typeof global.popupWindow.isDestroyed === 'function' &&
        !global.popupWindow.isDestroyed()
      ) {
        try {
          global.popupWindow.restore();
          global.popupWindowMinimized = false;
        } catch (error) {
          logger.error('Error restoring popup window:', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (
        global.popupWindow &&
        typeof global.popupWindow.isDestroyed === 'function' &&
        !global.popupWindow.isDestroyed() &&
        typeof global.popupWindow.isVisible === 'function' &&
        !global.popupWindow.isVisible()
      ) {
        try {
          global.popupWindow.show();

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

          setTimeout(() => {
            if (
              global.popupWindow &&
              typeof global.popupWindow.isDestroyed === 'function' &&
              !global.popupWindow.isDestroyed() &&
              typeof global.popupWindow.isVisible === 'function' &&
              !global.popupWindow.isVisible()
            ) {
              global.popupWindow.show();
            }
          }, 100);
        } catch (error) {
          logger.error('Error showing popup window:', {
            error: error instanceof Error ? error.message : String(error),
          });
          global.popupWindow = createPopupWindow();
          if (
            global.popupWindow &&
            typeof global.popupWindow.isDestroyed === 'function' &&
            !global.popupWindow.isDestroyed()
          ) {
            global.popupWindow.show();
          }
        }
      } else if (
        global.popupWindow &&
        typeof global.popupWindow.isDestroyed === 'function' &&
        !global.popupWindow.isDestroyed()
      ) {
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } else {
      logger.error('Failed to create popup window');
    }
  } catch (error) {
    logger.error('Unexpected error in showPopupWindow:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Hides the popup window
 */
export const hidePopupWindow = (): void => {
  if (
    global.popupWindow &&
    typeof global.popupWindow.isDestroyed === 'function' &&
    !global.popupWindow.isDestroyed()
  ) {
    try {
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
    } catch (error) {
      logger.error('Error updating popup window:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
