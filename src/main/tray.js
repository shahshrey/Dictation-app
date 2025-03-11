const { app, Menu, Tray, shell, nativeImage } = require('electron');
const path = require('path');
const CONSTANTS = require('./constants');
const logger = require('./logger');
const fs = require('fs');

// Keep a global reference of the tray
let trayInstance = null;

// Define icon paths
const ICON_PATHS = {
  DEFAULT: path.resolve(path.join(__dirname, '../../resources/icons/icon.png')),
  FALLBACK: path.resolve(path.join(__dirname, '../../resources/icons/fallback.png'))
};

/**
 * Creates the system tray icon and menu
 * @param {BrowserWindow} mainWindow - Reference to the main window
 * @param {Function} showSettings - Function to show settings window
 */
function create(mainWindow, showSettings) {
  try {
    let trayIcon;
    
    // Try to load the icon
    try {
      // Check if the icon file exists
      if (fs.existsSync(ICON_PATHS.DEFAULT)) {
        trayIcon = nativeImage.createFromPath(ICON_PATHS.DEFAULT);
        if (trayIcon.isEmpty()) {
          throw new Error('Icon loaded but is empty');
        }
      } else {
        throw new Error(`Icon file not found at path: ${ICON_PATHS.DEFAULT}`);
      }
    } catch (iconError) {
      logger.exception(iconError);
      
      // Try fallback icon if it exists
      if (fs.existsSync(ICON_PATHS.FALLBACK)) {
        try {
          trayIcon = nativeImage.createFromPath(ICON_PATHS.FALLBACK);
        } catch (fallbackError) {
          logger.exception(fallbackError);
          trayIcon = nativeImage.createEmpty();
        }
      } else {
        // Create a simple 16x16 transparent icon as a last resort
        trayIcon = nativeImage.createEmpty();
      }
    }
    
    // Create the tray icon
    trayInstance = new Tray(trayIcon);
    
    // Set tooltip
    trayInstance.setToolTip(CONSTANTS.APP_NAME);
    
    // Create the context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Settings',
        click: () => {
          if (showSettings) {
            showSettings();
          } else if (mainWindow) {
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'About',
        click: () => {
          shell.openExternal('https://github.com/yourusername/whisper-dictation-app');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    // Set the context menu
    trayInstance.setContextMenu(contextMenu);
    
    // Handle click events (macOS)
    if (process.platform === 'darwin') {
      trayInstance.on('click', () => {
        trayInstance.popUpContextMenu();
      });
    }
    
    logger.info('System tray initialized');
  } catch (error) {
    logger.exception(error);
  }
}

/**
 * Updates the tray icon
 * @param {string} icon - Path to the new icon
 */
function updateIcon(icon) {
  try {
    if (trayInstance) {
      try {
        const newIcon = nativeImage.createFromPath(icon);
        if (!newIcon.isEmpty()) {
          trayInstance.setImage(newIcon);
        } else {
          throw new Error('New icon is empty');
        }
      } catch (iconError) {
        logger.exception(iconError);
      }
    }
  } catch (error) {
    logger.exception(error);
  }
}

/**
 * Destroys the tray instance
 */
function destroy() {
  try {
    if (trayInstance) {
      trayInstance.destroy();
      trayInstance = null;
    }
  } catch (error) {
    logger.exception(error);
  }
}

module.exports = {
  create,
  updateIcon,
  destroy
}; 