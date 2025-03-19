// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const {
  app,
  BrowserWindow,
  globalShortcut
} = require('electron');
const path = require('path');
const logger = require('../shared/logger').default;

// Import services first
const { GROQ_MODELS } = require('./services/groq');

// Import other constants 
const { TEMP_DIR, DEFAULT_SAVE_DIR } = require('./components/constants');

// Import the RecordingManager
const { RecordingManager, AUDIO_FILE_PATH } = require('./services/recording');

// Define global variables first to ensure they're available to all modules
// IMPORTANT: These globals must be set before importing modules that might use them
global.AUDIO_FILE_PATH = AUDIO_FILE_PATH;
global.DEFAULT_SAVE_DIR = DEFAULT_SAVE_DIR;
global.logger = logger;
global.GROQ_MODELS = GROQ_MODELS;
global.isRecording = false;
global.mainWindow = null;
global.popupWindow = null;
global.mainWindowMinimized = false;
global.popupWindowMinimized = false;
global.isQuitting = false; // Track when we're intentionally quitting the app

// Export TEMP_DIR so it can be imported by other modules
exports.TEMP_DIR = TEMP_DIR;

// Only after setting up globals, import other components
const { pasteTextAtCursor } = require('./components/clipboardUtils');
const { getStore, settings, initStore, ensureDirectories, loadSettingsFromFile } = require('./components/storeUtils');

// Set additional globals needed by other modules
global.settings = settings;
global.pasteTextAtCursor = pasteTextAtCursor;

// Import window manager after other globals are set
const {
  createWindow,
  createPopupWindow,
  hidePopupFromDock,
  showPopupWindow,
  setupDockMenu,
  registerGlobalHotkey,
  restoreMinimizedWindows
} = require('./components/windowManager');

// Import the tray manager
const { createTray, updateTrayMenu, destroyTray } = require('./components/trayManager');

// Import IPC handlers last as they depend on all other components
const { setupIpcHandlers } = require('./services/ipcHandlers');

// Lazy load components that aren't needed immediately
let groqClient = null;
let initGroqClient = null;
let recordingManager = null;

// Function to lazily load the Groq client
// This function is used elsewhere in the codebase, do not remove
const loadGroqClient = () => {
  if (!groqClient) {
    // Use the TypeScript service instead of the JavaScript module
    const groqService = require('./services/groq').default;
    groqClient = groqService.groqClient;
    initGroqClient = groqService.initGroqClient;
    global.initGroqClient = initGroqClient;
    global.groqClient = groqClient;
  }
  return { groqClient, initGroqClient };
};

// Make loadGroqClient available globally for other modules
global.loadGroqClient = loadGroqClient;

