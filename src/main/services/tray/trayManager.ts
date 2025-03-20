/**
 * @fileoverview Manages the system tray icon and context menu for the application.
 * Handles creation, updates, and cleanup of the tray instance.
 */

import { Tray, Menu, app, nativeImage, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import path from 'path';
import logger from '../../../shared/logger';
import fs from 'fs';

// Constants for icon dimensions and application name
const ICON_DIMENSIONS = { width: 30, height: 30 };
const APP_NAME = 'Voice Vibe';

// Interface for application state
interface AppState {
  mainWindowExists: boolean;
  popupWindowExists: boolean;
  isRecording: boolean;
}

// Define interfaces for the global objects without extending global directly
interface RecordingManager {
  getIsRecording: () => boolean;
}

// Module-level tray instance
let tray: Tray | null = null;

// Safely access global properties
const getGlobal = <T>(key: string, defaultValue: T): T => {
  return ((globalThis as Record<string, unknown>)[key] as T) ?? defaultValue;
};

// Safely set global properties
const setGlobal = (key: string, value: unknown): void => {
  (globalThis as Record<string, unknown>)[key] = value;
};

// Fallback icon for macOS (encoded as hex PNG)
const FALLBACK_ICON_HEX = `
  89504E470D0A1A0A0000000D49484452000000100000001008060000001FF3FF
  610000000467414D410000B18F0BFC6105000000097048597300000EC300000E
  C301C76FA8640000001A74455874536F667477617265005061696E742E4E4554
  2076332E352E313030F472A1000000304944415438CBEDD2310A00300804D177
  C77DBCBD2331581C8208D18BEE0E82105906A0A8CE0C0DEEE6F00336B9BB3FEC
  2CF35B783F07E705D5835A20000000049454E44AE426082
`.replace(/[^a-f0-9]/gi, '');

/**
 * Resolves the path to an asset based on whether the app is packaged or not
 *
 * @param assetPath - Relative path to the asset inside src/assets
 * @returns The resolved path to the asset
 */
const resolveAssetPath = (assetPath: string): string => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', assetPath)
    : path.join(app.getAppPath(), 'src/assets', assetPath);
};

/**
 * Checks if a window exists and is not destroyed
 *
 * @param window - The window to check
 * @returns True if the window exists and is not destroyed
 */
const isValidWindow = (window: BrowserWindow | null | undefined): boolean => {
  return !!window && typeof window.isDestroyed === 'function' && !window.isDestroyed();
};

/**
 * Creates a fallback icon when regular icon loading fails
 *
 * @param isMacOS - Whether the platform is macOS
 * @returns A fallback icon
 */
