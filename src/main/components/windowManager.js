const { BrowserWindow, app } = require('electron');
const path = require('path');
const logger = require('../../shared/logger').default;

// Global reference to the main window
let mainWindow = null;
// Global reference to the popup window
let popupWindow = null;

// Track recording state
let isRecording = false;

const createWindow = () => {
  logger.debug('createWindow called');

  try {
    logger.debug('Creating main browser window');
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local resources
      },
    });
    
    // IMPORTANT: Store the window in the global state
    global.mainWindow = mainWindow;
    
    logger.debug('Main window created successfully');

    logger.debug('Loading index.html file');
    // Load the index.html file
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Opening DevTools');
      mainWindow.webContents.openDevTools();
    }

    // Add event listeners to track window state
    mainWindow.on('close', () => {
      logger.debug('Main window close event triggered');
    });

    mainWindow.on('closed', () => {
      logger.debug('Main window closed event triggered');
      global.mainWindow = null;
    });

    mainWindow.on('focus', () => {
      logger.debug('Main window focus event triggered');
    });

    mainWindow.on('blur', () => {
      logger.debug('Main window blur event triggered');
    });

    logger.debug('Main window setup complete');

    return mainWindow;
  } catch (error) {
    logger.error('Error creating main window:', { error: error.message });
    return null;
  }
};

// After creating the popup window, set additional properties to hide it from dock
const hidePopupFromDock = () => {
  if (popupWindow && process.platform === 'darwin') {
    logger.debug('Setting additional properties to hide popup from dock');
    try {
      // Set additional properties to hide from dock and app switcher
      popupWindow.setSkipTaskbar(true);

      // For macOS, we need to set some additional properties
      if (typeof popupWindow.setHiddenInMissionControl === 'function') {
        popupWindow.setHiddenInMissionControl(true);
      }

      // Set the window to be an accessory window which helps hide it from dock
      if (typeof popupWindow.setWindowButtonVisibility === 'function') {
        popupWindow.setWindowButtonVisibility(false);
      }

      // Set the window to be a utility window which helps hide it from dock
      if (typeof popupWindow.setVisibleOnAllWorkspaces === 'function') {
        popupWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true, // Add this option to prevent dock hiding
        });
      }

      logger.debug('Successfully set additional properties to hide popup from dock');
    } catch (error) {
      logger.error('Error setting additional properties to hide popup from dock:', { error: error.message });
    }
  }
};

// Create a popup window for dictation
const createPopupWindow = () => {
  logger.debug('createPopupWindow called');

  try {
    logger.debug('Creating popup window with system-wide overlay settings');
    // Create the popup window as a system-wide overlay
    const popupWindow = new BrowserWindow({
      width: 180, // Smaller width for the pill
      height: 50, // Smaller height for the pill
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      movable: true,
      hasShadow: false, // Remove shadow to eliminate white border
      // Use 'panel' type for macOS to ensure it stays above all windows
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      visibleOnAllWorkspaces: true, // Visible on all workspaces
      focusable: false, // Make it non-focusable to prevent it from stealing focus
      icon: path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local resources
      },
      // Remove any styling that might cause a white border
      backgroundColor: '#00000000', // Fully transparent background
      // Set the window level to be above everything else
      level: 'screen-saver', // Use the highest level possible
      // Hide from dock and app switcher
      skipDock: true, // macOS specific property to hide from dock
      accessory: true, // macOS specific property to make it an accessory window
    });
    
    // IMPORTANT: Store the window in the global state
    global.popupWindow = popupWindow;
    
    logger.debug('Popup window created successfully');

    // Set additional properties to hide from dock
    hidePopupFromDock();

    logger.debug('Loading popup HTML file');
    // Load the popup HTML file
    popupWindow.loadFile(path.join(app.getAppPath(), 'dist/popup.html'));

    logger.debug('Getting primary display dimensions');
    // Position the popup window in the bottom right corner
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    logger.debug('Primary display dimensions:', width, 'x', height);
    logger.debug('Positioning popup window at:', width - 200, height - 100);
    popupWindow.setPosition(width - 200, height - 100);

    logger.debug('Setting popup window to be visible on all workspaces');
    // Make sure it's visible on all workspaces and full screen
    if (typeof popupWindow.setVisibleOnAllWorkspaces === 'function') {
      popupWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true, // Add this option to prevent dock hiding
      });
    }

    // Set the window to be always on top with the highest level
    popupWindow.setAlwaysOnTop(true, 'screen-saver');

    // For macOS, set the window level to floating (above everything)
    if (process.platform === 'darwin') {
      if (typeof popupWindow.setWindowButtonVisibility === 'function') {
        popupWindow.setWindowButtonVisibility(false);
      }
    }

    logger.debug('Setting popup window to ignore mouse events by default');
    // Make the window non-interactive when not hovered
    // This allows clicks to pass through to the application underneath
    popupWindow.setIgnoreMouseEvents(true, { forward: true });

    logger.debug('Setting up mouse event handlers for the popup window');
    // But enable mouse events when hovering over the window
    popupWindow.webContents.on('did-finish-load', () => {
      logger.debug('Popup window finished loading, setting up mouse event handlers');
      try {
        popupWindow.webContents.executeJavaScript(`
          document.addEventListener('mouseover', () => {
            logger.debug('Mouse over popup window, enabling mouse events');
            window.electronAPI.setIgnoreMouseEvents(false);
          });
          
          document.addEventListener('mouseout', () => {
            logger.debug('Mouse out of popup window, disabling mouse events');
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          });
        `);
        logger.debug('Mouse event handlers set up successfully');
      } catch (error) {
        logger.error('Error setting up mouse event handlers:', { error: error.message });
      }
    });

    // Add event listeners to track window state
    popupWindow.on('close', () => {
      logger.debug('Popup window close event triggered');
    });

    popupWindow.on('closed', () => {
      logger.debug('Popup window closed event triggered');
      global.popupWindow = null;
    });

    popupWindow.on('show', () => {
      logger.debug('Popup window show event triggered');
    });

    popupWindow.on('hide', () => {
      logger.debug('Popup window hide event triggered');
    });

    logger.debug('Popup window setup complete');

    return popupWindow;
  } catch (error) {
    logger.error('Error creating popup window:', { error: error.message });
    return null;
  }
};

