const { ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const path = require('path');
const { AUDIO_FILE_PATH, TEMP_DIR, DEFAULT_SAVE_DIR, GROQ_MODELS } = require('./constants');
const { initGroqClient, transcribeRecording } = require('./groqClient');

// Set up IPC handlers
const setupIpcHandlers = (mainWindow, popupWindow, settings, store, windowManager) => {
  const { showPopupWindow, hidePopupWindow } = windowManager;
  
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
          return {
            success: false,
            error: 'File was saved but is empty',
            filePath: AUDIO_FILE_PATH,
          };
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
      const groqClient = initGroqClient(settings.apiKey);

      if (!groqClient) {
        return { success: false, error: 'Groq API key not set' };
      }

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Audio file not found' };
      }

      const audioFile = fs.createReadStream(filePath);

      // Choose the appropriate model based on options or settings
      let model =
        options?.model || settings.transcriptionModel || GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL;

      // Force English model if language is English
      if (options?.language === 'en') {
        model = GROQ_MODELS.TRANSCRIPTION.ENGLISH;
      }

      // Default to English if no language is specified or if 'auto' is specified
      const language =
        options?.language === 'auto' || !options?.language ? 'en' : options?.language;

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
        model: model,
      };
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return { success: false, error: String(error) };
    }
  });

  // Translate audio file to English
  ipcMain.handle('translate-audio', async (_, filePath) => {
    try {
      const groqClient = initGroqClient(settings.apiKey);

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
        model: GROQ_MODELS.TRANSLATION,
      });

      return {
        success: true,
        text: translation.text,
        model: GROQ_MODELS.TRANSLATION,
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
          { name: 'All Files', extensions: ['*'] },
        ],
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

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter(file => file.endsWith('.txt'))
        .map(file => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
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
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        console.log('Main process: Save directory does not exist');
        return [];
      }

      // Force a directory read to get the latest files
      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.txt'))
        .map(dirent => {
          const filePath = path.join(DEFAULT_SAVE_DIR, dirent.name);

          try {
            // Get file stats
            const stats = fs.statSync(filePath);

            // Read file content
            let content = '';
            try {
              content = fs.readFileSync(filePath, { encoding: 'utf-8' });
            } catch (readError) {
              console.error(`Failed to read file ${filePath}:`, readError);
              content = ''; // Default to empty string if read fails
            }

            // Extract timestamp from filename or use file creation time
            let timestamp = stats.birthtime.getTime();
            const timestampMatch = dirent.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
            if (timestampMatch) {
              const dateStr = timestampMatch[1].replace(/-/g, (m, i) => (i > 9 ? ':' : '-'));
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
              language: 'en', // Default language
            };
          } catch (error) {
            console.error(`Failed to process file ${dirent.name}:`, error);
            return null;
          }
        })
        .filter(Boolean) // Remove any null entries from errors
        .sort((a, b) => b.timestamp - a.timestamp);
      return files;
    } catch (error) {
      console.error('Failed to get transcriptions:', error);
      return [];
    }
  });

  // Transcribe the most recent recording using Groq API
  // This handler takes the language and API key from the renderer
  // and returns a transcription object with the transcribed text
  ipcMain.handle('transcribe-recording', async (_, language, apiKey) => {
    // Use the transcribeRecording function from groqClient.js
    return await transcribeRecording(language, apiKey);
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
        Object.assign(settings, newSettings);
      } else {
        Object.assign(settings, newSettings);
        // Save to a JSON file as fallback
        const settingsPath = path.join(require('electron').app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings), { encoding: 'utf-8' });
      }

      // Re-register the global hotkey with the new settings
      registerGlobalHotkey(mainWindow, settings);

      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error: String(error) };
    }
  });

  // Add handlers for recording state
  ipcMain.handle('start-recording', async () => {
    try {
      global.isRecording = true;
      if (showPopupWindow) {
        showPopupWindow();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('stop-recording', async () => {
    try {
      global.isRecording = false;
      if (hidePopupWindow) {
        hidePopupWindow();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: String(error) };
    }
  });

  // Window management
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options = { forward: true }) => {
    if (global.popupWindow) {
      if (!global.popupWindow.isDestroyed()) {
        try {
          // Use the provided options or default to forwarding events when not ignoring
          const forwardOptions = options || { forward: !ignore };
          global.popupWindow.setIgnoreMouseEvents(ignore, forwardOptions);
          return true;
        } catch (error) {
          console.error('Error setting ignore mouse events:', error);
          return false;
        }
      } else {
        console.log('Cannot set ignore mouse events - popup window is destroyed');
        return false;
      }
    }
    console.log('Cannot set ignore mouse events - popup window does not exist');
    return false;
  });
};

// Function to register the global hotkey
const registerGlobalHotkey = (_, settings) => {
  console.log('Registering global hotkey...');
  console.log('Current recording state:', global.isRecording);
  console.log('mainWindow exists:', !!global.mainWindow);

  // Unregister any existing shortcuts first
  globalShortcut.unregisterAll();
  console.log('Unregistered all existing shortcuts');

  // Get the hotkey from settings, default to 'Home' if not set
  const hotkey = settings.hotkey || 'Home';
  console.log('Using hotkey:', hotkey);

  // Define the hotkey handler function
  const hotkeyHandler = () => {
    console.log('Hotkey pressed!');
    console.log('mainWindow exists:', !!global.mainWindow);
    console.log('popupWindow exists:', !!global.popupWindow);
    
    // Ensure windows exist
    if (!global.mainWindow || global.mainWindow.isDestroyed()) {
      console.log('Main window does not exist or is destroyed, recreating it');
      // Import the createWindow function dynamically to avoid circular dependencies
      const { createWindow } = require('./windowManager');
      createWindow();
    }
    
    if (!global.popupWindow || global.popupWindow.isDestroyed()) {
      console.log('Popup window does not exist or is destroyed, recreating it');
      // Import the createPopupWindow function dynamically to avoid circular dependencies
      const { createPopupWindow } = require('./windowManager');
      createPopupWindow();
    }
    
    console.log('Current recording state:', global.isRecording);

    // Now safely send event to main window
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      console.log('Sending toggle-recording event to mainWindow');
      try {
        global.mainWindow.webContents.send('toggle-recording');
      } catch (error) {
        console.error('Error sending toggle-recording event:', error);
      }
    }

    // Toggle recording state and update popup
    console.log('Toggling recording state from', global.isRecording, 'to', !global.isRecording);
    global.isRecording = !global.isRecording;
    
    if (global.isRecording) {
      console.log('Starting recording');
      // Show recording UI
      if (global.popupWindow && !global.popupWindow.isDestroyed()) {
        try {
          // Update UI to show recording state
          global.popupWindow.webContents.send('update-recording-state', true);
        } catch (error) {
          console.error('Error updating popup window for recording:', error);
        }
      }
    } else {
      console.log('Stopping recording');
      // Update popup window to show not recording state
      if (global.popupWindow && !global.popupWindow.isDestroyed()) {
        console.log('Updating popup window to show not recording state');
        try {
          // Update UI to show not recording state
          global.popupWindow.webContents.send('update-recording-state', false);
          
          global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
          if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
            global.popupWindow.setVisibleOnAllWorkspaces(true, {
              visibleOnFullScreen: true,
              skipTransformProcessType: true,
            });
          }

          // For macOS, ensure window level is set to floating
          if (process.platform === 'darwin') {
            if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
              global.popupWindow.setWindowButtonVisibility(false);
            }
          }
        } catch (error) {
          console.error('Error updating popup window:', error);
        }
      }
    }
  };

  try {
    // Register the global shortcut with the hotkey from settings
    console.log('Attempting to register hotkey:', hotkey);
    const registered = globalShortcut.register(hotkey, hotkeyHandler);

    if (!registered) {
      console.error(`Failed to register hotkey: ${hotkey}`);
    } else {
      console.log(`Successfully registered hotkey: ${hotkey}`);
    }
  } catch (error) {
    console.error(`Error registering hotkey ${hotkey}:`, error);

    // Fallback to Home key if the specified hotkey is invalid
    try {
      console.log('Attempting to register fallback hotkey: Home');
      globalShortcut.register('Home', hotkeyHandler);
      console.log('Fallback to Home key successful');
    } catch (fallbackError) {
      console.error('Failed to register fallback hotkey:', fallbackError);
    }
  }
};

module.exports = {
  setupIpcHandlers,
  registerGlobalHotkey
}; 