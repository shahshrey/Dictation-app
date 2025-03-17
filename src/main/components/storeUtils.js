const fs = require('fs');
const path = require('path');
const { DEFAULT_SETTINGS, TEMP_DIR, DEFAULT_SAVE_DIR } = require('./constants');
const logger = require('../../shared/logger').default;

// Initialize store for settings
let store = null;

// Settings object
let settings = { ...DEFAULT_SETTINGS };

// Load settings from fallback file if needed
const loadSettingsFromFile = () => {
  try {
    // Import electron dynamically to avoid circular dependencies
    const { app } = require('electron');
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      logger.debug('Loading settings from fallback file:', settingsPath);
      const fileSettings = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf-8' }));
      Object.assign(settings, fileSettings);
      logger.debug('Settings loaded from fallback file');
      return true;
    }
  } catch (error) {
    logger.error('Failed to load settings from fallback file:', { error: error.message });
  }
  return false;
};

// Initialize store
const initStore = async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: DEFAULT_SETTINGS,
      name: 'settings', // Explicitly set the name to ensure consistency
    });
    
    // Update the settings object with values from the store
    Object.assign(settings, store.store);
    logger.debug('Settings loaded from electron-store');
    
    // Update the global settings object if it exists
    if (global.settings) {
      Object.assign(global.settings, store.store);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize store:', { error: error.message });
    // Try to load settings from fallback file if store initialization fails
    loadSettingsFromFile();
    return false;
  }
};

// Get the store instance (only available after initialization)
const getStore = () => store;

// Ensure directories exist
function ensureDirectories() {
  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    try {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', { error: error.message });
    }
  }

  // Ensure save directory exists
  if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
    try {
      fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create save directory:', { error: error.message });
    }
  }
}

module.exports = {
  getStore,
  settings,
  initStore,
  ensureDirectories,
  loadSettingsFromFile
}; 