// Function to lazily load permission utilities
const loadPermissionUtils = () => {
  const { checkMacOSPermissions, recheckAccessibilityPermission } = require('./components/permissionsUtils');
  return { checkMacOSPermissions, recheckAccessibilityPermission };
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  logger.debug('App ready event triggered');

  // Set the app name for proper display in the menubar
  if (process.platform === 'darwin') {
    app.setName('Voice Vibe');
    // On macOS, don't show the app in the dock if we're using the menubar
    if (!app.dock) {
      logger.debug('app.dock is not available - not hiding dock icon');
    } else {
      logger.debug('Hiding dock icon since we use menubar');
      app.dock.hide();
    }
  }

  // Initialize store first as it's critical
  logger.debug('Initializing store');
  const storeInitialized = await initStore();
  
  // Set the global store after initialization
  global.store = getStore();
  
  // If store initialization failed, try to load settings from fallback file
  if (!storeInitialized) {
    logger.debug('Store initialization failed, trying to load settings from fallback file');
    loadSettingsFromFile();
  }

  // Initialize the system tray early in the startup process
  logger.debug('Creating system tray');
  global.tray = createTray();
  
  // Make tray-related functions available globally
  global.updateTrayMenu = updateTrayMenu;
  
  // Create main window immediately for better perceived performance
  logger.debug('Creating main window');
  const mainWindowInstance = createWindow();
  // Ensure global.mainWindow is set
  if (!global.mainWindow && mainWindowInstance) {
    global.mainWindow = mainWindowInstance;
  }
  
  // Make createWindow and showPopupWindow available globally
  global.createWindow = createWindow;
  global.showPopupWindow = showPopupWindow;

  // Initialize the recording manager
  logger.debug('Initializing recording manager');
  recordingManager = RecordingManager.initialize(require('electron').ipcMain, global.mainWindow, global.popupWindow);
  global.recordingManager = recordingManager;

  // Make sure the main window is created successfully
  if (!global.mainWindow) {
    logger.error('Failed to create main window, trying again');
    global.mainWindow = createWindow();
  }

  // Set up IPC handlers
  logger.debug('Setting up IPC handlers');
  // Set up Groq API with the TypeScript service first
  const { setupGroqAPI } = require('./services/groq');
  setupGroqAPI(require('electron').ipcMain);
  // Then set up regular IPC handlers
  setupIpcHandlers(global.mainWindow, global.popupWindow, settings, getStore());

  // Explicitly DON'T show the main window at startup
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    logger.debug('Main window created, but keeping it hidden at startup');
    
    // Ensure the window loads its content even though it's hidden
    // This is crucial for recording functionality to work properly
    global.mainWindow.webContents.once('did-finish-load', () => {
      logger.debug('Main window content loaded while hidden');
    });
  }

  // Defer non-essential operations
  setTimeout(() => {
    // Ensure directories exist (non-blocking)
    logger.debug('Ensuring directories exist');
    ensureDirectories();

    // Create popup window after a delay
    setTimeout(() => {
      logger.debug('Creating and showing the floating popup window');
      const popupWindowInstance = createPopupWindow();
      if (!global.popupWindow && popupWindowInstance) {
        global.popupWindow = popupWindowInstance;
      }
      
      if (!global.popupWindow) {
        logger.error('Failed to create popup window, trying again');
        global.popupWindow = createPopupWindow();
      }
      
      showPopupWindow();

      // Ensure the popup window doesn't appear in the app switcher
      if (global.popupWindow && process.platform === 'darwin') {
        hidePopupFromDock();
      }
    }, 500);

    // Check for macOS permissions needed for system-wide overlay (non-critical)
    if (process.platform === 'darwin') {
      setTimeout(() => {
        logger.debug('Checking macOS permissions for system-wide overlay');
        const { checkMacOSPermissions } = loadPermissionUtils();
        checkMacOSPermissions();

        // We're using the tray instead of the dock
        if (global.tray) {
          // If we need the dock for debugging, show it
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Dev mode: showing dock icon for debugging');
            app.dock.show();
            // Set the dock icon
            app.dock.setIcon(path.join(app.getAppPath(), 'src/assets/logo/logo.png'));
            // Set up the dock menu
            setupDockMenu();
          }
        } else {
          // Fallback to dock if tray fails
          logger.debug('Tray not available, showing dock');
          app.dock.show();
          // Set the dock icon
          app.dock.setIcon(path.join(app.getAppPath(), 'src/assets/logo/logo.png'));
          // Set up the dock menu
          setupDockMenu();
        }
      }, 1000);
    }

    // Register global hotkey after a delay
    setTimeout(() => {
      logger.debug('Registering global hotkey');
      registerGlobalHotkey(global.mainWindow, settings);
    }, 1500);
  }, 100);

  app.on('activate', () => {
    logger.debug('App activate event triggered');
    
    // If we're in the process of quitting, don't recreate windows
    if (global.isQuitting) {
      logger.debug('App is quitting, ignoring activate event');
      return;
    }
    
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    logger.debug('Number of open windows:', { count: BrowserWindow.getAllWindows().length });

    // First check if we have minimized windows that need to be restored
    if (global.mainWindowMinimized || global.popupWindowMinimized) {
      logger.debug('Minimized windows detected, restoring them');
      restoreMinimizedWindows();
      return;
    }

    // If main window exists but is not visible, show it
    // This is what we want to happen when the dock icon is clicked
    if (global.mainWindow && !global.mainWindow.isDestroyed && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
      if (!global.mainWindow.isVisible()) {
        logger.debug('Main window exists but is not visible, showing it');
        global.mainWindow.show();
        global.mainWindow.focus();
      }
    } else {
      // If main window doesn't exist or is destroyed, create a new one
      logger.debug('Main window does not exist or is destroyed, creating a new one');
      global.mainWindow = createWindow();
    }

    // Recheck permissions when app is activated, but defer it
    if (process.platform === 'darwin') {
      setTimeout(() => {
        logger.debug('Rechecking accessibility permissions on activate');
        const { recheckAccessibilityPermission } = loadPermissionUtils();
        recheckAccessibilityPermission();
      }, 500);
    }

    if (BrowserWindow.getAllWindows().length === 0) {
      logger.debug('No windows open, creating main window');
      const mainWindow = createWindow();
      
      // Show the main window since this was triggered by dock icon click
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }

      // Defer popup window creation
      setTimeout(() => {
        logger.debug('Showing popup window');
        showPopupWindow();
      }, 300);
    } else {
      logger.debug('Windows already open, not creating new ones');
    }

    // Always ensure the popup window is visible, but defer it
    setTimeout(() => {
      logger.debug('Ensuring popup window is visible');
      if (
        !global.popupWindow ||
        (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
      ) {
        logger.debug('Popup window does not exist or is destroyed, recreating it');
        global.popupWindow = createPopupWindow();
        showPopupWindow();
      } else if (global.popupWindow && !global.popupWindow.isDestroyed() && !global.popupWindow.isVisible()) {
        logger.debug('Popup window exists but is not visible, showing it');
        showPopupWindow();
      } else {
        logger.debug('Popup window is already visible');
      }

      // Ensure the app stays in the dock
      logger.debug('Ensuring app stays in dock');
      app.dock.show();
    }, 300);
  });

  logger.debug('App initialization complete');
});

