// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const { app, BrowserWindow, ipcMain, globalShortcut, dialog, systemPreferences, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Groq } = require('groq-sdk');
// Import the logger
const { getLogger, initLoggers, LOG_LEVELS } = require('../../dist/shared/logger');
// Import the cursor service
const { insertTextAtCursor, insertTextAtCursorViaClipboard } = require('../../dist/main/services/cursor');
// Import the groq service
const { setupGroqAPI } = require('../../dist/main/services/groq');
// Import the storage service
const { setupFileStorage } = require('../../dist/main/services/storage');
// Import the audio service
const { setupAudioRecording } = require('../../dist/main/services/audio');

// Initialize the logger
let logger;

// Define constants
const TEMP_DIR = path.join(os.tmpdir(), 'dictation-app');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, 'recording.webm');
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Dictation App');

// Define Groq API models
const GROQ_MODELS = {
  TRANSCRIPTION: {
    MULTILINGUAL: 'whisper-large-v3',
    MULTILINGUAL_TURBO: 'whisper-large-v3-turbo',
    ENGLISH: 'distil-whisper-large-v3-en'
  },
  TRANSLATION: 'whisper-large-v3'
};

// Check for macOS accessibility permissions
const checkMacOSPermissions = () => {
  if (process.platform === 'darwin') {
    logger.info('Checking macOS accessibility permissions');
    
    // Check for screen recording permission (needed for system-wide overlay)
    const hasScreenRecordingPermission = systemPreferences.getMediaAccessStatus('screen');
    logger.info('Screen recording permission status', { status: hasScreenRecordingPermission });
    
    if (hasScreenRecordingPermission !== 'granted') {
      logger.info('Requesting screen recording permission');
      try {
        // This will prompt the user for permission
        systemPreferences.askForMediaAccess('screen');
      } catch (error) {
        logger.exception(error, 'Error requesting screen recording permission');
      }
    }
    
    // Check for accessibility permission (needed for system-wide overlay)
    const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
    logger.info('Accessibility permission status', { status: hasAccessibilityPermission });
    
    if (!hasAccessibilityPermission) {
      logger.info('App needs accessibility permission for system-wide overlay');
      dialog.showMessageBox({
        type: 'info',
        title: 'Accessibility Permission Required',
        message: 'This app needs accessibility permission to show the dictation overlay on top of all applications.',
        detail: 'Please go to System Preferences > Security & Privacy > Privacy > Accessibility and add this app to the list of allowed apps.',
        buttons: ['Open System Preferences', 'Later'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) {
          // Open System Preferences to the Accessibility pane
          const command = 'open x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
          require('child_process').exec(command);
        }
      }).catch(error => {
        logger.exception(error, 'Error showing permission dialog');
      });
    }
  }
};

// Initialize store for settings
let store = null;

// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  defaultLanguage: 'auto',
  transcriptionModel: GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL,
  showNotifications: true,
  saveTranscriptionsAutomatically: false,
  insertAtCursor: true // Default to inserting text at cursor position
};

// Settings object
let settings = { ...DEFAULT_SETTINGS };

// Initialize store
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    logger.info('Creating electron-store instance');
    
    store = new Store({
      name: 'dictation-app-settings',
      defaults: DEFAULT_SETTINGS
    });
    
    logger.info('Store created successfully', {
      storeType: typeof store,
      hasStore: !!store.store,
      storeKeys: Object.keys(store.store || {})
    });
    
    settings = store.store;
    logger.info('Settings loaded from store', {
      hasApiKey: !!settings.apiKey,
      apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
      settingsKeys: Object.keys(settings)
    });
    
    return true;
  } catch (error) {
    logger.exception(error, 'Failed to initialize store');
    return false;
  }
}

