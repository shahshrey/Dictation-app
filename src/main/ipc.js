const { ipcMain } = require('electron');
const configManager = require('./services/configManager');
const { validatePythonEnvironment } = require('./services/pythonValidator');
const logger = require('./logger');

/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIpcHandlers() {
  try {
    // Get settings
    ipcMain.handle('settings:get', async () => {
      try {
        return configManager.getAll();
      } catch (error) {
        logger.exception(error);
        throw new Error('Failed to get settings');
      }
    });

    // Set settings
    ipcMain.handle('settings:set', async (event, settings) => {
      try {
        if (settings.reset) {
          configManager.reset();
          return { success: true };
        }
        
        configManager.setAll(settings);
        return { success: true };
      } catch (error) {
        logger.exception(error);
        throw new Error('Failed to save settings');
      }
    });

    // Validate Python environment
    ipcMain.handle('python:validate', async () => {
      try {
        return await validatePythonEnvironment();
      } catch (error) {
        logger.exception(error);
        throw new Error('Failed to validate Python environment');
      }
    });

    logger.info('IPC handlers set up');
  } catch (error) {
    logger.exception(error);
  }
}

module.exports = { setupIpcHandlers }; 