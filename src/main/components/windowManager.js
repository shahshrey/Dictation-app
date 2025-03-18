const { BrowserWindow, app, globalShortcut } = require('electron');
const path = require('path');
const os = require('os');
const logger = require('../../shared/logger').default;

// Debug log the environment
logger.debug('Current NODE_ENV:', process.env.NODE_ENV);
logger.debug('Is packaged:', app.isPackaged);

// Add file logging for packaged environment
if (app.isPackaged) {
  const logPath = path.join(os.homedir(), 'Library/Logs/VoiceVibe/app.log');
  logger.debug('Setting up file logging at:', logPath);
  // Ensure parent directory exists
  require('fs').mkdirSync(path.dirname(logPath), { recursive: true });
  
  // Create a write stream for logging
  const fs = require('fs');
  const util = require('util');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  // Wrap the original logger methods to also write to file
  const originalLogger = { ...logger };
  
  ['error', 'warn', 'info', 'debug'].forEach(level => {
    logger[level] = (message, meta = {}) => {
      // Call original logger method
      originalLogger[level](message, meta);
      
      // Write to log file
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} [${level.toUpperCase()}] ${message} ${util.inspect(meta)}\n`;
      logStream.write(logMessage);
    };
  });
}

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
    // Create the browser window with settings to keep it completely hidden
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
        webSecurity: false, // Allow loading local resources
        backgroundThrottling: false, // Don't throttle in background
        // Add audio capture flag to ensure macOS recognizes microphone activity
        audioCapture: true
      },
      show: false, // Never show until explicitly requested
      backgroundColor: '#FFFFFF', // Use a background color to ensure proper loading
      focusable: false, // Make it non-focusable to prevent it from stealing focus
      skipTaskbar: true, // Hide from taskbar
      hasShadow: false, // No shadow
      titleBarStyle: 'hidden', // Hide title bar
      enableLargerThanScreen: false, // Disable ability to be larger than screen
      minimizable: false, // Cannot be minimized
      maximizable: false, // Cannot be maximized
      closable: true, // Can be closed
      autoHideMenuBar: true, // Hide menu bar
      paintWhenInitiallyHidden: true // Still paint when hidden to enable background processing
    });
    
    // IMPORTANT: Store the window in the global state
    global.mainWindow = mainWindowInstance;
    
    logger.debug('Main window created successfully');

    // For macOS packaged app, ensure window is created properly
    if (process.platform === 'darwin' && app.isPackaged) {
      // Still show in dock but don't set visible on all workspaces
      app.dock.show(); // Still show in dock
    }

    logger.debug('Loading index.html file');
    // Load the index.html file
    if (app.isPackaged) {
      // In packaged app, use path relative to the executable
      const resourcePath = process.resourcesPath;
      logger.debug('Resource path for packaged app:', { resourcePath });
      mainWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'index.html'));
    } else {
      // In development, use the standard path
      mainWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
    }

    // Window is ready to show, but we'll keep it hidden unless explicitly requested
    mainWindowInstance.once('ready-to-show', () => {
      logger.debug('Main window ready to show, but keeping it hidden by default');
      // We're explicitly not showing the window here
      
      // Set size to 0,0 to ensure it's not visible even if somehow activated
      if (app.isPackaged) {
        mainWindowInstance.setSize(0, 0);
      }
    });

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Opening DevTools');
      mainWindowInstance.webContents.openDevTools();
    }

    // Add event listeners to track window state
    mainWindowInstance.on('close', () => {
      logger.debug('Main window close event triggered');
    });

    mainWindowInstance.on('closed', () => {
      logger.debug('Main window closed event triggered');
      global.mainWindow = null;
    });

    mainWindowInstance.on('focus', () => {
      logger.debug('Main window focus event triggered');
      // If the app is packaged and window gets focus, hide it right away
      // unless it was intentionally shown via dock click
      if (app.isPackaged && !global.mainWindowShowRequested) {
        logger.debug('Hiding main window that got focus unintentionally');
        mainWindowInstance.hide();
      }
    });

    mainWindowInstance.on('blur', () => {
      logger.debug('Main window blur event triggered');
    });

    // Add event listeners for minimize and restore
    mainWindowInstance.on('minimize', () => {
      logger.debug('Main window minimize event triggered');
      global.mainWindowMinimized = true;
    });

    mainWindowInstance.on('restore', () => {
      logger.debug('Main window restore event triggered');
      global.mainWindowMinimized = false;
    });

    // Special flag to track when showing window is intended
    global.mainWindowShowRequested = false;

    // Handle macOS specific events
    if (process.platform === 'darwin') {
      // This event is emitted when the user clicks the dock icon
      app.on('activate', () => {
        logger.debug('App activate event triggered from dock icon click');
        
        // Set the flag indicating this show is requested by user
        global.mainWindowShowRequested = true;
        
        if (global.mainWindowMinimized) {
          logger.debug('Main window is minimized, restoring it from dock click');
          if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
            try {
              // Set proper size before showing
              mainWindowInstance.setSize(800, 600);
              mainWindowInstance.restore();
              mainWindowInstance.focus();
              global.mainWindowMinimized = false;
            } catch (error) {
              logger.error('Error restoring main window from dock click:', { error: error.message });
            }
          }
        } else if (!mainWindowInstance.isVisible()) {
          // Show window when dock icon is clicked
          logger.debug('Main window is not visible, showing it from dock click');
          // Set proper size before showing
          mainWindowInstance.setSize(800, 600);
          mainWindowInstance.show();
          mainWindowInstance.focus();
        }
        
        // Reset the flag after a short delay
        setTimeout(() => {
          global.mainWindowShowRequested = false;
        }, 1000);
      });
    }

    logger.debug('Main window setup complete');

    return mainWindowInstance;
  } catch (error) {
    logger.error('Error creating main window:', { error: error.message });
    return null;
  }
};

// After creating the popup window, set additional properties to hide it from dock
const hidePopupFromDock = () => {
  if (global.popupWindow && process.platform === 'darwin') {
    logger.debug('Setting additional properties to hide popup from dock');
    try {
      // Set additional properties to hide from dock and app switcher
      global.popupWindow.setSkipTaskbar(true);

      // For macOS, we need to set some additional properties
      if (typeof global.popupWindow.setHiddenInMissionControl === 'function') {
        global.popupWindow.setHiddenInMissionControl(true);
      }

      // Set the window to be an accessory window which helps hide it from dock
      if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
        global.popupWindow.setWindowButtonVisibility(false);
      }

      // Set the window to be a utility window which helps hide it from dock
      if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
        global.popupWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true, // Add this option to prevent dock hiding
        });
      }

      // For macOS Sequoia (15.1), we need an additional step to hide from dock
      const osVersion = os.release();
      logger.debug('macOS version:', { version: osVersion });

      // If it's macOS Sequoia or newer
      if (osVersion.startsWith('24.')) {
        // macOS Sequoia is Darwin 24.x
        logger.debug('Using macOS Sequoia specific settings to hide popup from dock');

        // Set the window to be a utility window
        if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
          global.popupWindow.setWindowButtonVisibility(false);
        }

        // Set the window to be an accessory window
        if (typeof global.popupWindow.setAccessoryView === 'function') {
          global.popupWindow.setAccessoryView(true);
        }
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
    const popupWindowInstance = new BrowserWindow({
      width: 180, // Smaller width for the pill
      height: 50, // Smaller height for the pill
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false, // Don't show until ready
      resizable: false,
      movable: true,
      hasShadow: false, // Remove shadow to eliminate white border
      // Use 'panel' type for macOS to ensure it stays above all windows
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      visibleOnAllWorkspaces: true, // Visible on all workspaces
      focusable: false, // Make it non-focusable to prevent it from stealing focus
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'logo.png')
        : path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: app.isPackaged 
          ? path.join(process.resourcesPath, 'app.asar', 'dist', 'preload', 'preload.js')
          : path.join(app.getAppPath(), 'dist/preload/preload.js'),
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
    global.popupWindow = popupWindowInstance;
    
    logger.debug('Popup window created successfully');

    // Set additional properties to hide from dock
    hidePopupFromDock();

    logger.debug('Loading popup HTML file');
    // Load the popup HTML file
    if (app.isPackaged) {
      // In packaged app, use path relative to the executable
      const resourcePath = process.resourcesPath;
      logger.debug('Resource path for packaged app:', { resourcePath });
      popupWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'popup.html'));
    } else {
      // In development, use the standard path
      popupWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/popup.html'));
    }

    // Show window when ready to show
    popupWindowInstance.once('ready-to-show', () => {
      logger.debug('Popup window ready to show');
      // We don't show it here - it will be shown by showPopupWindow
    });

    logger.debug('Getting primary display dimensions');
    // Position the popup window in the bottom right corner
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    logger.debug('Primary display dimensions:', width, 'x', height);
    logger.debug('Positioning popup window at:', width - 200, height - 100);
    popupWindowInstance.setPosition(width - 200, height - 100);

    logger.debug('Setting popup window to be visible on all workspaces');
    // Make sure it's visible on all workspaces and full screen
    if (typeof popupWindowInstance.setVisibleOnAllWorkspaces === 'function') {
      popupWindowInstance.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true, // Add this option to prevent dock hiding
      });
    }

    // Set the window to be always on top with the highest level
    popupWindowInstance.setAlwaysOnTop(true, 'screen-saver');

    // For macOS, set the window level to floating (above everything)
    if (process.platform === 'darwin') {
      if (typeof popupWindowInstance.setWindowButtonVisibility === 'function') {
        popupWindowInstance.setWindowButtonVisibility(false);
      }
    }

    logger.debug('Setting popup window to ignore mouse events by default');
    // Make the window non-interactive when not hovered
    // This allows clicks to pass through to the application underneath
    popupWindowInstance.setIgnoreMouseEvents(true, { forward: true });

    logger.debug('Setting up mouse event handlers for the popup window');
    // But enable mouse events when hovering over the window
    popupWindowInstance.webContents.on('did-finish-load', () => {
      logger.debug('Popup window finished loading, setting up mouse event handlers');
      try {
        popupWindowInstance.webContents.executeJavaScript(`
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
    popupWindowInstance.on('close', () => {
      logger.debug('Popup window close event triggered');
    });

    popupWindowInstance.on('closed', () => {
      logger.debug('Popup window closed event triggered');
      global.popupWindow = null;
    });

    popupWindowInstance.on('show', () => {
      logger.debug('Popup window show event triggered');
    });

    popupWindowInstance.on('hide', () => {
      logger.debug('Popup window hide event triggered');
    });

    // Add event listeners for minimize and restore
    popupWindowInstance.on('minimize', () => {
      logger.debug('Popup window minimize event triggered');
      global.popupWindowMinimized = true;
    });

    popupWindowInstance.on('restore', () => {
      logger.debug('Popup window restore event triggered');
      global.popupWindowMinimized = false;
    });

    logger.debug('Popup window setup complete');

    return popupWindowInstance;
  } catch (error) {
    logger.error('Error creating popup window:', { error: error.message });
    return null;
  }
};

// Show the popup window - always show it when the app starts
const showPopupWindow = () => {
  logger.debug('showPopupWindow called');

  try {
    if (!global.popupWindow) {
      logger.debug('No popup window exists, creating one');
      global.popupWindow = createPopupWindow();
    }

    if (global.popupWindow) {
      if (global.popupWindow.isDestroyed()) {
        logger.debug('Popup window is destroyed, creating a new one');
        global.popupWindow = createPopupWindow();
      }

      // Check if window is minimized and restore it
      if (global.popupWindowMinimized) {
        logger.debug('Popup window is minimized, restoring it');
        try {
          global.popupWindow.restore();
          global.popupWindowMinimized = false;
        } catch (error) {
          logger.error('Error restoring popup window:', { error: error.message });
        }
      }

      if (!global.popupWindow.isVisible()) {
        logger.debug('Showing popup window');
        try {
          // Force show the popup window
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
          
          // Force show again after a short delay to ensure it's visible
          setTimeout(() => {
            if (global.popupWindow && !global.popupWindow.isDestroyed() && !global.popupWindow.isVisible()) {
              logger.debug('Forcing popup window to show again');
              global.popupWindow.show();
            }
          }, 100);
        } catch (error) {
          logger.error('Error showing popup window:', { error: error.message });
          // Try to recreate the window if showing fails
          logger.debug('Attempting to recreate popup window after show error');
          global.popupWindow = createPopupWindow();
          if (global.popupWindow && !global.popupWindow.isDestroyed()) {
            global.popupWindow.show();
          }
        }
      } else {
        logger.debug('Popup window is already visible');
        // Ensure it's always on top even if already visible
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } else {
      logger.error('Failed to create popup window');
    }
  } catch (error) {
    logger.error('Unexpected error in showPopupWindow:', { error: error.message });
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
        label: 'Show/Hide Voice Vibe Popup',
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

// Set ignore mouse events for the popup window
const setIgnoreMouseEvents = (ignore, options = { forward: true }) => {
  logger.debug('setIgnoreMouseEvents called with ignore:', ignore);
  
  if (global.popupWindow) {
    if (!global.popupWindow.isDestroyed()) {
      try {
        // Use the provided options or default to forwarding events when not ignoring
        const forwardOptions = options || { forward: !ignore };
        global.popupWindow.setIgnoreMouseEvents(ignore, forwardOptions);
        logger.debug('Successfully set ignore mouse events');
        return true;
      } catch (error) {
        logger.error('Error setting ignore mouse events:', { error: error.message });
        return false;
      }
    } else {
      logger.debug('Cannot set ignore mouse events - popup window is destroyed');
      return false;
    }
  }
  logger.debug('Cannot set ignore mouse events - popup window does not exist');
  return false;
};

// Handle hotkey toggle recording
const handleHotkeyToggle = () => {
  logger.debug('Hotkey pressed!');
  logger.debug('mainWindow exists:', { exists: !!global.mainWindow });
  logger.debug('popupWindow exists:', { exists: !!global.popupWindow });
  
  // Ensure we're not showing the main window by setting this flag
  global.mainWindowShowRequested = false;
  
  // Ensure main window exists but don't show it
  if (!global.mainWindow || global.mainWindow.isDestroyed()) {
    logger.debug('Main window does not exist or is destroyed, recreating it but keeping hidden');
    global.mainWindow = createWindow();
    // Instead of showing it, make sure it's loaded but remains hidden
    if (global.mainWindow) {
      // Make sure the window loads its content but stays hidden
      global.mainWindow.webContents.once('did-finish-load', () => {
        logger.debug('Main window loaded but kept hidden');
        // If somehow the window is visible, hide it
        if (global.mainWindow.isVisible()) {
          global.mainWindow.hide();
        }
      });
      
      // Also hide if it gets focus unexpectedly
      global.mainWindow.on('focus', () => {
        if (!global.mainWindowShowRequested) {
          logger.debug('Main window focused unexpectedly during hotkey, hiding it');
          global.mainWindow.hide();
        }
      });
    }
  } else {
    // Don't restore or show the main window at all
    logger.debug('Main window exists, keeping it hidden');
    
    // If somehow the window is visible, hide it
    if (global.mainWindow.isVisible()) {
      global.mainWindow.hide();
    }
  }
  
  // Ensure popup window exists and is visible
  if (!global.popupWindow || global.popupWindow.isDestroyed()) {
    logger.debug('Popup window does not exist or is destroyed, recreating it');
    global.popupWindow = createPopupWindow();
    
    // Ensure the popup window is shown
    if (global.popupWindow) {
      showPopupWindow();
    }
  } else {
    // Check if window is minimized and restore it
    if (global.popupWindowMinimized) {
      logger.debug('Popup window is minimized, restoring it');
      global.popupWindow.restore();
      global.popupWindowMinimized = false;
    } else if (!global.popupWindow.isVisible()) {
      showPopupWindow();
    }
  }
  
  // Check if we have the new recordingManager available
  if (global.recordingManager) {
    logger.debug('Using RecordingManager for recording state management');
    // The current recording state is available from the RecordingManager
    logger.debug('Current recording state:', { isRecording: global.recordingManager.getIsRecording() });
  } else {
    // Fall back to global state for backward compatibility
    logger.debug('Current recording state:', { isRecording: global.isRecording });
  }
  
  // Now safely send event to main window to initiate actual recording
  // This is critical to ensure recording works even when the window is hidden
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    logger.debug('Sending toggle-recording event to mainWindow');
    try {
      // Make sure the window is loaded before sending the event
      if (global.mainWindow.webContents.isLoading()) {
        logger.debug('Main window is still loading, waiting for it to finish loading before sending toggle-recording event');
        global.mainWindow.webContents.once('did-finish-load', () => {
          // Set the flag to false to ensure window doesn't show
          global.mainWindowShowRequested = false;
          global.mainWindow.webContents.send('toggle-recording');
          
          // Double-check the window is hidden after sending event
          setTimeout(() => {
            if (global.mainWindow && !global.mainWindow.isDestroyed() && global.mainWindow.isVisible()) {
              logger.debug('Window became visible after toggle-recording, hiding it');
              global.mainWindow.hide();
            }
          }, 100);
        });
      } else {
        // Set the flag to false to ensure window doesn't show
        global.mainWindowShowRequested = false;
        global.mainWindow.webContents.send('toggle-recording');
        
        // Double-check the window is hidden after sending event
        setTimeout(() => {
          if (global.mainWindow && !global.mainWindow.isDestroyed() && global.mainWindow.isVisible()) {
            logger.debug('Window became visible after toggle-recording, hiding it');
            global.mainWindow.hide();
          }
        }, 100);
      }
    } catch (error) {
      logger.error('Error sending toggle-recording event:', { error: error.message });
    }
  }
  
  // Also send event to popup window to update UI immediately
  if (global.popupWindow && !global.popupWindow.isDestroyed()) {
    try {
      // We're not changing the recording state directly,
      // but we want the popup to show loading state while waiting for confirmation
      global.popupWindow.webContents.send('recording-toggle-requested');
    } catch (error) {
      logger.error('Error sending recording-toggle-requested event:', { error: error.message });
    }
  }
};

// Register global hotkey
const registerGlobalHotkey = (_, settings) => {
  logger.debug('Registering global hotkey...');
  logger.debug('Current recording state:', { isRecording: global.isRecording });
  logger.debug('mainWindow exists:', { exists: !!global.mainWindow });

  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();
  logger.debug('Unregistered all existing shortcuts');

  // Get the hotkey from settings, default to 'Home' if not set
  const hotkey = settings.hotkey || 'Home';
  logger.debug('Using hotkey:', { hotkey });

  try {
    // Register the global shortcut with the hotkey from settings
    logger.debug('Attempting to register hotkey:', { hotkey });
    const registered = globalShortcut.register(hotkey, handleHotkeyToggle);

    if (!registered) {
      logger.error(`Failed to register hotkey: ${hotkey}`);
    } else {
      logger.debug(`Successfully registered hotkey: ${hotkey}`);
    }
  } catch (error) {
    logger.error(`Error registering hotkey ${hotkey}:`, { error: error.message });

    // Fallback to Home key if the specified hotkey is invalid
    try {
      logger.debug('Attempting to register fallback hotkey: Home');
      globalShortcut.register('Home', handleHotkeyToggle);
      logger.debug('Fallback to Home key successful');
    } catch (fallbackError) {
      logger.error('Failed to register fallback hotkey:', { error: fallbackError.message });
    }
  }
};

// Restore minimized windows
const restoreMinimizedWindows = () => {
  logger.debug('restoreMinimizedWindows called');

  // Restore main window if minimized
  if (global.mainWindow && !global.mainWindow.isDestroyed() && global.mainWindowMinimized) {
    logger.debug('Restoring minimized main window');
    try {
      // First check if the window is actually minimized
      if (typeof global.mainWindow.isMinimized === 'function' && global.mainWindow.isMinimized()) {
        global.mainWindow.restore();
        logger.debug('Main window restored successfully');
      } else {
        // If not actually minimized but flag is set, just show it
        global.mainWindow.show();
        logger.debug('Main window shown (was not actually minimized)');
      }
      global.mainWindow.focus();
      global.mainWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring main window:', { error: error.message });
      // Try to show the window as a fallback
      try {
        global.mainWindow.show();
      } catch (showError) {
        logger.error('Error showing main window as fallback:', { error: showError.message });
      }
    }
  }

  // Restore popup window if minimized
  if (global.popupWindow && !global.popupWindow.isDestroyed() && global.popupWindowMinimized) {
    logger.debug('Restoring minimized popup window');
    try {
      // First check if the window is actually minimized
      if (typeof global.popupWindow.isMinimized === 'function' && global.popupWindow.isMinimized()) {
        global.popupWindow.restore();
        logger.debug('Popup window restored successfully');
      } else {
        // If not actually minimized but flag is set, just show it
        global.popupWindow.show();
        logger.debug('Popup window shown (was not actually minimized)');
      }
      global.popupWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring popup window:', { error: error.message });
      // Try to show the window as a fallback
      try {
        global.popupWindow.show();
      } catch (showError) {
        logger.error('Error showing popup window as fallback:', { error: showError.message });
      }
    }
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
  setupDockMenu,
  setIgnoreMouseEvents,
  handleHotkeyToggle,
  registerGlobalHotkey,
  restoreMinimizedWindows
}; 