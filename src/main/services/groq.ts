import { IpcMain, app } from 'electron';
import { Groq } from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from '../../shared/logger';

// Get the logger instance
const logger = getLogger('main');

// Initialize Groq client
let groqClient: Groq | null = null;

// Reference to the electron-store instance (will be set in setupGroqAPI)
let store: any = null;

/**
 * Initialize the Groq client with the API key from settings
 * @param apiKey The Groq API key
 * @returns Groq client instance
 */
const initGroqClient = (apiKey: string): Groq => {
  try {
    if (!apiKey) {
      logger.error('Groq API key not provided to initGroqClient');
      throw new Error('Groq API key not provided');
    }
    
    logger.debug('Initializing Groq client', { 
      keyLength: apiKey.length,
      existingClient: !!groqClient
    });
    
    // Create a new client if it doesn't exist or if the API key has changed
    if (!groqClient || (groqClient as any)._options.apiKey !== apiKey) {
      groqClient = new Groq({ apiKey });
      logger.info('Groq client initialized with new API key', {
        keyLength: apiKey.length
      });
    } else {
      logger.debug('Using existing Groq client (API key unchanged)');
    }
    
    return groqClient;
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Failed to initialize Groq client');
    } else {
      logger.error('Failed to initialize Groq client', { error: String(error) });
    }
    throw new Error('Failed to initialize Groq client');
  }
};

/**
 * Save the API key to the settings store
 * @param apiKey The Groq API key to save
 * @returns Boolean indicating success
 */
export const saveApiKey = (apiKey: string): boolean => {
  try {
    if (!apiKey) {
      logger.warn('Attempted to save empty API key');
      return false;
    }
    
    // If store is available, save to electron-store
    if (store) {
      logger.debug('Saving API key to electron-store', {
        storeType: typeof store,
        hasSetMethod: typeof store.set === 'function'
      });
      
      try {
        // Get current settings
        const currentSettings = store.store || {};
        logger.debug('Current settings from store', {
          hasSettings: !!currentSettings,
          settingsKeys: Object.keys(currentSettings)
        });
        
        // Update settings with new API key
        const updatedSettings = { ...currentSettings, apiKey };
        
        // Save entire settings object
        if (typeof store.set === 'function') {
          // Method 1: Set the entire object
          store.set(updatedSettings);
          logger.debug('Saved settings using store.set(object)');
        } else {
          // Method 3: Direct assignment (fallback)
          store.store = updatedSettings;
          logger.debug('Saved settings using direct assignment');
        }
        
        logger.info('API key saved to settings store', { 
          storeType: 'electron-store',
          keyLength: apiKey.length
        });
        return true;
      } catch (storeError) {
        logger.exception(storeError instanceof Error ? storeError : new Error(String(storeError)), 
          'Error saving to electron-store');
        
        // Fall back to file-based storage
        logger.info('Falling back to file-based storage');
      }
    }
    
    // Fallback to saving in userData directory
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    let settings = {};
    
    // Try to read existing settings
    try {
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, { encoding: 'utf-8' });
        settings = JSON.parse(data);
      }
    } catch (readError) {
      logger.exception(readError instanceof Error ? readError : new Error(String(readError)), 
        'Failed to read settings file');
    }
    
    // Update settings with new API key
    settings = { ...settings, apiKey };
    
    // Write updated settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings), { encoding: 'utf-8' });
    logger.info('API key saved to settings file', { 
      filePath: settingsPath,
      keyLength: apiKey.length
    });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Failed to save API key');
    } else {
      logger.error('Failed to save API key', { error: String(error) });
    }
    return false;
  }
};

/**
 * Get the API key from settings
 * @returns The stored API key or empty string
 */
