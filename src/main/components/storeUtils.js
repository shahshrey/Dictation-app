const fs = require('fs');
const { DEFAULT_SETTINGS, TEMP_DIR, DEFAULT_SAVE_DIR } = require('./constants');
const logger = require('../../shared/logger').default;

// Initialize store for settings
let store = null;

// Settings object
let settings = { ...DEFAULT_SETTINGS };

// Initialize store
const initStore = async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: DEFAULT_SETTINGS,
    });
    
    // Update the settings object with values from the store
    Object.assign(settings, store.store);
    
    // Update the global settings object if it exists
    if (global.settings) {
      Object.assign(global.settings, store.store);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize store:', { error: error.message });
    return false;
  }
};

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
  store,
  settings,
  initStore,
  ensureDirectories
}; 