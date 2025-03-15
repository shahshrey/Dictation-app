const fs = require('fs');
const { DEFAULT_SETTINGS, TEMP_DIR, DEFAULT_SAVE_DIR } = require('./constants');

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
    console.error('Failed to initialize store:', error);
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
}

module.exports = {
  store,
  settings,
  initStore,
  ensureDirectories
}; 