export const getApiKey = (): string => {
  try {
    // If store is available, get from electron-store
    if (store) {
      logger.debug('Getting API key from electron-store', {
        storeType: typeof store,
        hasStore: !!store.store,
        hasGet: typeof store.get === 'function'
      });
      
      let apiKey = '';
      
      // Try different methods to get the API key
      if (typeof store.get === 'function') {
        // Method 1: Use get method
        try {
          apiKey = store.get('apiKey', '');
          logger.debug('Retrieved API key using store.get(key, defaultValue)');
        } catch (getError) {
          logger.exception(getError instanceof Error ? getError : new Error(String(getError)), 
            'Error using store.get method');
        }
      }
      
      // If the first method failed, try accessing the store property
      if (!apiKey && store.store) {
        // Method 2: Access store property
        const settings = store.store || {};
        apiKey = settings.apiKey || '';
        logger.debug('Retrieved API key from store.store property');
      }
      
      // Log the retrieval attempt (without the actual key)
      logger.debug('Retrieved API key from settings store', { 
        storeType: 'electron-store',
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        retrievalMethod: apiKey ? (typeof store.get === 'function' ? 'get method' : 'store property') : 'none'
      });
      
      return apiKey;
    } else {
      // Fallback to reading from userData directory
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, { encoding: 'utf-8' });
        const settings = JSON.parse(data);
        
        // Log the retrieval attempt (without the actual key)
        logger.debug('Retrieved API key from settings file', { 
          filePath: settingsPath,
          hasKey: !!settings.apiKey,
          keyLength: settings.apiKey ? settings.apiKey.length : 0
        });
        
        return settings.apiKey || '';
      }
    }
    
    logger.debug('No API key found in settings');
    return '';
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Failed to get API key from settings');
    } else {
      logger.error('Failed to get API key from settings', { error: String(error) });
    }
    return '';
  }
};

/**
 * Setup Groq API handlers for IPC communication
 * @param ipcMain Electron IPC main instance
 * @param storeInstance Optional electron-store instance
 */
