const { app, BrowserWindow } = require('electron');
const path = require('path');
const logger = require('./logger');
const tray = require('./tray');
const { validatePythonEnvironment } = require('./services/pythonValidator');
const { setupIpcHandlers } = require('./ipc');
const fs = require('fs');
const temp = require('temp');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

// Create the main application window
const createWindow = () => {
  try {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // Hide window initially
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the index.html of the app
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      // Don't show window on startup, only when settings is clicked
      // mainWindow.show();
    });

    // Hide window when closed instead of destroying it
    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
      return true;
    });
  } catch (error) {
    logger.exception(error);
  }
};

// Show the settings window
const showSettings = () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }
};

// Initialize the application
const init = async () => {
  try {
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Create temp directory for audio files
    const TEMP_AUDIO_DIR = path.join(app.getPath('temp'), 'whisper-dictation');
    if (!fs.existsSync(TEMP_AUDIO_DIR)) {
      fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
    }
    
    // Track for cleanup
    temp.track();
    
    // Validate Python environment
    const pythonEnv = await validatePythonEnvironment();
    if (!pythonEnv.isValid) {
      logger.warn('Python environment validation failed:', pythonEnv);
      // We'll handle this in the UI later
    }

    // Initialize system tray
    tray.create(mainWindow, showSettings);

    // Create the main window (hidden initially)
    createWindow();
  } catch (error) {
    logger.exception(error);
  }
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  init();

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  // Clean up resources here if needed
  app.isQuitting = true;
  tray.destroy();
}); 