// Show the popup window - always show it when the app starts
const showPopupWindow = () => {
  logger.debug('showPopupWindow called');

  if (!global.popupWindow) {
    logger.debug('No popup window exists, creating one');
    createPopupWindow();
  }

  if (global.popupWindow) {
    if (global.popupWindow.isDestroyed()) {
      logger.debug('Popup window is destroyed, creating a new one');
      createPopupWindow();
    }

    if (!global.popupWindow.isVisible()) {
      logger.debug('Showing popup window');
      try {
        global.popupWindow.show();
        logger.debug('Popup window shown successfully');

        // Ensure it's always on top and visible on all workspaces
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
          global.popupWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true, // Add this option to prevent dock hiding
          });
        }

        // For macOS, set the window level to floating (above everything)
        if (process.platform === 'darwin') {
          if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
            global.popupWindow.setWindowButtonVisibility(false);
          }
        }
      } catch (error) {
        logger.error('Error showing popup window:', { error: error.message });
      }
    } else {
      logger.debug('Popup window is already visible');
    }
  } else {
    logger.error('Failed to create popup window');
  }
};

// Hide the popup window - we'll keep this for potential future use
const hidePopupWindow = () => {
  logger.debug('hidePopupWindow called');

  if (global.popupWindow) {
    if (!global.popupWindow.isDestroyed()) {
      logger.debug('Updating popup window to show not recording state');
      try {
        // Instead of hiding, we'll just update the UI to show not recording
        // The actual UI update is handled by the renderer process based on isRecording state
        // We'll just ensure it stays visible and on top
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
          global.popupWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true, // Add this option to prevent dock hiding
          });
        }

        // For macOS, ensure window level is set to floating
        if (process.platform === 'darwin') {
          if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
            global.popupWindow.setWindowButtonVisibility(false);
          }
        }

        logger.debug('Popup window updated to not recording state');
      } catch (error) {
        logger.error('Error updating popup window:', { error: error.message });
      }
    } else {
      logger.debug('Popup window is destroyed, cannot update');
    }
  } else {
    logger.debug('No popup window to update');
  }
};

// Set up the dock menu for macOS
const setupDockMenu = () => {
  if (process.platform === 'darwin') {
    logger.debug('Setting up dock menu for macOS');

    const dockMenu = [
      {
        label: 'Show/Hide Dictation Popup',
        click: () => {
          if (global.popupWindow && !global.popupWindow.isDestroyed()) {
            if (global.popupWindow.isVisible()) {
              logger.debug('Hiding popup window from dock menu');
              hidePopupWindow();
            } else {
              logger.debug('Showing popup window from dock menu');
              showPopupWindow();
            }
          } else {
            logger.debug('Creating and showing popup window from dock menu');
            createPopupWindow();
            showPopupWindow();
          }
        },
      },
    ];

    app.dock.setMenu(require('electron').Menu.buildFromTemplate(dockMenu));
    logger.debug('Dock menu set up successfully');
  }
};

module.exports = {
  mainWindow,
  popupWindow,
  isRecording,
  createWindow,
  createPopupWindow,
  hidePopupFromDock,
  showPopupWindow,
  hidePopupWindow,
  setupDockMenu
}; 