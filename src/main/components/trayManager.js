/**
 * @fileoverview Manages the system tray icon and context menu for the application.
 * Handles creation, updates, and cleanup of the tray instance.
 */

const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');
const logger = require('../../shared/logger').default;
const fs = require('fs');

// Constants for icon dimensions and application name
const ICON_DIMENSIONS = { width: 30, height: 30 };
const APP_NAME = 'Voice Vibe';

// Fallback icon for macOS (encoded as hex PNG)
const FALLBACK_ICON_HEX = `
  89504E470D0A1A0A0000000D49484452000000100000001008060000001FF3FF
  610000000467414D410000B18F0BFC6105000000097048597300000EC300000E
  C301C76FA8640000001A74455874536F667477617265005061696E742E4E4554
  2076332E352E313030F472A1000000304944415438CBEDD2310A00300804D177
  C77DBCBD2331581C8208D18BEE0E82105906A0A8CE0C0DEEE6F00336B9BB3FEC
  2CF35B783F07E705D5835A20000000049454E44AE426082
`.replace(/[^a-f0-9]/gi, '');

// Module-level tray instance
let tray = null;

/**
 * Resolves the path to an asset based on whether the app is packaged or not
 * 
 * @param {string} assetPath - Relative path to the asset inside src/assets
 * @returns {string} The resolved path to the asset
 */
const resolveAssetPath = (assetPath) => {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', assetPath)
    : path.join(app.getAppPath(), 'src/assets', assetPath);
};

/**
 * Checks if a window exists and is not destroyed
 * 
 * @param {Electron.BrowserWindow} window - The window to check
 * @returns {boolean} True if the window exists and is not destroyed
 */
const isValidWindow = (window) => {
  return window && 
         typeof window.isDestroyed === 'function' && 
         !window.isDestroyed();
};

/**
 * Creates a fallback icon when regular icon loading fails
 * 
 * @param {boolean} isMacOS - Whether the platform is macOS
 * @returns {Electron.NativeImage} A fallback icon
 */
const createFallbackIcon = (isMacOS) => {
  let fallbackIcon = nativeImage.createEmpty();
  
  if (isMacOS) {
    // Create a simple microphone icon for macOS
    try {
      const iconData = Buffer.from(FALLBACK_ICON_HEX, 'hex');
      fallbackIcon = nativeImage.createFromBuffer(iconData);
      fallbackIcon.setTemplateImage(true);
    } catch (error) {
      logger.error('Failed to create fallback icon from buffer', { 
        error: error.message,
        stack: error.stack 
      });
    }
  }
  
  return fallbackIcon;
};

/**
 * Creates a native image for the tray icon
 * 
 * @returns {Electron.NativeImage} The configured tray icon
 */
const createTrayIcon = () => {
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
      error: error.message,
      stack: error.stack 
    });
    
    return createFallbackIcon(isMacOS);
  }
};

/**
 * Gets the current recording state from global state
 * 
 * @returns {boolean} Whether recording is currently active
 */
const getRecordingState = () => {
  return global.recordingManager 
    ? global.recordingManager.getIsRecording() 
    : !!global.isRecording;
};

/**
 * Creates the menu template for the tray context menu
 * 
 * @param {Object} state - Application state object
 * @returns {Array} Menu template for the tray
 */
const createMenuTemplate = (state) => {
  const { mainWindowExists, popupWindowExists, isRecording } = state;
  
  return [
    {
      label: APP_NAME,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      click: () => {
        if (isValidWindow(global.mainWindow)) {
          global.mainWindow.webContents.send('toggle-recording');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Show Main Window',
      click: () => {
        if (mainWindowExists) {
          // Restore from minimized state if needed
          if (global.mainWindowMinimized) {
            global.mainWindow.restore();
            global.mainWindowMinimized = false;
          }
          // Show and focus
          global.mainWindow.show();
          global.mainWindow.focus();
        } else if (global.createWindow) {
          global.mainWindow = global.createWindow();
          if (global.mainWindow) {
            global.mainWindow.show();
            global.mainWindow.focus();
          }
        }
      }
    },
    {
      label: popupWindowExists && global.popupWindow.isVisible() ? 'Hide Popup' : 'Show Popup',
      click: () => {
        if (popupWindowExists) {
          if (global.popupWindow.isVisible()) {
            global.popupWindow.hide();
          } else {
            global.showPopupWindow();
          }
        } else if (global.createPopupWindow && global.showPopupWindow) {
          global.popupWindow = global.createPopupWindow();
          global.showPopupWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Set the isQuitting flag to true to allow complete shutdown
        global.isQuitting = true;
        app.quit();
      }
    }
  ];
};

/**
 * Creates the system tray icon and menu
 * 
 * @returns {Electron.Tray|null} The created tray instance or null if creation failed
 */
const createTray = () => {
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
        isTemplate: menubarIcon.isTemplateImage()
      });
    }
    
    logger.debug('System tray created successfully');
    return tray;
  } catch (error) {
    logger.error('Error creating system tray:', { 
      error: error.message, 
      stack: error.stack 
    });
    return null;
  }
};

/**
 * Updates the tray menu based on current application state
 */
const updateTrayMenu = () => {
  if (!tray) return;
  
  try {
    const state = {
      mainWindowExists: isValidWindow(global.mainWindow),
      popupWindowExists: isValidWindow(global.popupWindow),
      isRecording: getRecordingState()
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
      error: error.message,
      stack: error.stack 
    });
  }
};

/**
 * Destroys the tray instance
 */
const destroyTray = () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
};

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray
}; 