// Test Groq API connection
async function testGroqAPIConnection() {
  try {
    logger.info('Testing Groq API connection');
    
    // Get API key from settings
    const apiKey = settings.apiKey;
    logger.info('API key from settings', { 
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    // Also try to get API key directly from store
    let storeApiKey = '';
    if (store && store.store) {
      storeApiKey = store.store.apiKey || '';
      logger.info('API key from store', { 
        hasApiKey: !!storeApiKey,
        apiKeyLength: storeApiKey ? storeApiKey.length : 0,
        matchesSettings: storeApiKey === apiKey
      });
    }
    
    // Also try to get API key from Groq service
    let groqApiKey = '';
    try {
      // Import the getApiKey function from groq.ts
      const { getApiKey } = require('../../dist/main/services/groq');
      if (typeof getApiKey === 'function') {
        groqApiKey = getApiKey();
        logger.info('API key from Groq service', { 
          hasApiKey: !!groqApiKey,
          apiKeyLength: groqApiKey ? groqApiKey.length : 0,
          matchesSettings: groqApiKey === apiKey,
          matchesStore: groqApiKey === storeApiKey
        });
      } else {
        logger.warn('getApiKey function not available from Groq service');
      }
    } catch (importError) {
      logger.exception(importError, 'Failed to import getApiKey from Groq service');
    }
    
    // Use the API key from settings
    if (!apiKey) {
      logger.warn('No API key found in settings, skipping Groq API test');
      return false;
    }
    
    logger.debug('Initializing Groq client for testing');
    const client = new Groq({ apiKey });
    
    // Create a simple test file with text content
    const testDir = path.join(TEMP_DIR, 'test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Check if we have a test audio file
    const testAudioPath = path.join(testDir, 'test-audio.webm');
    let testFileExists = fs.existsSync(testAudioPath);
    
    if (!testFileExists) {
      logger.info('No test audio file found, will use first recording for testing');
    } else {
      logger.info('Test audio file found, using for API test');
      
      try {
        const audioFile = fs.createReadStream(testAudioPath);
        const result = await client.audio.transcriptions.create({
          file: audioFile,
          model: GROQ_MODELS.TRANSCRIPTION.ENGLISH,
          language: 'en',
        });
        
        logger.info('Groq API test successful', { textLength: result.text.length });
        return true;
      } catch (error) {
        logger.exception(error, 'Groq API test failed');
        return false;
      }
    }
    
    return { success: true, message: 'API key accepted' };
  } catch (error) {
    logger.exception(error, 'Failed to test Groq API connection');
    return false;
  }
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  } catch (error) {
    logger.exception(error, 'Failed to create temp directory');
  }
}

// Ensure save directory exists
if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
  try {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  } catch (error) {
    logger.exception(error, 'Failed to create save directory');
  }
}

// Global reference to the main window
let mainWindow = null;
// Global reference to the popup window
let popupWindow = null;

// Track recording state
let isRecording = false;

// Initialize Groq client
let groqClient = null;

const initGroqClient = () => {
  const apiKey = settings.apiKey;
  if (!apiKey) {
    return null;
  }
  
  try {
    return new Groq({ apiKey });
  } catch (error) {
    logger.exception(error, 'Failed to initialize Groq client');
    return null;
  }
};

const createWindow = () => {
  logger.debug('createWindow called');
  
  try {
    logger.info('Creating main browser window');
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local resources
      },
    });
    logger.info('Main window created successfully');

    logger.debug('Loading index.html file');
    // Load the index.html file
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development' || true) {
      logger.debug('Opening DevTools');
      mainWindow.webContents.openDevTools();
    }
    
    // Add event listeners to track window state
    mainWindow.on('close', () => {
      logger.debug('Main window close event triggered');
    });
    
    mainWindow.on('closed', () => {
      logger.debug('Main window closed event triggered');
      mainWindow = null;
    });
    
    mainWindow.on('focus', () => {
      logger.debug('Main window focus event triggered');
    });
    
    mainWindow.on('blur', () => {
      logger.debug('Main window blur event triggered');
    });
    
    logger.info('Main window setup complete');
  } catch (error) {
    logger.exception(error, 'Error creating main window');
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
        popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
      
      logger.info('Successfully set additional properties to hide popup from dock');
    } catch (error) {
      logger.exception(error, 'Error setting additional properties to hide popup from dock');
    }
  }
};

