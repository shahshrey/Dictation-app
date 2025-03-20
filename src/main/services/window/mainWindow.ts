import { BrowserWindow, app } from 'electron';
import path from 'path';
import logger from '../../../shared/logger';

/**
 * Creates the main application window
 * @returns The created BrowserWindow instance or null if creation fails
 */
export const createMainWindow = (): BrowserWindow | null => {
  logger.debug('createWindow called');

  try {
    const mainWindowInstance = new BrowserWindow({
      width: 800,
      height: 600,
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
        backgroundThrottling: false,
      },
      show: false,
      backgroundColor: '#FFFFFF',
      focusable: true,
      skipTaskbar: false,
      movable: true,
      hasShadow: false,
      titleBarStyle: 'default',
      enableLargerThanScreen: false,
      minimizable: true,
      maximizable: false,
      closable: true,
      autoHideMenuBar: true,
      paintWhenInitiallyHidden: true,
    });

    global.mainWindow = mainWindowInstance;

    if (process.platform === 'darwin' && app.isPackaged) {
      app.dock.show();
    }

    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      mainWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'index.html'));
    } else {
      mainWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
    }

    mainWindowInstance.once('ready-to-show', () => {
      logger.debug('Main window ready to show, but keeping it hidden by default');
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindowInstance.webContents.openDevTools();
    }

    mainWindowInstance.on('close', event => {
      // If the app is not actually quitting, prevent the window from being closed
      if (!global.isQuitting) {
        event.preventDefault();
        mainWindowInstance.hide();
        return false;
      }

      // Otherwise proceed with normal close behavior
      global.mainWindow = null;
      global.mainWindowMinimized = false;

      if (
        global.popupWindow &&
        typeof global.popupWindow.isDestroyed === 'function' &&
        !global.popupWindow.isDestroyed()
      ) {
        try {
          global.popupWindow.close();
        } catch (error) {
          logger.error('Error closing popup window during main window close:', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });

    mainWindowInstance.on('closed', () => {
      global.mainWindow = null;
    });

    mainWindowInstance.on('focus', () => {
      logger.debug('Main window focus event triggered');
    });

    mainWindowInstance.on('blur', () => {
      logger.debug('Main window blur event triggered');
    });

    mainWindowInstance.on('minimize', () => {
      global.mainWindowMinimized = true;
    });

    mainWindowInstance.on('restore', () => {
      global.mainWindowMinimized = false;
    });

    global.mainWindowShowRequested = true;

    if (process.platform === 'darwin') {
      app.on('activate', () => {
        global.mainWindowShowRequested = true;

        if (global.mainWindowMinimized) {
          if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
            try {
              mainWindowInstance.setSize(800, 600);
              mainWindowInstance.restore();
              mainWindowInstance.focus();
              global.mainWindowMinimized = false;
            } catch (error) {
              logger.error('Error restoring main window from dock click:', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } else if (!mainWindowInstance.isVisible()) {
          mainWindowInstance.setSize(800, 600);
          mainWindowInstance.show();
          mainWindowInstance.focus();
        }

        setTimeout(() => {
          global.mainWindowShowRequested = false;
        }, 1000);
      });
    }

    return mainWindowInstance;
  } catch (error) {
    logger.error('Error creating main window:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Minimizes the main window
 * @returns true if the operation was successful, false otherwise
 */
export const minimizeMainWindow = (): boolean => {
  if (
    global.mainWindow &&
    typeof global.mainWindow.isDestroyed === 'function' &&
    !global.mainWindow.isDestroyed()
  ) {
    try {
      global.mainWindow.minimize();
      global.mainWindowMinimized = true;
      logger.debug('Main window minimized');
      return true;
    } catch (error) {
      logger.error('Error minimizing main window:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
  return false;
};

/**
 * Restores all minimized windows
 */
export const restoreMinimizedWindows = (): void => {
  if (
    global.mainWindow &&
    typeof global.mainWindow.isDestroyed === 'function' &&
    !global.mainWindow.isDestroyed() &&
    global.mainWindowMinimized
  ) {
    try {
      if (typeof global.mainWindow.isMinimized === 'function' && global.mainWindow.isMinimized()) {
        global.mainWindow.restore();
      } else {
        global.mainWindow.show();
      }
      global.mainWindow.focus();
      global.mainWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring main window:', {
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        global.mainWindow.show();
      } catch (showError) {
        logger.error('Error showing main window as fallback:', {
          error: showError instanceof Error ? showError.message : String(showError),
        });
      }
    }
  }

  if (
    global.popupWindow &&
    typeof global.popupWindow.isDestroyed === 'function' &&
    !global.popupWindow.isDestroyed() &&
    global.popupWindowMinimized
  ) {
    try {
      if (
        typeof global.popupWindow.isMinimized === 'function' &&
        global.popupWindow.isMinimized()
      ) {
        global.popupWindow.restore();
      } else {
        global.popupWindow.show();
      }
      global.popupWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring popup window:', {
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        global.popupWindow.show();
      } catch (showError) {
        logger.error('Error showing popup window as fallback:', {
          error: showError instanceof Error ? showError.message : String(showError),
        });
      }
    }
  }
};
