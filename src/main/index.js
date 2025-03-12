// Remove the warning message
// console.log('WARNING: Using index.js instead of index.ts');
const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Groq } = require('groq-sdk');

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
    console.error('Failed to initialize store:', error);
    return false;
  }
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  try {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create temp directory:', error);
  }
}

// Ensure save directory exists
if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
  try {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create save directory:', error);
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
    console.error('Failed to initialize Groq client:', error);
    return null;
  }
};

const createWindow = () => {
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

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development' || true) {
    mainWindow.webContents.openDevTools();
  }
};

// Create a popup window for dictation
const createPopupWindow = () => {
  // Create the popup window
  popupWindow = new BrowserWindow({
    width: 250,
    height: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local resources
    },
  });

  // Load the popup HTML file
  popupWindow.loadFile(path.join(__dirname, '../renderer/popup.html'));

  // Center the popup window on the screen
  popupWindow.center();

  // Hide the popup window when it loses focus
  popupWindow.on('blur', () => {
    if (popupWindow && popupWindow.isVisible()) {
      popupWindow.hide();
    }
  });
};

// Show the popup window
const showPopupWindow = () => {
  if (!popupWindow) {
    createPopupWindow();
  }
  
  if (popupWindow && !popupWindow.isVisible()) {
    popupWindow.show();
  }
};

// Hide the popup window
const hidePopupWindow = () => {
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.hide();
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
      console.error('Failed to get audio sources:', error);
      return [];
    }
  });

  // Save the recorded audio blob sent from the renderer
  ipcMain.handle('save-recording', async (_, arrayBuffer) => {
    try {
      console.log('Saving recording, buffer size:', arrayBuffer.byteLength);
      
      // Validate that we have actual data
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('Error: Empty audio buffer received');
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
        console.log(`Recording saved successfully: ${AUDIO_FILE_PATH}, size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          console.error('Error: File was saved but is empty');
          return { success: false, error: 'File was saved but is empty', filePath: AUDIO_FILE_PATH };
        }
        
        return { success: true, filePath: AUDIO_FILE_PATH, size: stats.size };
      } else {
        console.error('Error: File was not saved');
        return { success: false, error: 'File was not saved' };
      }
    } catch (error) {
      console.error('Failed to save recording:', error);
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
      
      console.log(`Using Groq model: ${model} for transcription with language: ${language}`);
      
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
      console.error('Failed to transcribe audio:', error);
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
      
      console.log(`Using Groq model: ${GROQ_MODELS.TRANSLATION} for translation`);
      
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
      console.error('Failed to translate audio:', error);
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
      console.error('Failed to save transcription:', error);
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
      console.error('Failed to save transcription:', error);
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
      console.error('Failed to get recent transcriptions:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get transcriptions (alias for get-recent-transcriptions)
  // This handler returns transcriptions in a format compatible with the renderer's expectations
  ipcMain.handle('get-transcriptions', async () => {
    console.log('Main process: get-transcriptions handler called');
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        return [];
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter((file) => file.endsWith(".txt"))
        .map((file) => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, { encoding: "utf-8" });
          
          // Extract timestamp from filename or use file creation time
          let timestamp = stats.birthtime.getTime();
          const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (timestampMatch) {
            const dateStr = timestampMatch[1].replace(/-/g, (m, i) => i > 9 ? ':' : '-');
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              timestamp = date.getTime();
            }
          }
          
          return {
            id: path.basename(file, '.txt'),
            text: content,
            timestamp,
            duration: 0, // Duration not available from saved files
            language: 'en' // Default language
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Get only the 10 most recent files

      console.log(`Main process: Found ${files.length} transcriptions`);
      return files;
    } catch (error) {
      console.error("Failed to get transcriptions:", error);
      return [];
    }
  });

  // Transcribe the most recent recording using Groq API
  // This handler takes the language and API key from the renderer
  // and returns a transcription object with the transcribed text
  ipcMain.handle('transcribe-recording', async (_, language, apiKey) => {
    console.log('Main process: transcribe-recording handler called with language:', language);
    console.log('Main process: API key available:', !!apiKey);
    
    try {
      // Initialize Groq client with the provided API key
      if (!apiKey) {
        console.error('Error: No API key provided');
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
        console.error('Error: Recording file not found at', AUDIO_FILE_PATH);
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
      console.log(`Audio file size: ${fileStats.size} bytes`);
      
      if (fileStats.size === 0) {
        console.error('Error: Audio file is empty');
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
      
      console.log(`Using Groq model: ${model} for transcription with language: ${language || 'auto'}`);
      
      // Transcribe the audio
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: model,
        language: language || 'auto',
      });
      
      console.log('Transcription successful, text length:', transcription.text.length);
      
      // Generate a unique ID for the transcription
      const id = `transcription-${Date.now()}`;
      const timestamp = Date.now();
      const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);
      
      // Save the transcription to a file
      try {
        const filename = 'transcription';
        const format = 'txt';
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestampStr}.${format}`;
        const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);
        
        fs.writeFileSync(filePath, transcription.text, { encoding: 'utf-8' });
        console.log(`Transcription saved to: ${filePath}`);
      } catch (saveError) {
        console.error('Failed to save transcription to file:', saveError);
        // Continue even if saving fails
      }
      
      return { 
        success: true,
        id,
        text: transcription.text,
        timestamp,
        duration,
        language: language || 'auto'
      };
    } catch (error) {
      console.error('Failed to transcribe recording:', error);
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
      console.error('Failed to open file:', error);
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
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
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
      console.error('Failed to start recording:', error);
      return { success: false, error: String(error) };
    }
  });
  
  ipcMain.handle('stop-recording', async () => {
    try {
      isRecording = false;
      hidePopupWindow();
      return { success: true };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: String(error) };
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  await initStore();
  createWindow();
  setupIpcHandlers();
  
  // Setup global shortcut (Home key) for starting/stopping recording
  globalShortcut.register('Home', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-recording');
      
      // Toggle recording state and popup
      if (isRecording) {
        isRecording = false;
        hidePopupWindow();
      } else {
        isRecording = true;
        showPopupWindow();
      }
    }
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  
  // Close the popup window if it exists
  if (popupWindow) {
    popupWindow.close();
    popupWindow = null;
  }
}); 