// Quit when all windows are closed, even on macOS.
app.on('window-all-closed', () => {
  logger.debug('All windows closed event triggered');
  
  // Clean up all window references
  logger.debug('Cleaning up window references');
  if (global.mainWindow) {
    global.mainWindow = null;
  }
  
  if (global.popupWindow) {
    global.popupWindow = null;
  }
  
  // Reset window minimized flags
  global.mainWindowMinimized = false;
  global.popupWindowMinimized = false;

  // Don't quit the app when all windows are closed
  // The app will continue running in the system tray
  logger.debug('Windows closed but app continues running in system tray');
  
  // Update the tray menu to reflect the current state
  updateTrayMenu();
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  logger.debug('App will-quit event triggered');

  logger.debug('Unregistering all global shortcuts');
  globalShortcut.unregisterAll();
  
  // Destroy the tray
  logger.debug('Destroying system tray');
  destroyTray();

  logger.debug('Checking if popup window exists');
  // Close the popup window if it exists
  if (global.popupWindow) {
    logger.debug('Popup window exists, checking if destroyed');
    if (typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
      logger.debug('Closing popup window');
      try {
        global.popupWindow.close();
        logger.debug('Popup window closed successfully');
      } catch (error) {
        logger.error('Error closing popup window:', { error: error.message });
      }
    } else {
      logger.debug('Popup window is already destroyed');
    }
    global.popupWindow = null;
  } else {
    logger.debug('No popup window to close');
  }

  // Also clean up the main window reference
  if (global.mainWindow) {
    if (typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
      try {
        global.mainWindow.close();
      } catch (error) {
        logger.error('Error closing main window:', { error: error.message });
      }
    }
    global.mainWindow = null;
  }

  logger.debug('App cleanup complete');
});

// Add a handler for the before-quit event
app.on('before-quit', () => {
  logger.debug('App before-quit event triggered');
  
  // Make sure to unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Set a flag to indicate we're intentionally quitting
  global.isQuitting = true;
  
  // Close windows explicitly if they still exist
  if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.removeAllListeners();
      global.mainWindow.close();
    } catch (error) {
      logger.error('Error closing main window during quit:', { error: error.message });
    }
  }
  
  if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
    try {
      global.popupWindow.removeAllListeners();
      global.popupWindow.close();
    } catch (error) {
      logger.error('Error closing popup window during quit:', { error: error.message });
    }
  }
});

// Add a handler for the quit event
app.on('quit', () => {
  logger.debug('App quit event triggered');
  
  // Final cleanup
  global.mainWindow = null;
  global.popupWindow = null;
  global.mainWindowMinimized = false;
  global.popupWindowMinimized = false;
  
  // On macOS, ensure we're really quitting
  if (process.platform === 'darwin') {
    app.exit(0);
  }
});
