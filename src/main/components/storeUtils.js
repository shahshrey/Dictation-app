const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { DEFAULT_SETTINGS } = require('./constants');
const { ensureStorageDirectories } = require('./storageManager');
const logger = require('../../shared/logger').default;

// Initialize store for settings
let store = null;

// Settings object
let settings = { ...DEFAULT_SETTINGS };

// Load settings from fallback file if needed
const loadSettingsFromFile = async () => {
  try {
    // Import electron dynamically to avoid circular dependencies
    const { app } = require('electron');
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    
    // Check if file exists
    try {
      await fs.access(settingsPath);
    } catch (error) {
      logger.debug('Settings file does not exist:', { path: settingsPath });
      return false;
    }
    
    logger.debug('Loading settings from fallback file:', { path: settingsPath });
    const fileData = await fs.readFile(settingsPath, { encoding: 'utf-8' });
    const fileSettings = JSON.parse(fileData);
    Object.assign(settings, fileSettings);
    logger.debug('Settings loaded from fallback file');
    return true;
  } catch (error) {
    logger.error('Failed to load settings from fallback file:', { error: error.message });
  }
  return false;
};

// Synchronous version for critical startup path
const loadSettingsFromFileSync = () => {
  try {
    // Import electron dynamically to avoid circular dependencies
    const { app } = require('electron');
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fsSync.existsSync(settingsPath)) {
      logger.debug('Loading settings from fallback file (sync):', { path: settingsPath });
      const fileSettings = JSON.parse(fsSync.readFileSync(settingsPath, { encoding: 'utf-8' }));
      Object.assign(settings, fileSettings);
      logger.debug('Settings loaded from fallback file (sync)');
      return true;
    }
  } catch (error) {
    logger.error('Failed to load settings from fallback file (sync):', { error: error.message });
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
      // Add caching to improve performance
      cwd: undefined, // Use default
      watch: false, // Disable watching for changes to improve performance
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
    return loadSettingsFromFileSync(); // Use sync version for critical path
  }
};

// Get the store instance (only available after initialization)
const getStore = () => store;

// Ensure directories exist using the storage manager
// Make this async to improve startup time
async function ensureDirectories() {
  return ensureStorageDirectories();
}

module.exports = {
  getStore,
  settings,
  initStore,
  ensureDirectories,
  loadSettingsFromFile,
  loadSettingsFromFileSync
}; 