export const setupGroqAPI = (ipcMain: IpcMain, storeInstance?: any): void => {
  logger.info('Setting up Groq API handlers');
  
  // Store the electron-store instance if provided
  if (storeInstance) {
    store = storeInstance;
    
    // Log store details
    logger.debug('Electron store instance provided to Groq service', { 
      storeType: typeof storeInstance,
      hasStore: !!storeInstance.store,
      hasGet: typeof storeInstance.get === 'function',
      hasSet: typeof storeInstance.set === 'function'
    });
    
    // Log store contents
    try {
      const storeKeys = Object.keys(storeInstance.store || {});
      logger.debug('Store contents', {
        storeKeys,
        hasApiKey: storeKeys.includes('apiKey')
      });
    } catch (error) {
      logger.exception(error instanceof Error ? error : new Error(String(error)), 
        'Error accessing store contents');
    }
    
    // Try to get the API key from the store
    const apiKey = getApiKey();
    logger.debug('Initial API key check', { 
      hasApiKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0
    });
    
    // If we have an API key, initialize the Groq client
    if (apiKey) {
      try {
        initGroqClient(apiKey);
        logger.info('Groq client initialized with API key from store');
      } catch (error) {
        logger.exception(error instanceof Error ? error : new Error(String(error)), 
          'Failed to initialize Groq client with API key from store');
      }
    }
  } else {
    logger.warn('No store instance provided to Groq service, using fallback storage');
  }
  
  // Check if ipcMain is valid
  logger.debug('ipcMain validation', {
    objectType: typeof ipcMain,
    handleMethodAvailable: typeof ipcMain.handle === 'function'
  });
  
  // Add handler for saving API key
  logger.debug('Registering save-groq-api-key handler');
  ipcMain.handle('save-groq-api-key', async (_, apiKey: string) => {
    logger.debug('save-groq-api-key handler called', { 
      apiKeyProvided: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0
    });
    
    try {
      // Validate API key
      if (!apiKey) {
        logger.warn('Empty API key provided to save-groq-api-key handler');
        return { success: false, error: 'API key cannot be empty' };
      }
      
      // Save the API key
      const success = saveApiKey(apiKey);
      
      if (success) {
        // Initialize client with new API key
        try {
          initGroqClient(apiKey);
          logger.info('Groq client initialized with new API key');
        } catch (clientError) {
          logger.exception(clientError instanceof Error ? clientError : new Error(String(clientError)), 
            'Failed to initialize Groq client with new API key');
          // Continue anyway since the key was saved successfully
        }
        
        // Verify the key was saved
        const savedKey = getApiKey();
        const keyMatches = savedKey === apiKey;
        
        logger.debug('API key save verification', {
          saved: success,
          keyMatches,
          savedKeyLength: savedKey ? savedKey.length : 0
        });
        
        return { 
          success: true,
          verified: keyMatches
        };
      } else {
        logger.error('Failed to save API key');
        return { success: false, error: 'Failed to save API key' };
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to save Groq API key');
      } else {
        logger.error('Failed to save Groq API key', { error: String(error) });
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  // Add handler for getting API key
  logger.debug('Registering get-groq-api-key handler');
  ipcMain.handle('get-groq-api-key', async () => {
    logger.debug('get-groq-api-key handler called');
    
    try {
      const apiKey = getApiKey();
      
      // Log retrieval details (without the actual key)
      logger.debug('API key retrieval result', {
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        storeAvailable: !!store
      });
      
      return { 
        success: true, 
        apiKey,
        hasKey: !!apiKey
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to get Groq API key');
      } else {
        logger.error('Failed to get Groq API key', { error: String(error) });
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  // Transcribe audio file
  logger.debug('Registering transcribe-audio handler');
  ipcMain.handle('transcribe-audio', async (_, filePath: string, options: { language?: string, apiKey?: string }) => {
    logger.debug('transcribe-audio handler called', { 
      filePath, 
      language: options.language,
      apiKeyProvided: !!options.apiKey,
      apiKeyLength: options.apiKey ? options.apiKey.length : 0
    });
    
    try {
      // Use provided API key or get from settings
      const apiKey = options.apiKey || getApiKey();
      
      if (!apiKey) {
        logger.warn('No API key provided or found in settings');
        return { success: false, error: 'No API key provided or found in settings' };
      }
      
      // If a new API key was provided, save it
      if (options.apiKey && options.apiKey !== getApiKey()) {
        logger.info('New API key provided, saving to settings');
        const saveResult = saveApiKey(options.apiKey);
        logger.debug('API key save result', { success: saveResult });
      }
      
      // Initialize Groq client
      logger.debug('Initializing Groq client for transcription');
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        logger.warn('Audio file not found', { filePath });
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      logger.info('Transcribing audio file', { 
        filePath, 
        language: options.language,
        apiKeyLength: apiKey ? apiKey.length : 0
      });
      
      const transcription = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language,
      });
      
      logger.info('Audio transcription successful', { 
        textLength: transcription.text.length,
        language: options.language || 'auto'
      });
      
      return { 
        success: true, 
        text: transcription.text,
        language: options.language || 'auto'
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to transcribe audio');
      } else {
        logger.error('Failed to transcribe audio', { error: String(error) });
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Translate audio file
  logger.debug('Registering translate-audio handler');
  ipcMain.handle('translate-audio', async (_, filePath: string, options: { apiKey?: string }) => {
    logger.debug('translate-audio handler called', { 
      filePath,
      apiKeyProvided: !!options.apiKey,
      apiKeyLength: options.apiKey ? options.apiKey.length : 0
    });
    
    try {
      // Use provided API key or get from settings
      const apiKey = options.apiKey || getApiKey();
      
      if (!apiKey) {
        logger.warn('No API key provided or found in settings');
        return { success: false, error: 'No API key provided or found in settings' };
      }
      
      // If a new API key was provided, save it
      if (options.apiKey && options.apiKey !== getApiKey()) {
        logger.info('New API key provided, saving to settings');
        const saveResult = saveApiKey(options.apiKey);
        logger.debug('API key save result', { success: saveResult });
      }
      
      // Initialize Groq client
      logger.debug('Initializing Groq client for translation');
      const client = initGroqClient(apiKey);
      
      if (!fs.existsSync(filePath)) {
        logger.warn('Audio file not found', { filePath });
        return { success: false, error: 'Audio file not found' };
      }
      
      const audioFile = fs.createReadStream(filePath);
      
      logger.info('Translating audio file', { filePath });
      
      const translation = await client.audio.translations.create({
        file: audioFile,
        model: 'whisper-1',
      });
      
      logger.info('Audio translation successful', { textLength: translation.text.length });
      
      return { 
        success: true, 
        text: translation.text 
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, 'Failed to translate audio');
      } else {
        logger.error('Failed to translate audio', { error: String(error) });
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
  
  // Transcribe the most recent recording
  logger.debug('Registering transcribe-recording handler');
  try {
    ipcMain.handle('transcribe-recording', async (_, language: string, apiKey: string) => {
      logger.debug('transcribe-recording handler called', { 
        language,
        apiKeyProvided: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      });
      
      try {
        // Use provided API key or get from settings
        const finalApiKey = apiKey || getApiKey();
        
        if (!finalApiKey) {
          logger.warn('No API key provided or found in settings');
          return { 
            success: false, 
            error: 'No API key provided or found in settings',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        // If a new API key was provided, save it
        if (apiKey && apiKey !== getApiKey()) {
          logger.info('New API key provided, saving to settings');
          const saveResult = saveApiKey(apiKey);
          logger.debug('API key save result', { success: saveResult });
        }
        
        // Initialize Groq client
        logger.debug('Initializing Groq client for transcription');
        const client = initGroqClient(finalApiKey);
        
        // Get the path to the most recent recording
        const recordingsDir = path.join(app.getPath('userData'), 'recordings');
        
        // Ensure the recordings directory exists
        if (!fs.existsSync(recordingsDir)) {
          fs.mkdirSync(recordingsDir, { recursive: true });
          logger.warn('No recordings found, created recordings directory', { recordingsDir });
          return { 
            success: false, 
            error: 'No recordings found. The recordings directory has been created.',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        // Find the most recent recording file
        const files = fs.readdirSync(recordingsDir)
          .filter(file => file.endsWith('.webm') || file.endsWith('.wav'))
          .map(file => ({
            name: file,
            path: path.join(recordingsDir, file),
            mtime: fs.statSync(path.join(recordingsDir, file)).mtime
          }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        
        if (files.length === 0) {
          logger.warn('No recordings found in directory', { recordingsDir });
          return { 
            success: false, 
            error: 'No recordings found',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        const mostRecentFile = files[0].path;
        logger.debug('Found most recent recording file', { 
          filePath: mostRecentFile,
          fileName: files[0].name
        });
        
        if (!fs.existsSync(mostRecentFile)) {
          logger.warn('Recording file not found', { filePath: mostRecentFile });
          return { 
            success: false, 
            error: 'Recording file not found',
            id: '',
            text: '',
            timestamp: 0,
            duration: 0
          };
        }
        
        const audioFile = fs.createReadStream(mostRecentFile);
        const fileStats = fs.statSync(mostRecentFile);
        
        logger.info('Transcribing recording', { 
          filePath: mostRecentFile,
          fileSize: fileStats.size,
          language: language || 'auto'
        });
        
        const transcription = await client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language,
        });
        
        // Generate a unique ID for the transcription
        const id = `transcription-${Date.now()}`;
        const timestamp = Date.now();
        const duration = Math.floor((fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000);
        
        logger.info('Recording transcription successful', { 
          id,
          textLength: transcription.text.length,
          duration
        });
        
        return { 
          success: true,
          id,
          text: transcription.text,
          timestamp,
          duration,
          language
        };
      } catch (error) {
        if (error instanceof Error) {
          logger.exception(error, 'Failed to transcribe recording');
        } else {
          logger.error('Failed to transcribe recording', { error: String(error) });
        }
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
    logger.info('transcribe-recording handler registered successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Error registering transcribe-recording handler');
    } else {
      logger.error('Error registering transcribe-recording handler', { error: String(error) });
    }
  }
  
  // Log all registered IPC handlers for debugging
  const registeredChannels = (ipcMain as any)._events ? Object.keys((ipcMain as any)._events) : [];
  logger.debug('Groq API handlers registered', { registeredChannels });
}; 