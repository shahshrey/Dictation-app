const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { AUDIO_FILE_PATH, TEMP_DIR, DEFAULT_SAVE_DIR, GROQ_MODELS, DEFAULT_SETTINGS } = require('./constants');
const { initGroqClient, transcribeRecording } = require('./groqClient');
const { recheckAccessibilityPermission } = require('./permissionsUtils');
const { showPopupWindow, hidePopupWindow, setIgnoreMouseEvents, registerGlobalHotkey } = require('./windowManager');
const logger = require('../../shared/logger').default;

// Set up IPC handlers
const setupIpcHandlers = (mainWindow, popupWindow, settings, store) => {
  // Handle permission issues
  ipcMain.on('permission-issue', (_, permissionType) => {
    logger.debug('Permission issue reported:', { permissionType });
    
    if (permissionType === 'accessibility') {
      // Recheck accessibility permissions
      recheckAccessibilityPermission();
    } else if (permissionType === 'microphone') {
      // Show dialog for microphone permission
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Microphone Permission Required',
          message: 'This app needs microphone permission to record audio.',
          detail: 'Please allow microphone access in your system settings.',
          buttons: ['Open System Preferences', 'Later'],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            // Open System Preferences to the Microphone pane
            const command =
              'open x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone';
            require('child_process').exec(command);
          }
        })
        .catch(error => {
          logger.error('Error showing microphone permission dialog:', { error: error.message });
        });
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
      logger.error('Failed to get audio sources:', { error: error.message });
      return [];
    }
  });

  // Save the recorded audio blob sent from the renderer
  ipcMain.handle('save-recording', async (_, arrayBuffer) => {
    try {
      logger.debug('Saving recording, buffer size:', { size: arrayBuffer.byteLength });

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
        logger.debug(`Recording saved successfully: ${AUDIO_FILE_PATH}, size: ${stats.size} bytes`);

        if (stats.size === 0) {
          logger.error('Error: File was saved but is empty');
          return {
            success: false,
            error: 'File was saved but is empty',
            filePath: AUDIO_FILE_PATH,
          };
        }

        return { success: true, filePath: AUDIO_FILE_PATH, size: stats.size };
      } else {
        logger.error('Error: File was not saved');
        return { success: false, error: 'File was not saved' };
      }
    } catch (error) {
      logger.error('Failed to save recording:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Get the path to the recording file
  ipcMain.handle('get-recording-path', () => {
    return AUDIO_FILE_PATH;
  });

  // Transcribe audio using Groq API
  ipcMain.handle('transcribe-audio', async (_, filePath, options) => {
    try {
      const groqClient = initGroqClient(settings.apiKey);

      if (!groqClient) {
        return { success: false, error: 'Groq API key not set' };
      }

      logger.debug(`Using Groq model: ${options?.model || settings.transcriptionModel || GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL} for transcription with language: ${options?.language || 'en'}`);
      
      if (!fs.existsSync(filePath)) {
        logger.error('Audio file not found:', { filePath });
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
      logger.error('Failed to transcribe audio:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Translate audio using Groq API
  ipcMain.handle('translate-audio', async (_, filePath) => {
    try {
      const groqClient = initGroqClient(settings.apiKey);

      if (!groqClient) {
        return { success: false, error: 'Groq API key not set' };
      }

      if (!fs.existsSync(filePath)) {
        logger.error('Audio file not found:', { filePath });
        return { success: false, error: 'Audio file not found' };
      }

      const audioFile = fs.createReadStream(filePath);

      logger.debug(`Using Groq model: ${GROQ_MODELS.TRANSLATION} for translation`);

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
      logger.error('Failed to translate audio:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Save transcription to a file
  ipcMain.handle('save-transcription', async (_, transcription, options) => {
    try {
      const filename = options?.filename || 'transcription';
      const format = 'json';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `${filename}_${timestamp}.${format}`;
      const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

      fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to save transcription:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Save transcription with file dialog
  ipcMain.handle('save-transcription-as', async (_, transcription) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = path.join(DEFAULT_SAVE_DIR, `transcription_${timestamp}.json`);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Transcription',
        defaultPath,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to save transcription:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Get recent transcriptions
  ipcMain.handle('get-recent-transcriptions', async () => {
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        return { success: true, transcriptions: [] };
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter(file => file.endsWith('.json') && file !== 'transcriptions.json')
        .map(file => {
          try {
            const filePath = path.join(DEFAULT_SAVE_DIR, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
            return {
              transcription: JSON.parse(content),
              stats: {
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
              }
            };
          } catch (error) {
            logger.error(`Error processing file ${file}:`, { error: error.message });
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.stats.modifiedAt.getTime() - a.stats.modifiedAt.getTime())
        .slice(0, 10);

      return { 
        success: true, 
        transcriptions: files.map(f => f.transcription)
      };
    } catch (error) {
      logger.error('Failed to get recent transcriptions:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Get transcriptions (alias for get-recent-transcriptions)
  // This handler returns transcriptions in a format compatible with the renderer's expectations
  ipcMain.handle('get-transcriptions', async () => {
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        logger.debug('Main process: Save directory does not exist');
        return [];
      }

      // Force a directory read to get the latest files
      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'transcriptions.json')
        .map(dirent => {
          const filePath = path.join(DEFAULT_SAVE_DIR, dirent.name);

          try {
            // Get file stats (for debugging purposes only)
            // const stats = fs.statSync(filePath);

            // Read file content
            let transcription = null;
            try {
              const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
              transcription = JSON.parse(content);
            } catch (readError) {
              logger.error(`Failed to read or parse file ${filePath}:`, { error: readError.message });
              return null; // Skip this file if we can't read or parse it
            }

            // Return the parsed transcription
            return transcription;
          } catch (error) {
            logger.error(`Failed to process file ${dirent.name}:`, { error: error.message });
            return null;
          }
        })
        .filter(Boolean) // Remove any null entries from errors
        .sort((a, b) => b.timestamp - a.timestamp);
      return files;
    } catch (error) {
      logger.error('Failed to get transcriptions:', { error: error.message });
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
      logger.error('Failed to open file:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Get settings
  ipcMain.handle('get-settings', () => {
    try {
      // Try to load settings from fallback file if store is not available
      if (!store) {
        logger.debug('Store not available, trying to load settings from fallback file');
        try {
          const settingsPath = path.join(require('electron').app.getPath('userData'), 'settings.json');
          if (fs.existsSync(settingsPath)) {
            const fileSettings = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf-8' }));
            logger.debug('Loaded settings from fallback file');
            // Update the in-memory settings
            Object.assign(settings, fileSettings);
          } else {
            logger.debug('No fallback settings file found, using default settings');
          }
        } catch (fileError) {
          logger.error('Error loading settings from fallback file:', { error: fileError.message });
        }
      }
      
      // Log the settings being returned to the renderer
      logger.debug('[DEBUG] Current settings from getSettings:', JSON.stringify({
        ...settings,
        apiKey: settings.apiKey ? '[API KEY PRESENT]' : 'null'
      }));
      logger.debug('[DEBUG] Current settings API key available:', !!settings.apiKey);
      logger.debug('[DEBUG] Current settings API key length:', settings.apiKey ? settings.apiKey.length : 0);
      
      return settings;
    } catch (error) {
      logger.error('Error in get-settings handler:', { error: error.message });
      return { ...DEFAULT_SETTINGS };
    }
  });

  // Save settings
  ipcMain.handle('save-settings', (_, newSettings) => {
    try {
      if (store) {
        logger.debug('Saving settings using electron-store');
        try {
          store.set(newSettings);
          logger.debug('Settings saved successfully to electron-store');
        } catch (storeError) {
          logger.error('Error saving to electron-store, falling back to file:', { error: storeError.message });
          // Fall back to file storage if store.set fails
          Object.assign(settings, newSettings);
          const settingsPath = path.join(require('electron').app.getPath('userData'), 'settings.json');
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { encoding: 'utf-8' });
          logger.debug('Settings saved to fallback file:', settingsPath);
        }
      } else {
        logger.debug('Store not available, saving settings to file');
        Object.assign(settings, newSettings);
        // Save to a JSON file as fallback
        const settingsPath = path.join(require('electron').app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { encoding: 'utf-8' });
        logger.debug('Settings saved to file:', settingsPath);
      }

      // Always update the in-memory settings
      Object.assign(settings, newSettings);
      
      // Re-register the global hotkey with the new settings
      registerGlobalHotkey(mainWindow, settings);

      return { success: true };
    } catch (error) {
      logger.error('Failed to save settings:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Add handlers for recording state
  ipcMain.handle('start-recording', async () => {
    try {
      global.isRecording = true;
      showPopupWindow();
      return { success: true };
    } catch (error) {
      logger.error('Failed to start recording:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('stop-recording', async () => {
    try {
      global.isRecording = false;
      hidePopupWindow();
      return { success: true };
    } catch (error) {
      logger.error('Failed to stop recording:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });

  // Window management
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options = { forward: true }) => {
    return setIgnoreMouseEvents(ignore, options);
  });
};

module.exports = {
  setupIpcHandlers
}; 