const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Groq } = require('groq-sdk');

// Define constants
const TEMP_DIR = path.join(os.tmpdir(), 'dictation-app');
const AUDIO_FILE_PATH = path.join(TEMP_DIR, 'recording.webm');
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Dictation App');

// Initialize store for settings
let store = null;

// Default settings
const DEFAULT_SETTINGS = {
  defaultLanguage: 'auto',
  apiKey: '',
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
    },
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
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
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(AUDIO_FILE_PATH, buffer, { encoding: 'binary' });
      return { success: true, filePath: AUDIO_FILE_PATH };
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
      
      const transcription = await groqClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options?.language,
      });
      
      return { 
        success: true, 
        text: transcription.text,
        language: options?.language || 'auto'
      };
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return { success: false, error: String(error) };
    }
  });
  
  // Translate audio file
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
      
      const translation = await groqClient.audio.translations.create({
        file: audioFile,
        model: 'whisper-1',
      });
      
      return { 
        success: true, 
        text: translation.text 
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
}); 