const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

// Ensure log directory exists
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Configure logger
electronLog.transports.file.resolvePath = () => path.join(
  app.getPath('userData'),
  'logs/main.log'
);

const logger = {
  info: (message) => {
    console.log(message);
    electronLog.info(message);
  },
  error: (message, error) => {
    console.error(message, error);
    electronLog.error(message, error);
  },
  warn: (message) => {
    console.warn(message);
    electronLog.warn(message);
  },
  exception: (error) => {
    console.error('Exception:', error);
    electronLog.error('Exception:', error);
  }
};

module.exports = logger; 