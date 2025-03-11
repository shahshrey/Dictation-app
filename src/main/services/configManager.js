const Store = require('electron-store');
const CONSTANTS = require('../constants');
const logger = require('../logger');

// Define the schema for the configuration store
const schema = {
  modelSize: {
    type: 'string',
    enum: ['tiny', 'base', 'small', 'medium', 'large'],
    default: CONSTANTS.DEFAULT_SETTINGS.modelSize
  },
  shortcutKey: {
    type: 'string',
    default: CONSTANTS.DEFAULT_SETTINGS.shortcutKey
  },
  startAtLogin: {
    type: 'boolean',
    default: CONSTANTS.DEFAULT_SETTINGS.startAtLogin
  },
  showNotifications: {
    type: 'boolean',
    default: CONSTANTS.DEFAULT_SETTINGS.showNotifications
  }
};

// Create the store instance
const store = new Store({
  name: 'config',
  schema
});

/**
 * Configuration manager for the application
 */
const configManager = {
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @returns {any} Configuration value
   */
  get: (key) => {
    try {
      return store.get(key);
    } catch (error) {
      logger.exception(error);
      return CONSTANTS.DEFAULT_SETTINGS[key];
    }
  },

  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  set: (key, value) => {
    try {
      store.set(key, value);
    } catch (error) {
      logger.exception(error);
    }
  },

  /**
   * Get all configuration values
   * @returns {Object} All configuration values
   */
  getAll: () => {
    try {
      return store.store;
    } catch (error) {
      logger.exception(error);
      return CONSTANTS.DEFAULT_SETTINGS;
    }
  },

  /**
   * Set multiple configuration values
   * @param {Object} config - Configuration object
   */
  setAll: (config) => {
    try {
      Object.entries(config).forEach(([key, value]) => {
        store.set(key, value);
      });
    } catch (error) {
      logger.exception(error);
    }
  },

  /**
   * Reset configuration to defaults
   */
  reset: () => {
    try {
      store.clear();
      configManager.setAll(CONSTANTS.DEFAULT_SETTINGS);
    } catch (error) {
      logger.exception(error);
    }
  }
};

module.exports = configManager; 