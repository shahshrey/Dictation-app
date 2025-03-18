// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const {
  app,
  BrowserWindow,
  globalShortcut,
} = require('electron');
const path = require('path');
const logger = require('../shared/logger').default;

// First import constants to prevent circular dependencies
const { TEMP_DIR, DEFAULT_SAVE_DIR, GROQ_MODELS } = require('./components/constants');

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

// Import IPC handlers last as they depend on all other components
const { setupIpcHandlers } = require('./components/ipcHandlers');

// Lazy load components that aren't needed immediately
let groqClient = null;
let initGroqClient = null;
let recordingManager = null;

// Function to lazily load the Groq client
// This function is used elsewhere in the codebase, do not remove
const loadGroqClient = () => {
  if (!groqClient) {
    const groqModule = require('./components/groqClient');
    groqClient = groqModule.groqClient;
    initGroqClient = groqModule.initGroqClient;
    global.initGroqClient = initGroqClient;
    global.groqClient = groqClient;
  }
  return { groqClient, initGroqClient };
};

// Function to lazily load permission utilities
const loadPermissionUtils = () => {
  const { checkMacOSPermissions, recheckAccessibilityPermission } = require('./components/permissionsUtils');
  return { checkMacOSPermissions, recheckAccessibilityPermission };
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  logger.debug('App ready event triggered');

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

  // Create main window immediately for better perceived performance
  logger.debug('Creating main window');
  const mainWindowInstance = createWindow();
  // Ensure global.mainWindow is set
  if (!global.mainWindow && mainWindowInstance) {
    global.mainWindow = mainWindowInstance;
  }

  // Initialize the recording manager
  logger.debug('Initializing recording manager');
  recordingManager = RecordingManager.initialize(require('electron').ipcMain, global.mainWindow, global.popupWindow);
  global.recordingManager = recordingManager;

  // Make sure the main window is created successfully
  if (!global.mainWindow) {
    logger.error('Failed to create main window, trying again');
    global.mainWindow = createWindow();
  }

  // Set up IPC handlers early
  logger.debug('Setting up IPC handlers');
  setupIpcHandlers(global.mainWindow, global.popupWindow, settings, getStore());

  // Show the main window immediately
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.show();
    global.mainWindow.focus();
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

        // Ensure the app stays in the dock on macOS, but the popup doesn't
        logger.debug('On macOS, setting app to stay in dock');
        app.dock.show();

        // Set the dock icon
        app.dock.setIcon(path.join(app.getAppPath(), 'src/assets/logo/logo.png'));

        // Set up the dock menu
        setupDockMenu();
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
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      if (!global.mainWindow.isVisible()) {
        logger.debug('Main window exists but is not visible, showing it');
        global.mainWindow.show();
        global.mainWindow.focus();
      }
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
      createWindow();

      // Defer popup window creation
      setTimeout(() => {
        logger.debug('Showing popup window');
        showPopupWindow();
      }, 300);
    } else {
      logger.debug('Windows already open, not creating new ones');
    }
  });

  logger.debug('App initialization complete');
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  logger.debug('All windows closed event triggered');
  logger.debug('Platform:', { platform: process.platform });

  if (process.platform !== 'darwin') {
    logger.debug('Not on macOS, quitting app');
    app.quit();
  } else {
    logger.debug('On macOS, app will remain running');

    // Check if windows are just minimized rather than closed
    if (global.mainWindowMinimized || global.popupWindowMinimized) {
      logger.debug('Windows are minimized, not recreating them');
      return;
    }

    // Always ensure the popup window is visible, but defer it
    setTimeout(() => {
      logger.debug('Ensuring popup window is visible');
      if (
        !global.popupWindow ||
        (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())
      ) {
        logger.debug('Popup window does not exist or is destroyed, recreating it');
        createPopupWindow();
        showPopupWindow();
      } else if (global.popupWindow && !global.popupWindow.isVisible()) {
        logger.debug('Popup window exists but is not visible, showing it');
        showPopupWindow();
      } else {
        logger.debug('Popup window is already visible');
      }

      // Ensure the app stays in the dock
      logger.debug('Ensuring app stays in dock');
      app.dock.show();
    }, 300);
  }
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  logger.debug('App will-quit event triggered');

  logger.debug('Unregistering all global shortcuts');
  globalShortcut.unregisterAll();

  logger.debug('Checking if popup window exists');
  // Close the popup window if it exists
  if (global.popupWindow) {
    logger.debug('Popup window exists, checking if destroyed');
    if (!global.popupWindow.isDestroyed()) {
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

  logger.debug('App cleanup complete');
});

// Add a handler for the before-quit event
app.on('before-quit', () => {
  logger.debug('App before-quit event triggered');
});

// Add a handler for the quit event
app.on('quit', () => {
  logger.debug('App quit event triggered');
});
