const { app } = require('electron');
const path = require('path');

const CONSTANTS = {
  APP_NAME: "Whisper Dictation",
  APP_VERSION: "0.1.0",
  TRAY_ICON_PATH: path.join(__dirname, '../renderer/assets/icons/tray.png'),
  DEFAULT_SETTINGS: {
    modelSize: "base",
    shortcutKey: "home",
    startAtLogin: true,
    showNotifications: true
  },
  PYTHON_PATH: process.platform === 'win32' ? 'python' : 'python3',
  TEMP_AUDIO_DIR: path.join(app.getPath('temp'), 'whisper-dictation')
};

module.exports = CONSTANTS; 