// Create a popup window for dictation
const createPopupWindow = () => {
  logger.debug('createPopupWindow called');
  
  try {
    logger.info('Creating popup window with system-wide overlay settings');
    // Create the popup window as a system-wide overlay
    popupWindow = new BrowserWindow({
      width: 180,  // Smaller width for the pill
      height: 50,  // Smaller height for the pill
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
      visibleOnAllWorkspaces: true,  // Visible on all workspaces
      focusable: false, // Make it non-focusable to prevent it from stealing focus
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
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
    logger.info('Popup window created successfully');
    
    // Set additional properties to hide from dock
    hidePopupFromDock();
    
    logger.debug('Loading popup HTML file');
    // Load the popup HTML file
    popupWindow.loadFile(path.join(__dirname, '../../dist/renderer/popup.html'));
    
    logger.debug('Getting primary display dimensions');
    // Position the popup window in the bottom right corner
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    logger.debug('Primary display dimensions:', width, 'x', height);
    logger.debug('Positioning popup window at:', width - 200, height - 100);
    popupWindow.setPosition(width - 200, height - 100);
    
    logger.debug('Setting popup window to be visible on all workspaces');
    // Make sure it's visible on all workspaces and full screen
    popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    
    // Set the window to be always on top with the highest level
    popupWindow.setAlwaysOnTop(true, 'screen-saver');
    
    // For macOS, set the window level to floating (above everything)
    if (process.platform === 'darwin') {
      popupWindow.setWindowButtonVisibility(false);
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
        logger.exception(error, 'Error setting up mouse event handlers');
      }
    });
    
    // Add event listeners to track window state
    popupWindow.on('close', () => {
      logger.debug('Popup window close event triggered');
    });
    
    popupWindow.on('closed', () => {
      logger.debug('Popup window closed event triggered');
      popupWindow = null;
    });
    
    popupWindow.on('show', () => {
      logger.debug('Popup window show event triggered');
    });
    
    popupWindow.on('hide', () => {
      logger.debug('Popup window hide event triggered');
    });
    
    logger.info('Popup window setup complete');
  } catch (error) {
    logger.exception(error, 'Error creating popup window');
  }
};

