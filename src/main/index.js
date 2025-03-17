// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const {
  app,
  BrowserWindow,
  globalShortcut,
} = require('electron');
const path = require('path');
const os = require('os');
const logger = require('../shared/logger').default;

// First import constants to prevent circular dependencies
const { TEMP_DIR, DEFAULT_SAVE_DIR, GROQ_MODELS } = require('./components/constants');

// Define AUDIO_FILE_PATH here instead of importing from constants to avoid circular dependency
const AUDIO_FILE_PATH = path.join(TEMP_DIR, 'recording.webm');

// Define global variables first to ensure they're available to all modules
// IMPORTANT: These globals must be set before importing modules that might use them
global.AUDIO_FILE_PATH = AUDIO_FILE_PATH;
global.DEFAULT_SAVE_DIR = DEFAULT_SAVE_DIR;
global.logger = logger;
global.GROQ_MODELS = GROQ_MODELS;
global.isRecording = false;
global.mainWindow = null;
global.popupWindow = null;

// Only after setting up globals, import other components
const { pasteTextAtCursor } = require('./components/clipboardUtils');
const { checkMacOSPermissions } = require('./components/permissionsUtils');
const { store, settings, initStore, ensureDirectories } = require('./components/storeUtils');
const { groqClient, initGroqClient } = require('./components/groqClient');

// Set additional globals needed by other modules
global.settings = settings;
global.store = store;
global.pasteTextAtCursor = pasteTextAtCursor;
global.initGroqClient = initGroqClient;
global.groqClient = groqClient;

// Import window manager after other globals are set
const {
  createWindow,
  createPopupWindow,
  hidePopupFromDock,
  showPopupWindow,
  hidePopupWindow,
  setupDockMenu,
} = require('./components/windowManager');

// Import IPC handlers last as they depend on all other components
const { setupIpcHandlers, registerGlobalHotkey } = require('./components/ipcHandlers');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  logger.debug('App ready event triggered');

  // Check for macOS permissions needed for system-wide overlay
  logger.debug('Checking macOS permissions for system-wide overlay');
  checkMacOSPermissions();

  // Ensure the app stays in the dock on macOS, but the popup doesn't
  if (process.platform === 'darwin') {
    logger.debug('On macOS, setting app to stay in dock');
    app.dock.show();

    // Set the dock icon
    app.dock.setIcon(path.join(app.getAppPath(), 'src/assets/logo/logo.png'));

    // Set up the dock menu
    setupDockMenu();

    // Set the app's activation policy to show in dock but hide popup
    try {
      // This is a macOS specific API to control dock behavior
      if (app.dock && typeof app.dock.setMenu === 'function') {
        // Create a dock menu that allows controlling the popup
        const dockMenu = require('electron').Menu.buildFromTemplate([
          {
            label: 'Show Dictation Popup',
            click: () => {
              if (!global.popupWindow || global.popupWindow.isDestroyed()) {
                createPopupWindow();
              }
              showPopupWindow();
            },
          },
          {
            label: 'Hide Dictation Popup',
            click: () => {
              if (global.popupWindow && !global.popupWindow.isDestroyed()) {
                hidePopupWindow();
              }
            },
          },
        ]);

        app.dock.setMenu(dockMenu);
      }
    } catch (error) {
      logger.error('Error setting dock menu:', { error: error.message });
    }
  }

  logger.debug('Initializing store');
  await initStore();

  logger.debug('Ensuring directories exist');
  ensureDirectories();

  logger.debug('Creating main window');
  const mainWindowInstance = createWindow();
  // Ensure global.mainWindow is set
  if (!global.mainWindow && mainWindowInstance) {
    global.mainWindow = mainWindowInstance;
  }

  logger.debug('Setting up IPC handlers');
  // Pass the window manager functions to the IPC handlers
  const windowManager = {
    showPopupWindow,
    hidePopupWindow,
  };

  // Pass all necessary dependencies to setupIpcHandlers
  setupIpcHandlers(global.mainWindow, global.popupWindow, settings, store, windowManager);

  logger.debug('Creating and showing the floating popup window');
  // Create and show the floating popup window
  const popupWindowInstance = createPopupWindow();
  // Ensure global.popupWindow is set
  if (!global.popupWindow && popupWindowInstance) {
    global.popupWindow = popupWindowInstance;
  }
  showPopupWindow();

  // Ensure the popup window doesn't appear in the app switcher
  if (global.popupWindow && process.platform === 'darwin') {
    try {
      // This is a macOS specific trick to hide from the app switcher
      global.popupWindow.setWindowButtonVisibility(false);
      global.popupWindow.setSkipTaskbar(true);

      // Call the function to hide popup from dock
      hidePopupFromDock();

      // For macOS Sequoia (15.1), we need an additional step to hide from dock
      if (process.platform === 'darwin') {
        // Get the macOS version
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
      }
    } catch (error) {
      logger.error('Error configuring popup window visibility:', { error: error.message });
    }
  }

  logger.debug('Registering global hotkey');
  // Register the global shortcut with the current hotkey from settings
  registerGlobalHotkey(global.mainWindow, settings);

  app.on('activate', () => {
    logger.debug('App activate event triggered');
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    logger.debug('Number of open windows:', { count: BrowserWindow.getAllWindows().length });

    if (BrowserWindow.getAllWindows().length === 0) {
      logger.debug('No windows open, creating main window');
      createWindow();

      logger.debug('Showing popup window');
      showPopupWindow();
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

    // Always ensure the popup window is visible
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
      // Ensure it's always on top and visible on all workspaces
      if (global.popupWindow && !global.popupWindow.isDestroyed()) {
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        global.popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    }

    // Ensure the app stays in the dock
    logger.debug('Ensuring app stays in dock');
    app.dock.show();
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
