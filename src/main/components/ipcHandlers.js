const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { GROQ_MODELS, DEFAULT_SETTINGS } = require('./constants');
const { initGroqClient, transcribeRecording } = require('./groqClient');
const { recheckAccessibilityPermission } = require('./permissionsUtils');
const { setIgnoreMouseEvents, registerGlobalHotkey, minimizeMainWindow } = require('./windowManager');
const { 
  saveTranscription, 
  saveTranscriptionAs, 
  getRecentTranscriptions, 
  getTranscriptions,
  getTranscription,
  deleteTranscription,
  openFile
} = require('./storageManager');
const { STORAGE_CHANNELS } = require('../../shared/storage');
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

  // NOTE: save-recording, get-recording-path, start-recording, and stop-recording
  // handlers are now provided by the RecordingManager class
  
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

  // Storage operations using the storage manager
  ipcMain.handle(STORAGE_CHANNELS.SAVE_TRANSCRIPTION, async (_, transcription, options) => {
    return await saveTranscription(transcription, options);
  });

  ipcMain.handle(STORAGE_CHANNELS.SAVE_TRANSCRIPTION_AS, async (_, transcription) => {
    return await saveTranscriptionAs(transcription);
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_RECENT_TRANSCRIPTIONS, async () => {
    return await getRecentTranscriptions();
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_TRANSCRIPTIONS, async () => {
    return await getTranscriptions();
  });

  ipcMain.handle(STORAGE_CHANNELS.GET_TRANSCRIPTION, async (_, id) => {
    return await getTranscription(id);
  });

  ipcMain.handle(STORAGE_CHANNELS.DELETE_TRANSCRIPTION, async (_, id) => {
    return await deleteTranscription(id);
  });

  ipcMain.handle(STORAGE_CHANNELS.OPEN_FILE, (_, filePath) => {
    return openFile(filePath);
  });

  // Show directory picker dialog
  ipcMain.handle('showDirectoryPicker', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Directory for Saving Transcriptions',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      
      return result.filePaths[0];
    } catch (error) {
      logger.error('Error showing directory picker:', { error: error.message });
      return null;
    }
  });

  // Test API key validity by making a simple request to the Groq API
  ipcMain.handle('testApiKey', async (_, apiKey) => {
    try {
      if (!apiKey || !apiKey.trim()) {
        return false;
      }

      // Import the Groq SDK directly for validation
      const Groq = require('groq-sdk');
      
      // Create a temporary Groq client with the provided API key
      const groqClient = new Groq({ apiKey });
      
      // Make a simple request to validate the API key
      const modelsResponse = await groqClient.models.list();
      
      // If we get a response, the API key is valid
      return Array.isArray(modelsResponse.data);
    } catch (error) {
      logger.error('API key validation failed:', { error: error.message });
      return false;
    }
  });

  // Transcribe the most recent recording using Groq API
  // This handler takes the language and API key from the renderer
  // and returns a transcription object with the transcribed text
  ipcMain.handle('transcribe-recording', async (_, language, apiKey) => {
    // Use the transcribeRecording function from groqClient.js
    return await transcribeRecording(language, apiKey);
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

  // Window management
  ipcMain.handle('set-ignore-mouse-events', (event, ignore, options = { forward: true }) => {
    return setIgnoreMouseEvents(ignore, options);
  });

  // Add handler for minimizing the main window
  ipcMain.handle('minimize-main-window', () => {
    return minimizeMainWindow();
  });
  
  // Add handler for controlling the tray
  ipcMain.handle('tray-status', () => {
    return { 
      trayExists: !!global.tray,
      updateTrayExists: typeof global.updateTrayMenu === 'function'
    };
  });
  
  // Force tray menu update
  ipcMain.handle('update-tray-menu', () => {
    if (global.updateTrayMenu && typeof global.updateTrayMenu === 'function') {
      try {
        global.updateTrayMenu();
        return { success: true };
      } catch (error) {
        logger.error('Error updating tray menu:', { error: error.message });
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Update tray menu function not available' };
  });

  // Add handler for pasting text at cursor position
  ipcMain.handle('paste-text-at-cursor', async (_, text) => {
    try {
      const { pasteTextAtCursor } = require('./clipboardUtils');
      const result = await pasteTextAtCursor(text);
      return { success: result };
    } catch (error) {
      logger.error('Error pasting text at cursor:', { error: error.message });
      return { success: false, error: String(error) };
    }
  });
};

module.exports = {
  setupIpcHandlers
}; 