// Show the popup window - always show it when the app starts
const showPopupWindow = () => {
  logger.debug('showPopupWindow called');
  logger.debug('popupWindow exists:', !!popupWindow);
  
  if (!popupWindow) {
    logger.debug('No popup window exists, creating one');
    createPopupWindow();
  }
  
  if (popupWindow) {
    logger.debug('popupWindow destroyed:', popupWindow.isDestroyed());
    logger.debug('popupWindow visible:', popupWindow.isVisible());
    
    if (popupWindow.isDestroyed()) {
      logger.debug('Popup window is destroyed, creating a new one');
      createPopupWindow();
    }
    
    if (!popupWindow.isVisible()) {
      logger.debug('Showing popup window');
      try {
        popupWindow.show();
        logger.debug('Popup window shown successfully');
        
        // Ensure it's always on top and visible on all workspaces
        popupWindow.setAlwaysOnTop(true, 'screen-saver');
        popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        
        // For macOS, set the window level to floating (above everything)
        if (process.platform === 'darwin') {
          popupWindow.setWindowButtonVisibility(false);
        }
      } catch (error) {
        logger.exception(error, 'Error showing popup window');
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
  logger.debug('popupWindow exists:', !!popupWindow);
  
  if (popupWindow) {
    logger.debug('popupWindow destroyed:', popupWindow.isDestroyed());
    logger.debug('popupWindow visible:', popupWindow.isVisible());
    
    if (!popupWindow.isDestroyed()) {
      logger.debug('Updating popup window to show not recording state');
      try {
        // Instead of hiding, we'll just update the UI to show not recording
        // The actual UI update is handled by the renderer process based on isRecording state
        // We'll just ensure it stays visible and on top
        popupWindow.setAlwaysOnTop(true, 'screen-saver');
        popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        
        // For macOS, ensure window level is set to floating
        if (process.platform === 'darwin') {
          popupWindow.setWindowButtonVisibility(false);
        }
        
        logger.debug('Popup window updated to not recording state');
      } catch (error) {
        logger.exception(error, 'Error updating popup window');
      }
    } else {
      logger.debug('Popup window is destroyed, cannot update');
    }
  } else {
    logger.debug('No popup window to update');
  }
};

// Set up IPC handlers
const setupIpcHandlers = () => {
  // Test Groq API connection
  ipcMain.handle('test-groq-api', async (_, apiKey) => {
    try {
      logger.info('Testing Groq API connection via IPC');
      
      if (!apiKey) {
        logger.warn('No API key provided for test');
        return { success: false, error: 'No API key provided' };
      }
      
      logger.debug('Initializing Groq client for testing with provided API key');
      const client = new Groq({ apiKey });
      
      // Create a simple test file with text content
      const testDir = path.join(TEMP_DIR, 'test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      // Check if we have a test audio file
      const testAudioPath = path.join(testDir, 'test-audio.webm');
      let testFileExists = fs.existsSync(testAudioPath);
      
      if (!testFileExists) {
        logger.info('No test audio file found, will use first recording for testing');
      } else {
        logger.info('Test audio file found, using for API test');
        
        try {
          const audioFile = fs.createReadStream(testAudioPath);
          const result = await client.audio.transcriptions.create({
            file: audioFile,
            model: GROQ_MODELS.TRANSCRIPTION.ENGLISH,
            language: 'en',
          });
          
          logger.info('Groq API test successful', { textLength: result.text.length });
          return { success: true, text: result.text };
        } catch (error) {
          logger.exception(error, 'Groq API test failed');
          return { success: false, error: error.message };
        }
      }
      
      return { success: true, message: 'API key accepted' };
    } catch (error) {
      logger.exception(error, 'Failed to test Groq API connection');
      return { success: false, error: error.message };
    }
  });

  // Get available audio input devices
  ipcMain.handle('get-audio-sources', async () => {
    try {
      return mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.filter(device => device.kind === 'audioinput')
          .map(device => ({ id: device.deviceId, name: device.label || 'Microphone ' + device.deviceId })))
      `);
    } catch (error) {
      logger.exception(error, 'Failed to get audio sources');
      return [];
    }
  });

  // Insert text at cursor position
  ipcMain.handle('insert-text-at-cursor', async (_, text) => {
    try {
      logger.info('Received request to insert text at cursor position', { textLength: text.length });
      
      // Use only the clipboard method since we removed RobotJS
      const success = await insertTextAtCursor(text, clipboard);
      
      return { success };
    } catch (error) {
      logger.exception(error, 'Failed to insert text at cursor position');
      return { success: false, error: String(error) };
    }
  });
  
  // Open file
  ipcMain.handle('open-file', (_, filePath) => {
    try {
      const { shell } = require('electron');
      shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      logger.exception(error, 'Failed to open file');
      return { success: false, error: String(error) };
    }
  });

  // Get settings
  ipcMain.handle('get-settings', () => {
    return settings;
  });

  // Save settings
  ipcMain.handle('save-settings', (_, newSettings) => {
    try {
      logger.info('Saving settings', { 
        hasApiKey: !!newSettings.apiKey,
        apiKeyLength: newSettings.apiKey ? newSettings.apiKey.length : 0,
        settingsKeys: Object.keys(newSettings)
      });
      
      if (store) {
        // Save to electron-store
        store.set(newSettings);
        logger.info('Settings saved to electron-store');
        
        // Update local settings object
        settings = { ...newSettings };
        
        // If API key is included, also save it via the Groq service
        if (newSettings.apiKey !== undefined) {
          try {
            // Import the saveApiKey function from groq.ts
            const { saveApiKey } = require('../../dist/main/services/groq');
            if (typeof saveApiKey === 'function') {
              const saved = saveApiKey(newSettings.apiKey);
              logger.info('API key saved via Groq service', { success: saved });
            } else {
              logger.warn('saveApiKey function not available from Groq service');
            }
          } catch (importError) {
            logger.exception(importError, 'Failed to import saveApiKey from Groq service');
          }
        }
      } else {
        // Update local settings object
        settings = { ...newSettings };
        
        // Save to a JSON file as fallback
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings), { encoding: 'utf-8' });
        logger.info('Settings saved to file', { filePath: settingsPath });
      }
      
      // Re-register the global hotkey with the new settings
      registerGlobalHotkey();
      
      return { success: true };
    } catch (error) {
      logger.exception(error, 'Failed to save settings');
      return { success: false, error: String(error) };
    }
  });

  // Window management
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options = { forward: true }) => {
    logger.debug('set-ignore-mouse-events IPC handler called with ignore:', ignore, 'options:', options);
    logger.debug('popupWindow exists:', !!popupWindow);
    
    if (popupWindow) {
      logger.debug('popupWindow destroyed:', popupWindow.isDestroyed());
      
      if (!popupWindow.isDestroyed()) {
        logger.debug('Setting ignore mouse events to', ignore, 'with options:', options);
        try {
          // Use the provided options or default to forwarding events when not ignoring
          const forwardOptions = options || { forward: !ignore };
          popupWindow.setIgnoreMouseEvents(ignore, forwardOptions);
          logger.debug('Successfully set ignore mouse events');
          return true;
        } catch (error) {
          logger.exception(error, 'Error setting ignore mouse events');
          return false;
        }
      } else {
        logger.debug('Cannot set ignore mouse events - popup window is destroyed');
        return false;
      }
    }
    logger.debug('Cannot set ignore mouse events - popup window does not exist');
    return false;
  });
};

// Set up the dock menu for macOS
const setupDockMenu = () => {
  if (process.platform === 'darwin') {
    logger.debug('Setting up dock menu for macOS');
    
    const dockMenu = [
      {
        label: 'Show/Hide Dictation Popup',
        click: () => {
          if (popupWindow && !popupWindow.isDestroyed()) {
            if (popupWindow.isVisible()) {
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
        }
      }
    ];
    
    app.dock.setMenu(require('electron').Menu.buildFromTemplate(dockMenu));
    logger.info('Dock menu set up successfully');
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    // Initialize loggers
    initLoggers(LOG_LEVELS.DEBUG);
    logger = getLogger('main');
    logger.info('App starting up');
    
    // Initialize store
    const storeInitialized = await initStore();
    logger.info('Store initialized', { success: storeInitialized });
    
    if (!storeInitialized) {
      logger.warn('Store initialization failed, some features may not work correctly');
    }
    
    // Log store state before setting up services
    logger.info('Store state before service setup', {
      storeExists: !!store,
      storeType: typeof store,
      hasStoreMethod: store && typeof store.store === 'object',
      apiKeyExists: store && store.store && !!store.store.apiKey,
      apiKeyLength: store && store.store && store.store.apiKey ? store.store.apiKey.length : 0
    });
    
    // Set up services with the store instance
    logger.info('Setting up Groq API service');
    setupGroqAPI(ipcMain, store);
    
    logger.info('Setting up File Storage service');
    setupFileStorage(ipcMain);
    
    logger.info('Setting up Audio Recording service');
    setupAudioRecording(ipcMain, mainWindow);
    
    logger.info('Services initialized');
    
    // Test Groq API connection
    logger.info('Testing Groq API connection');
    const apiTestResult = await testGroqAPIConnection();
    logger.info('Groq API test result:', apiTestResult);
    
    // Create main window
    createWindow();
    
    // Create popup window
    createPopupWindow();
    
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Set up dock menu (macOS only)
    setupDockMenu();
    
    // Register global hotkey
    registerGlobalHotkey();
    
    // Check macOS permissions
    checkMacOSPermissions();
    
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    logger.exception(error, 'Error during app initialization');
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  logger.debug('All windows closed event triggered');
  logger.debug('Platform:', process.platform);
  
  if (process.platform !== 'darwin') {
    logger.debug('Not on macOS, quitting app');
    app.quit();
  } else {
    logger.debug('On macOS, app will remain running');
    
    // Always ensure the popup window is visible
    logger.debug('Ensuring popup window is visible');
    if (!popupWindow || (typeof popupWindow.isDestroyed === 'function' && popupWindow.isDestroyed())) {
      logger.debug('Popup window does not exist or is destroyed, recreating it');
      createPopupWindow();
      showPopupWindow();
    } else if (popupWindow && !popupWindow.isVisible()) {
      logger.debug('Popup window exists but is not visible, showing it');
      showPopupWindow();
    } else {
      logger.debug('Popup window is already visible');
      // Ensure it's always on top and visible on all workspaces
      if (popupWindow && !popupWindow.isDestroyed()) {
        popupWindow.setAlwaysOnTop(true, 'screen-saver');
        popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
  if (popupWindow) {
    logger.debug('Popup window exists, checking if destroyed');
    if (!popupWindow.isDestroyed()) {
      logger.debug('Closing popup window');
      try {
        popupWindow.close();
        logger.debug('Popup window closed successfully');
      } catch (error) {
        logger.exception(error, 'Error closing popup window');
      }
    } else {
      logger.debug('Popup window is already destroyed');
    }
    popupWindow = null;
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

// Function to register the global hotkey
const registerGlobalHotkey = () => {
  logger.debug('Registering global hotkey...');
  logger.debug('Current recording state:', isRecording);
  logger.debug('mainWindow exists:', !!mainWindow);
  logger.debug('popupWindow exists:', !!popupWindow);
  
  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();
  logger.debug('Unregistered all existing shortcuts');
  
  // Get the hotkey from settings, default to 'Home' if not set
  const hotkey = settings.hotkey || 'Home';
  logger.debug('Using hotkey:', hotkey);
  
  // Define the hotkey handler function
  const hotkeyHandler = () => {
    logger.debug('Hotkey pressed!');
    logger.debug('mainWindow exists:', !!mainWindow);
    logger.debug('mainWindow destroyed:', mainWindow?.isDestroyed?.());
    logger.debug('popupWindow exists:', !!popupWindow);
    logger.debug('popupWindow destroyed:', popupWindow?.isDestroyed?.());
    logger.debug('Current recording state:', isRecording);
    
    // Safely send event to main window if it exists and is not destroyed
    if (mainWindow && typeof mainWindow.isDestroyed === 'function' && !mainWindow.isDestroyed()) {
      logger.debug('Sending toggle-recording event to mainWindow');
      try {
        mainWindow.webContents.send('toggle-recording');
      } catch (error) {
        logger.exception(error, 'Error sending toggle-recording event');
      }
    } else {
      logger.debug('Cannot send toggle-recording event - mainWindow does not exist or is destroyed');
    }
    
    // Toggle recording state and popup
    logger.debug('Toggling recording state from', isRecording, 'to', !isRecording);
    if (isRecording) {
      logger.debug('Stopping recording');
      isRecording = false;
      
      // Update popup window to show not recording state
      if (popupWindow && typeof popupWindow.isDestroyed === 'function' && !popupWindow.isDestroyed()) {
        logger.debug('Updating popup window to show not recording state');
        try {
          // Instead of hiding, we'll just update the UI to show not recording
          // The actual UI update is handled by the renderer process based on isRecording state
          popupWindow.setAlwaysOnTop(true, 'screen-saver');
          popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          
          // For macOS, ensure window level is set to floating
          if (process.platform === 'darwin') {
            popupWindow.setWindowButtonVisibility(false);
          }
        } catch (error) {
          logger.exception(error, 'Error updating popup window');
        }
      } else {
        logger.debug('Starting recording');
        isRecording = true;
        
        // Create new popup window if it doesn't exist or is destroyed
        if (!popupWindow || (typeof popupWindow.isDestroyed === 'function' && popupWindow.isDestroyed())) {
          logger.debug('Creating new popup window');
          try {
            createPopupWindow();
          } catch (error) {
            logger.exception(error, 'Error creating popup window');
          }
        }
        
        // Show the popup window
        if (popupWindow && typeof popupWindow.isDestroyed === 'function' && !popupWindow.isDestroyed()) {
          logger.debug('Showing popup window');
          try {
            showPopupWindow();
            
            // Ensure the popup window is interactive
            setTimeout(() => {
              if (popupWindow && !popupWindow.isDestroyed()) {
                logger.debug('Setting popup window to be interactive after showing');
                popupWindow.setIgnoreMouseEvents(false, { forward: true });
              }
            }, 100); // Short delay to ensure the window is fully shown
          } catch (error) {
            logger.exception(error, 'Error showing popup window');
          }
        } else {
          logger.debug('Cannot show popup window - it does not exist or is destroyed');
        }
      }
    };
    
    try {
      // Register the global shortcut with the hotkey from settings
      logger.debug('Attempting to register hotkey:', hotkey);
      const registered = globalShortcut.register(hotkey, hotkeyHandler);
      
      if (!registered) {
        logger.error(`Failed to register hotkey: ${hotkey}`);
      } else {
        logger.info(`Successfully registered hotkey: ${hotkey}`);
      }
    } catch (error) {
      logger.exception(error, `Error registering hotkey ${hotkey}`);
      
      // Fallback to Home key if the specified hotkey is invalid
      try {
        logger.debug('Attempting to register fallback hotkey: Home');
        globalShortcut.register('Home', hotkeyHandler);
        logger.debug('Fallback to Home key successful');
      } catch (fallbackError) {
        logger.exception(fallbackError, 'Failed to register fallback hotkey');
      }
    }
  };
  
  try {
    // Register the global shortcut with the hotkey from settings
    logger.debug('Attempting to register hotkey:', hotkey);
    const registered = globalShortcut.register(hotkey, hotkeyHandler);
    
    if (!registered) {
      logger.error(`Failed to register hotkey: ${hotkey}`);
    } else {
      logger.info(`Successfully registered hotkey: ${hotkey}`);
    }
  } catch (error) {
    logger.exception(error, `Error registering hotkey ${hotkey}`);
    
    // Fallback to Home key if the specified hotkey is invalid
    try {
      logger.debug('Attempting to register fallback hotkey: Home');
      globalShortcut.register('Home', hotkeyHandler);
      logger.debug('Fallback to Home key successful');
    } catch (fallbackError) {
      logger.exception(fallbackError, 'Failed to register fallback hotkey');
    }
  }
}; 

