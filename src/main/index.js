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

// Import path helpers/functions
const pathConstants = require('./services/path-constants');

// Import the RecordingManager which now exports the path functions
const { RecordingManager, getAudioFilePath } = require('./services/audio/recording');

// Define global variables first to ensure they're available to all modules
// IMPORTANT: These globals must be set before importing modules that might use them
global.AUDIO_FILE_PATH = getAudioFilePath();
global.DEFAULT_SAVE_DIR = pathConstants.getSaveDir();
global.logger = logger;
global.GROQ_MODELS = GROQ_MODELS;
global.isRecording = false;
global.mainWindow = null;
global.popupWindow = null;
global.mainWindowMinimized = false;
global.popupWindowMinimized = false;
global.isQuitting = false; // Track when we're intentionally quitting the app

// Export path functions so they can be imported by other modules
exports.getTempDir = pathConstants.getTempDir;
exports.getSaveDir = pathConstants.getSaveDir;
exports.getAudioFilePath = getAudioFilePath;

// Only after setting up globals, import other components
const { pasteTextAtCursor } = require('./services/clipboard/clipboard').default;
const { getStore, settings, initStore, ensureDirectories, loadSettingsFromFile } = require('./services/StoreService');

// Set additional globals needed by other modules
global.settings = settings;
global.pasteTextAtCursor = pasteTextAtCursor;

// Import window manager after other globals are set
const {
  createMainWindow: createWindow,
  createPopupWindow,
  hidePopupFromDock,
  showPopupWindow,
  setupDockMenu,
  registerGlobalHotkey,
  restoreMinimizedWindows
} = require('./services/window/index');

// Import the tray manager
const { createTray, updateTrayMenu, destroyTray } = require('./services/tray/trayManager');

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
  const { checkMacOSPermissions, recheckAccessibilityPermission } = require('./services/permissions/permissions');
  return { checkMacOSPermissions, recheckAccessibilityPermission };
};

// Add a debounce mechanism to prevent multiple activations in quick succession
let activateInProgress = false;
let lastActivateTime = 0;
const ACTIVATE_DEBOUNCE_TIME = 1000; // ms - increased to 1 second for more safety

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
    
    const now = Date.now();
    
    // More robust debounce/throttle mechanism:
    // 1. Check if activation is already in progress
    // 2. Check if we received an activate event too soon after the last one
    if (activateInProgress || (now - lastActivateTime < ACTIVATE_DEBOUNCE_TIME)) {
      logger.debug(`Activate event debounced (in progress: ${activateInProgress}, time since last: ${now - lastActivateTime}ms)`);
      return;
    }
    
    // Update the last activate time and set the in-progress flag
    lastActivateTime = now;
    activateInProgress = true;
    
    // If we're in the process of quitting, don't recreate windows
    if (global.isQuitting) {
      logger.debug('App is quitting, ignoring activate event');
      activateInProgress = false;
      return;
    }
    
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    logger.debug('Number of open windows:', { count: BrowserWindow.getAllWindows().length });

    // Implement a coordinated window management strategy
    const handleActivation = () => {
      // First check if we have minimized windows that need to be restored
      if (global.mainWindowMinimized || global.popupWindowMinimized) {
        logger.debug('Minimized windows detected, restoring them');
        restoreMinimizedWindows();
        return true; // Handled
      }

      // If main window exists but is not visible, show it
      // This is what we want to happen when the dock icon is clicked
      if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
        if (!global.mainWindow.isVisible()) {
          logger.debug('Main window exists but is not visible, showing it');
          global.mainWindow.show();
          global.mainWindow.focus();
          return true; // Handled
        }
        // Window exists and is visible, nothing to do
        return true;
      } else if (BrowserWindow.getAllWindows().length === 0) {
        // If main window doesn't exist or is destroyed, and no windows are open, create a new one
        logger.debug('Main window does not exist or is destroyed, creating a new one');
        global.mainWindow = createWindow();
        if (global.mainWindow) {
          global.mainWindow.show();
          global.mainWindow.focus();
        }
        return true; // Handled
      }
      
      return false; // Not handled
    };
    
    // Execute the main window management logic
    handleActivation();
    
    // Ensure popup window is managed properly regardless of main window state
    if (!global.isQuitting) {
      // Check if popup window needs to be created/shown
      if (!global.popupWindow || 
          (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())) {
        logger.debug('Popup window does not exist or is destroyed, recreating it');
        global.popupWindow = createPopupWindow();
        if (global.popupWindow) {
          showPopupWindow();
        }
      } else if (global.popupWindow && !global.popupWindow.isDestroyed() && !global.popupWindow.isVisible()) {
        logger.debug('Popup window exists but is not visible, showing it');
        showPopupWindow();
      }
    }
    
    // Recheck permissions when app is activated
    if (process.platform === 'darwin') {
      const { recheckAccessibilityPermission } = loadPermissionUtils();
      recheckAccessibilityPermission();
      
      // Ensure the app stays in the dock
      if (app.dock) {
        app.dock.show();
      }
    }
    
    // Release the debounce lock after a delay
    setTimeout(() => {
      activateInProgress = false;
      logger.debug('Activate event handler completed, released debounce lock');
    }, ACTIVATE_DEBOUNCE_TIME);
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