const createFallbackIcon = (isMacOS: boolean): Electron.NativeImage => {
  let fallbackIcon = nativeImage.createEmpty();

  if (isMacOS) {
    // Create a simple microphone icon for macOS
    try {
      const iconData = Buffer.from(FALLBACK_ICON_HEX, 'hex');
      fallbackIcon = nativeImage.createFromBuffer(iconData);
      fallbackIcon.setTemplateImage(true);
    } catch (error) {
      logger.error('Failed to create fallback icon from buffer', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  }

  return fallbackIcon;
};

/**
 * Creates a native image for the tray icon
 *
 * @returns The configured tray icon
 */
const createTrayIcon = (): Electron.NativeImage => {
  const isMacOS = process.platform === 'darwin';

  try {
    // Get the appropriate icon paths
    const regularIconPath = resolveAssetPath('logo/logo.png');
    const menubarIconPath = resolveAssetPath('logo/menubar/icon.png');

    // Check if dedicated menubar icon exists
    let trayIconPath = regularIconPath;
    if (isMacOS && fs.existsSync(menubarIconPath)) {
      trayIconPath = menubarIconPath;
    }

    logger.debug('Creating tray with icon from:', { path: trayIconPath });

    // Create a native image from the icon path
    const trayIcon = nativeImage.createFromPath(trayIconPath);

    // For macOS, resize the image and set as template
    let menubarIcon = trayIcon;
    if (isMacOS) {
      if (trayIcon.getSize().width > 22) {
        menubarIcon = trayIcon.resize(ICON_DIMENSIONS);
      }

      menubarIcon.setTemplateImage(true);
    }

    // If the icon is empty for some reason, throw an error to use fallback
    if (menubarIcon.isEmpty()) {
      throw new Error('Icon is empty');
    }

    return menubarIcon;
  } catch (error) {
    logger.error('Error creating tray icon, using fallback:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    return createFallbackIcon(isMacOS);
  }
};

/**
 * Gets the current recording state from global state
 *
 * @returns Whether recording is currently active
 */
const getRecordingState = (): boolean => {
  const recordingManager = getGlobal<RecordingManager | undefined>('recordingManager', undefined);
  if (recordingManager) {
    return recordingManager.getIsRecording();
  }
  return !!getGlobal<boolean>('isRecording', false);
};

/**
 * Creates the menu template for the tray context menu
 *
 * @param state - Application state object
 * @returns Menu template for the tray
 */
const createMenuTemplate = (state: AppState): MenuItemConstructorOptions[] => {
  const { mainWindowExists, popupWindowExists, isRecording } = state;

  return [
    {
      label: APP_NAME,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      click: () => {
        const mainWindow = getGlobal<BrowserWindow | null>('mainWindow', null);
        if (isValidWindow(mainWindow)) {
          mainWindow?.webContents.send('toggle-recording');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Show Main Window',
      click: () => {
        if (mainWindowExists) {
          // Restore from minimized state if needed
          const mainWindow = getGlobal<BrowserWindow | null>('mainWindow', null);
          const isMinimized = getGlobal<boolean>('mainWindowMinimized', false);

          if (isMinimized && mainWindow) {
            mainWindow.restore();
            setGlobal('mainWindowMinimized', false);
          }

          // Show and focus
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } else {
          const createWindow = getGlobal<(() => BrowserWindow) | undefined>(
            'createWindow',
            undefined
          );
          if (createWindow) {
            const mainWindow = createWindow();
            setGlobal('mainWindow', mainWindow);
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        }
      },
    },
    {
      label:
        popupWindowExists && getGlobal<BrowserWindow | null>('popupWindow', null)?.isVisible()
          ? 'Hide Popup'
          : 'Show Popup',
      click: () => {
        const popupWindow = getGlobal<BrowserWindow | null>('popupWindow', null);
        if (popupWindowExists) {
          if (popupWindow?.isVisible()) {
            popupWindow.hide();
          } else {
            const showPopupWindow = getGlobal<(() => void) | undefined>(
              'showPopupWindow',
              undefined
            );
            showPopupWindow?.();
          }
        } else {
          const createPopupWindow = getGlobal<(() => BrowserWindow) | undefined>(
            'createPopupWindow',
            undefined
          );
          const showPopupWindow = getGlobal<(() => void) | undefined>('showPopupWindow', undefined);

          if (createPopupWindow && showPopupWindow) {
            const popupWindow = createPopupWindow();
            setGlobal('popupWindow', popupWindow);
            showPopupWindow();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Set the isQuitting flag to true to allow complete shutdown
        setGlobal('isQuitting', true);
        app.quit();
      },
    },
  ];
};

/**
 * Creates the system tray icon and menu
 *
 * @returns The created tray instance or null if creation failed
 */
const createTray = (): Tray | null => {
  logger.debug('Creating system tray');

  try {
    // Create the icon for the tray
    const menubarIcon = createTrayIcon();

    // Create the tray instance with the appropriate icon
    logger.debug('Creating the tray instance');
    tray = new Tray(menubarIcon);
    tray.setToolTip(APP_NAME);

    // Update the tray context menu
    updateTrayMenu();

    // For additional debugging on macOS
    if (process.platform === 'darwin') {
      logger.debug('Created macOS menubar icon - details:', {
        isEmpty: menubarIcon.isEmpty(),
        size: menubarIcon.getSize(),
        isTemplate: menubarIcon.isTemplateImage(),
      });
    }

    logger.debug('System tray created successfully');
    return tray;
  } catch (error) {
    logger.error('Error creating system tray:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return null;
  }
};

/**
 * Updates the tray menu based on current application state
 */
const updateTrayMenu = (): void => {
  if (!tray) return;

  try {
    const mainWindow = getGlobal<BrowserWindow | null>('mainWindow', null);
    const popupWindow = getGlobal<BrowserWindow | null>('popupWindow', null);

    const state: AppState = {
      mainWindowExists: isValidWindow(mainWindow),
      popupWindowExists: isValidWindow(popupWindow),
      isRecording: getRecordingState(),
    };

    const template = createMenuTemplate(state);
    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);

    // On macOS, update the tooltip to reflect recording state
    if (process.platform === 'darwin') {
      tray.setToolTip(state.isRecording ? `${APP_NAME} - Recording` : APP_NAME);
    }
  } catch (error) {
    logger.error('Error updating tray menu:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
};

/**
 * Destroys the tray instance
 */
const destroyTray = (): void => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
};

export { createTray, updateTrayMenu, destroyTray };
