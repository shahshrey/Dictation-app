// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const { app, BrowserWindow, ipcMain, globalShortcut, dialog, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Groq } = require('groq-sdk');
// Import the logger
const { getLogger, initLoggers, LOG_LEVELS } = require('../../dist/shared/logger');

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
  saveTranscriptionsAutomatically: false
};

// Settings object
let settings = { ...DEFAULT_SETTINGS };

// Initialize store
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: DEFAULT_SETTINGS
    });
    settings = store.store;
    return true;
  } catch (error) {
    logger.exception(error, 'Failed to initialize store');
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

  // Save the recorded audio blob sent from the renderer
  ipcMain.handle('save-recording', async (_, arrayBuffer) => {
    try {
      logger.debug('Saving recording, buffer size:', arrayBuffer.byteLength);
      
      // Validate that we have actual data
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        logger.error('Error: Empty audio buffer received');
        return { success: false, error: 'Empty audio buffer received' };
      }
      
      const buffer = Buffer.from(arrayBuffer);
      
      // Ensure the temp directory exists
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }
      
      // Write the file
      fs.writeFileSync(AUDIO_FILE_PATH, buffer, { encoding: 'binary' });
      
      // Verify the file was written correctly
      if (fs.existsSync(AUDIO_FILE_PATH)) {
        const stats = fs.statSync(AUDIO_FILE_PATH);
        logger.info(`Recording saved successfully: ${AUDIO_FILE_PATH}, size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          logger.error('Error: File was saved but is empty');
          return { success: false, error: 'File was saved but is empty', filePath: AUDIO_FILE_PATH };
        }
        
        return { success: true, filePath: AUDIO_FILE_PATH, size: stats.size };
      } else {
        logger.error('Error: File was not saved');
        return { success: false, error: 'File was not saved' };
      }
    } catch (error) {
      logger.exception(error, 'Failed to save recording');
      return { success: false, error: String(error) };
    }
  });

  // Get the path to the saved recording
  ipcMain.handle('get-recording-path', () => {
    return AUDIO_FILE_PATH;
  });

  // Transcribe audio file
  ipcMain.handle('transcribe-audio', async (_, filePath, options) => {
    try {
      groqClient = initGroqClient();
      
      if (!groqClient) {
        return { success: false, error: 'Groq API key not set' };
      }
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      // Choose the appropriate model based on options or settings
      let model = options?.model || settings.transcriptionModel || GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL;
      
      // Force English model if language is English
      if (options?.language === 'en') {
        model = GROQ_MODELS.TRANSCRIPTION.ENGLISH;
      }
      
      // Default to English if no language is specified or if 'auto' is specified
      const language = (options?.language === 'auto' || !options?.language) ? 'en' : options?.language;
      
      logger.info(`Using Groq model: ${model} for transcription with language: ${language}`);
      
      const transcription = await groqClient.audio.transcriptions.create({
        file: audioFile,
        model: model,
        language: language,
      });
      
      return { 
        success: true, 
        text: transcription.text,
        language: language,
        model: model
      };
    } catch (error) {
      logger.exception(error, 'Failed to transcribe audio');
      return { success: false, error: String(error) };
    }
  });
  
  // Translate audio file to English
  ipcMain.handle('translate-audio', async (_, filePath) => {
    try {
      groqClient = initGroqClient();
      
      if (!groqClient) {
        return { success: false, error: 'Groq API key not set' };
      }
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      logger.info(`Using Groq model: ${GROQ_MODELS.TRANSLATION} for translation`);
      
      const translation = await groqClient.audio.translations.create({
        file: audioFile,
        model: GROQ_MODELS.TRANSLATION
      });
      
      return { 
        success: true, 
        text: translation.text,
        model: GROQ_MODELS.TRANSLATION
      };
    } catch (error) {
      logger.exception(error, 'Failed to translate audio');
      return { success: false, error: String(error) };
    }
  });

  // Save transcription to a file
  ipcMain.handle('save-transcription', async (_, text, options) => {
    try {
      const filename = options?.filename || 'transcription';
      const format = options?.format || 'txt';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `${filename}_${timestamp}.${format}`;
      const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);
      
      fs.writeFileSync(filePath, text, { encoding: 'utf-8' });
      
      return { success: true, filePath };
    } catch (error) {
      logger.exception(error, 'Failed to save transcription');
      return { success: false, error: String(error) };
    }
  });
  
  // Save transcription with file dialog
  ipcMain.handle('save-transcription-as', async (_, text) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = path.join(DEFAULT_SAVE_DIR, `transcription_${timestamp}.txt`);
      
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Transcription',
        defaultPath,
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }
      
      fs.writeFileSync(filePath, text, { encoding: 'utf-8' });
      
      return { success: true, filePath };
    } catch (error) {
      logger.exception(error, 'Failed to save transcription');
      return { success: false, error: String(error) };
    }
  });
  
  // Get recent transcriptions
  ipcMain.handle('get-recent-transcriptions', async () => {
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        return { success: true, files: [] };
      }
      
      const files = fs.readdirSync(DEFAULT_SAVE_DIR)
        .filter(file => file.endsWith('.txt'))
        .map(file => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        .slice(0, 10); // Get only the 10 most recent files
      
      return { success: true, files };
    } catch (error) {
      logger.exception(error, 'Failed to get recent transcriptions');
      return { success: false, error: String(error) };
    }
  });

  // Get transcriptions (alias for get-recent-transcriptions)
  // This handler returns transcriptions in a format compatible with the renderer's expectations
  ipcMain.handle('get-transcriptions', async () => {
    logger.debug('Main process: get-transcriptions handler called');
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        logger.debug('Main process: Save directory does not exist');
        return [];
      }

      // Force a directory read to get the latest files
      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR, { withFileTypes: true })
        .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".txt"))
        .map((dirent) => {
          const filePath = path.join(DEFAULT_SAVE_DIR, dirent.name);
          
          try {
            // Get file stats
            const stats = fs.statSync(filePath);
            
            // Read file content
            let content = '';
            try {
              content = fs.readFileSync(filePath, { encoding: "utf-8" });
            } catch (readError) {
              logger.exception(readError, `Failed to read file ${filePath}`);
              content = ''; // Default to empty string if read fails
            }
            
            // Extract timestamp from filename or use file creation time
            let timestamp = stats.birthtime.getTime();
            const timestampMatch = dirent.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
            if (timestampMatch) {
              const dateStr = timestampMatch[1].replace(/-/g, (m, i) => i > 9 ? ':' : '-');
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                timestamp = date.getTime();
              }
            }
            
            return {
              id: path.basename(dirent.name, '.txt'),
              text: content,
              timestamp,
              duration: 0, // Duration not available from saved files
              language: 'en' // Default language
            };
          } catch (error) {
            logger.exception(error, `Failed to process file ${dirent.name}`);
            return null;
          }
        })
        .filter(Boolean) // Remove any null entries from errors
        .sort((a, b) => b.timestamp - a.timestamp);

      logger.debug(`Main process: Found ${files.length} transcriptions`);
      return files;
    } catch (error) {
      logger.exception(error, "Failed to get transcriptions");
      return [];
    }
  });

  // Transcribe the most recent recording using Groq API
  // This handler takes the language and API key from the renderer
  // and returns a transcription object with the transcribed text
  ipcMain.handle('transcribe-recording', async (_, language, apiKey) => {
    logger.debug('Main process: transcribe-recording handler called with language:', language);
    logger.debug('Main process: API key available:', !!apiKey);
    
    try {
      // Initialize Groq client with the provided API key
      if (!apiKey) {
        logger.error('Error: No API key provided');
        return { 
          success: false, 
          error: 'No API key provided',
          id: '',
          text: '',
          timestamp: 0,
          duration: 0
        };
      }
      
      const client = new Groq({ apiKey });
      
      // Get the path to the most recent recording
      if (!fs.existsSync(AUDIO_FILE_PATH)) {
        logger.error('Error: Recording file not found at', AUDIO_FILE_PATH);
        return { 
          success: false, 
          error: 'Recording file not found',
          id: '',
          text: '',
          timestamp: 0,
          duration: 0
        };
      }
      
      // Validate the file size
      const fileStats = fs.statSync(AUDIO_FILE_PATH);
      logger.debug(`Audio file size: ${fileStats.size} bytes`);
      
      if (fileStats.size === 0) {
        logger.error('Error: Audio file is empty');
        return { 
          success: false, 
          error: 'Audio file is empty',
          id: '',
          text: '',
          timestamp: 0,
          duration: 0
        };
      }
      
      // Create a read stream for the audio file
      const audioFile = fs.createReadStream(AUDIO_FILE_PATH);
      
      // Choose the appropriate model based on language
      let model = language === 'en' ? GROQ_MODELS.TRANSCRIPTION.ENGLISH : GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL;
      
      logger.info(`Using Groq model: ${model} for transcription with language: ${language || 'auto'}`);
      
      // Transcribe the audio
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: model,
        language: language || 'auto',
      });
      
      logger.debug('Transcription successful, text length:', transcription.text.length);
      
      // Generate a unique ID for the transcription
      const id = `transcription-${Date.now()}`;
      const timestamp = Date.now();
      const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);
      
      // Save the transcription to a file
      let filePath = '';
      try {
        const filename = 'transcription';
        const format = 'txt';
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestampStr}.${format}`;
        filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);
        
        // Write the file synchronously to ensure it's fully written before returning
        fs.writeFileSync(filePath, transcription.text, { encoding: 'utf-8' });
        logger.info(`Transcription saved to: ${filePath}`);
        
        // Verify the file was written correctly
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
          if (fileContent !== transcription.text) {
            logger.error('Error: File content does not match transcription text');
          } else {
            logger.debug('File content verified successfully');
          }
        } else {
          logger.error('Error: File was not created');
        }
      } catch (saveError) {
        logger.exception(saveError, 'Failed to save transcription to file');
        // Continue even if saving fails
      }
      
      // Add a small delay to ensure file system operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { 
        success: true,
        id,
        text: transcription.text,
        timestamp,
        duration,
        language: language || 'auto',
        filePath // Include the file path for debugging
      };
    } catch (error) {
      logger.exception(error, 'Failed to transcribe recording');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        id: '',
        text: '',
        timestamp: 0,
        duration: 0
      };
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
      if (store) {
        store.set(newSettings);
        settings = { ...newSettings };
      } else {
        settings = { ...newSettings };
        // Save to a JSON file as fallback
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings), { encoding: 'utf-8' });
      }
      
      // Re-register the global hotkey with the new settings
      registerGlobalHotkey();
      
      return { success: true };
    } catch (error) {
      logger.exception(error, 'Failed to save settings');
      return { success: false, error: String(error) };
    }
  });

  // Add handlers for recording state
  ipcMain.handle('start-recording', async (_, sourceId) => {
    try {
      isRecording = true;
      showPopupWindow();
      return { success: true };
    } catch (error) {
      logger.exception(error, 'Failed to start recording');
      return { success: false, error: String(error) };
    }
  });
  
  ipcMain.handle('stop-recording', async () => {
    try {
      isRecording = false;
      hidePopupWindow();
      return { success: true };
    } catch (error) {
      logger.exception(error, 'Failed to stop recording');
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
app.whenReady().then(async () => {
  // Initialize the logger first
  initLoggers();
  logger = getLogger('main');
  logger.info('Application starting', { version: app.getVersion(), platform: process.platform });
  
  // Check for macOS permissions needed for system-wide overlay
  logger.info('Checking macOS permissions for system-wide overlay');
  checkMacOSPermissions();
  
  // Ensure the app stays in the dock on macOS, but the popup doesn't
  if (process.platform === 'darwin') {
    logger.debug('On macOS, setting app to stay in dock');
    app.dock.show();
    
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
              if (!popupWindow || popupWindow.isDestroyed()) {
                createPopupWindow();
              }
              showPopupWindow();
            }
          },
          {
            label: 'Hide Dictation Popup',
            click: () => {
              if (popupWindow && !popupWindow.isDestroyed()) {
                hidePopupWindow();
              }
            }
          }
        ]);
        
        app.dock.setMenu(dockMenu);
      }
    } catch (error) {
      logger.exception(error, 'Error setting dock menu');
    }
  }
  
  logger.info('Initializing store');
  await initStore();
  
  logger.info('Creating main window');
  createWindow();
  
  logger.info('Setting up IPC handlers');
  setupIpcHandlers();
  
  logger.info('Creating and showing the floating popup window');
  // Create and show the floating popup window
  createPopupWindow();
  showPopupWindow();
  
  // Ensure the popup window doesn't appear in the app switcher
  if (popupWindow && process.platform === 'darwin') {
    try {
      // This is a macOS specific trick to hide from the app switcher
      popupWindow.setWindowButtonVisibility(false);
      popupWindow.setSkipTaskbar(true);
      
      // Call the function to hide popup from dock
      hidePopupFromDock();
      
      // For macOS Sequoia (15.1), we need an additional step to hide from dock
      if (process.platform === 'darwin') {
        // Get the macOS version
        const osVersion = require('os').release();
        logger.debug('macOS version:', osVersion);
        
        // If it's macOS Sequoia or newer
        if (osVersion.startsWith('24.')) { // macOS Sequoia is Darwin 24.x
          logger.debug('Using macOS Sequoia specific settings to hide popup from dock');
          
          // Set the window to be a utility window
          if (typeof popupWindow.setWindowButtonVisibility === 'function') {
            popupWindow.setWindowButtonVisibility(false);
          }
          
          // Set the window to be an accessory window
          if (typeof popupWindow.setAccessoryView === 'function') {
            popupWindow.setAccessoryView(true);
          }
        }
      }
    } catch (error) {
      logger.exception(error, 'Error configuring popup window visibility');
    }
  }
  
  logger.info('Registering global hotkey');
  // Register the global shortcut with the current hotkey from settings
  registerGlobalHotkey();
  
  app.on('activate', () => {
    logger.info('App activate event triggered');
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    logger.debug('Number of open windows:', BrowserWindow.getAllWindows().length);
    
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.debug('No windows open, creating main window');
      createWindow();
      logger.debug('Showing popup window');
      showPopupWindow();
    } else {
      logger.debug('Windows already open, not creating new ones');
    }
  });
  
  logger.info('App initialization complete');
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