const { BrowserWindow, app, globalShortcut } = require('electron');
const path = require('path');
const os = require('os');
const logger = require('../../shared/logger').default;

// Debug log the environment
logger.debug('Current NODE_ENV:', process.env.NODE_ENV);
logger.debug('Is packaged:', app.isPackaged);

// Add file logging for packaged environment
if (app.isPackaged) {
  const logPath = path.join(os.homedir(), 'Library/Logs/VoiceVibe/app.log');
  logger.debug('Setting up file logging at:', logPath);
  require('fs').mkdirSync(path.dirname(logPath), { recursive: true });
  
  const fs = require('fs');
  const util = require('util');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  
  const originalLogger = { ...logger };
  
  ['error', 'warn', 'info', 'debug'].forEach(level => {
    logger[level] = (message, meta = {}) => {
      originalLogger[level](message, meta);
      const timestamp = new Date().toISOString();
      const logMessage = `${timestamp} [${level.toUpperCase()}] ${message} ${util.inspect(meta)}\n`;
      logStream.write(logMessage);
    };
  });
}

// Global reference to the main window
let mainWindow = null;
// Global reference to the popup window
let popupWindow = null;

// Track recording state
let isRecording = false;

const createWindow = () => {
  logger.debug('createWindow called');

  try {
    const mainWindowInstance = new BrowserWindow({
      width: 800,
      height: 600,
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'logo.png')
        : path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: app.isPackaged 
          ? path.join(process.resourcesPath, 'app.asar', 'dist', 'preload', 'preload.js')
          : path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
        backgroundThrottling: false,
        audioCapture: true
      },
      show: false,
      backgroundColor: '#FFFFFF',
      focusable: true,
      skipTaskbar: false,
      movable: true,
      hasShadow: false,
      titleBarStyle: 'default',
      enableLargerThanScreen: false,
      minimizable: true,
      maximizable: false,
      closable: true,
      autoHideMenuBar: true,
      paintWhenInitiallyHidden: true
    });
    
    global.mainWindow = mainWindowInstance;
    
    if (process.platform === 'darwin' && app.isPackaged) {
      app.dock.show();
    }

    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      mainWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'index.html'));
    } else {
      mainWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
    }

    mainWindowInstance.once('ready-to-show', () => {
      logger.debug('Main window ready to show, but keeping it hidden by default');
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindowInstance.webContents.openDevTools();
    }

    mainWindowInstance.on('close', (event) => {
      // If the app is not actually quitting, prevent the window from being closed
      if (!global.isQuitting) {
        event.preventDefault();
        mainWindowInstance.hide();
        return false;
      }
      
      // Otherwise proceed with normal close behavior
      global.mainWindow = null;
      global.mainWindowMinimized = false;
      
      if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
        try {
          global.popupWindow.close();
        } catch (error) {
          logger.error('Error closing popup window during main window close:', { error: error.message });
        }
      }
    });

    mainWindowInstance.on('closed', () => {
      global.mainWindow = null;
    });

    mainWindowInstance.on('focus', () => {
      logger.debug('Main window focus event triggered');
    });

    mainWindowInstance.on('blur', () => {
      logger.debug('Main window blur event triggered');
    });

    mainWindowInstance.on('minimize', () => {
      global.mainWindowMinimized = true;
    });

    mainWindowInstance.on('restore', () => {
      global.mainWindowMinimized = false;
    });

    global.mainWindowShowRequested = true;

    if (process.platform === 'darwin') {
      app.on('activate', () => {
        global.mainWindowShowRequested = true;
        
        if (global.mainWindowMinimized) {
          if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
            try {
              mainWindowInstance.setSize(800, 600);
              mainWindowInstance.restore();
              mainWindowInstance.focus();
              global.mainWindowMinimized = false;
            } catch (error) {
              logger.error('Error restoring main window from dock click:', { error: error.message });
            }
          }
        } else if (!mainWindowInstance.isVisible()) {
          mainWindowInstance.setSize(800, 600);
          mainWindowInstance.show();
          mainWindowInstance.focus();
        }
        
        setTimeout(() => {
          global.mainWindowShowRequested = false;
        }, 1000);
      });
    }

    return mainWindowInstance;
  } catch (error) {
    logger.error('Error creating main window:', { error: error.message });
    return null;
  }
};

const hidePopupFromDock = () => {
  if (global.popupWindow && process.platform === 'darwin') {
    try {
      global.popupWindow.setSkipTaskbar(true);

      if (typeof global.popupWindow.setHiddenInMissionControl === 'function') {
        global.popupWindow.setHiddenInMissionControl(true);
      }

      if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
        global.popupWindow.setWindowButtonVisibility(false);
      }

      if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
        global.popupWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true,
        });
      }

      const osVersion = os.release();
      
      if (osVersion.startsWith('24.')) {
        if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
          global.popupWindow.setWindowButtonVisibility(false);
        }

        if (typeof global.popupWindow.setAccessoryView === 'function') {
          global.popupWindow.setAccessoryView(true);
        }
      }
    } catch (error) {
      logger.error('Error setting additional properties to hide popup from dock:', { error: error.message });
    }
  }
};

const createPopupWindow = () => {
  logger.debug('createPopupWindow called');

  try {
    const popupWindowInstance = new BrowserWindow({
      width: 180,
      height: 50,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      movable: true,
      hasShadow: false,
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      visibleOnAllWorkspaces: true,
      focusable: false,
      icon: app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'logo.png')
        : path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: app.isPackaged 
          ? path.join(process.resourcesPath, 'app.asar', 'dist', 'preload', 'preload.js')
          : path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
      },
      backgroundColor: '#00000000',
      level: 'screen-saver',
      skipDock: true,
      accessory: true,
    });
    
    global.popupWindow = popupWindowInstance;
    
    hidePopupFromDock();

    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      popupWindowInstance.loadFile(path.join(resourcePath, 'app.asar', 'dist', 'popup.html'));
    } else {
      popupWindowInstance.loadFile(path.join(app.getAppPath(), 'dist/popup.html'));
    }

    popupWindowInstance.once('ready-to-show', () => {
      logger.debug('Popup window ready to show');
    });

    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    popupWindowInstance.setPosition(width - 200, height - 100);

    if (typeof popupWindowInstance.setVisibleOnAllWorkspaces === 'function') {
      popupWindowInstance.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      });
    }

    popupWindowInstance.setAlwaysOnTop(true, 'screen-saver');

    if (process.platform === 'darwin') {
      if (typeof popupWindowInstance.setWindowButtonVisibility === 'function') {
        popupWindowInstance.setWindowButtonVisibility(false);
      }
    }

    popupWindowInstance.setIgnoreMouseEvents(true, { forward: true });

    popupWindowInstance.webContents.on('did-finish-load', () => {
      try {
        popupWindowInstance.webContents.executeJavaScript(`
          document.addEventListener('mouseover', () => {
            window.electronAPI.setIgnoreMouseEvents(false);
          });
          
          document.addEventListener('mouseout', () => {
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          });
        `);
      } catch (error) {
        logger.error('Error setting up mouse event handlers:', { error: error.message });
      }
    });

    popupWindowInstance.on('close', (event) => {
      // If the app is not actually quitting, prevent the window from being closed
      if (!global.isQuitting) {
        event.preventDefault();
        popupWindowInstance.hide();
        return false;
      }
      
      // Otherwise proceed with normal close behavior
      global.popupWindow = null;
      global.popupWindowMinimized = false;
    });

    popupWindowInstance.on('closed', () => {
      global.popupWindow = null;
    });

    popupWindowInstance.on('minimize', () => {
      global.popupWindowMinimized = true;
    });

    popupWindowInstance.on('restore', () => {
      global.popupWindowMinimized = false;
    });

    return popupWindowInstance;
  } catch (error) {
    logger.error('Error creating popup window:', { error: error.message });
    return null;
  }
};

const showPopupWindow = () => {
  logger.debug('showPopupWindow called');

  try {
    if (!global.popupWindow) {
      global.popupWindow = createPopupWindow();
    }

    if (global.popupWindow) {
      if (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed()) {
        global.popupWindow = createPopupWindow();
      }

      if (global.popupWindowMinimized && global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
        try {
          global.popupWindow.restore();
          global.popupWindowMinimized = false;
        } catch (error) {
          logger.error('Error restoring popup window:', { error: error.message });
        }
      }

      if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed() && typeof global.popupWindow.isVisible === 'function' && !global.popupWindow.isVisible()) {
        try {
          global.popupWindow.show();

          global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
          if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
            global.popupWindow.setVisibleOnAllWorkspaces(true, {
              visibleOnFullScreen: true,
              skipTransformProcessType: true,
            });
          }

          if (process.platform === 'darwin') {
            if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
              global.popupWindow.setWindowButtonVisibility(false);
            }
          }
          
          setTimeout(() => {
            if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed() && typeof global.popupWindow.isVisible === 'function' && !global.popupWindow.isVisible()) {
              global.popupWindow.show();
            }
          }, 100);
        } catch (error) {
          logger.error('Error showing popup window:', { error: error.message });
          global.popupWindow = createPopupWindow();
          if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
            global.popupWindow.show();
          }
        }
      } else if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    } else {
      logger.error('Failed to create popup window');
    }
  } catch (error) {
    logger.error('Unexpected error in showPopupWindow:', { error: error.message });
  }
};

const hidePopupWindow = () => {
  if (global.popupWindow) {
    if (!global.popupWindow.isDestroyed()) {
      try {
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
          global.popupWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true,
          });
        }

        if (process.platform === 'darwin') {
          if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
            global.popupWindow.setWindowButtonVisibility(false);
          }
        }
      } catch (error) {
        logger.error('Error updating popup window:', { error: error.message });
      }
    }
  }
};

const setupDockMenu = () => {
  if (process.platform === 'darwin') {
    const dockMenu = [
      {
        label: 'Show/Hide Voice Vibe Popup',
        click: () => {
          if (global.popupWindow && !global.popupWindow.isDestroyed()) {
            if (global.popupWindow.isVisible()) {
              hidePopupWindow();
            } else {
              showPopupWindow();
            }
          } else {
            createPopupWindow();
            showPopupWindow();
          }
        },
      },
    ];

    app.dock.setMenu(require('electron').Menu.buildFromTemplate(dockMenu));
  }
};

const setIgnoreMouseEvents = (ignore, options = { forward: true }) => {
  if (global.popupWindow) {
    if (!global.popupWindow.isDestroyed()) {
      try {
        const forwardOptions = options || { forward: !ignore };
        global.popupWindow.setIgnoreMouseEvents(ignore, forwardOptions);
        return true;
      } catch (error) {
        logger.error('Error setting ignore mouse events:', { error: error.message });
        return false;
      }
    }
    return false;
  }
  return false;
};

const handleHotkeyToggle = () => {
  logger.debug('Hotkey pressed!');
  
  global.mainWindowShowRequested = true;
  
  if (!global.mainWindow || (typeof global.mainWindow.isDestroyed === 'function' && global.mainWindow.isDestroyed())) {
    global.mainWindow = createWindow();
    if (global.mainWindow) {
      global.mainWindow.webContents.once('did-finish-load', () => {
        logger.debug('Main window loaded');
      });
    }
  }
  
  if (!global.popupWindow || (typeof global.popupWindow.isDestroyed === 'function' && global.popupWindow.isDestroyed())) {
    global.popupWindow = createPopupWindow();
    
    if (global.popupWindow) {
      showPopupWindow();
    }
  } else {
    if (global.popupWindowMinimized && global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
      global.popupWindow.restore();
      global.popupWindowMinimized = false;
    } else if (global.popupWindow && typeof global.popupWindow.isVisible === 'function' && !global.popupWindow.isVisible()) {
      showPopupWindow();
    }
  }
  
  if (global.recordingManager) {
    logger.debug('Current recording state:', { isRecording: global.recordingManager.getIsRecording() });
  } else {
    logger.debug('Current recording state:', { isRecording: global.isRecording });
  }
  
  if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
    try {
      if (typeof global.mainWindow.webContents.isLoading === 'function' && global.mainWindow.webContents.isLoading()) {
        global.mainWindow.webContents.once('did-finish-load', () => {
          global.mainWindowShowRequested = false;
          global.mainWindow.webContents.send('toggle-recording');
          
          setTimeout(() => {
            if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed() && 
                typeof global.mainWindow.isVisible === 'function' && global.mainWindow.isVisible()) {
              global.mainWindow.hide();
            }
          }, 100);
        });
      } else {
        global.mainWindowShowRequested = false;
        global.mainWindow.webContents.send('toggle-recording');
        
        setTimeout(() => {
          if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed() && 
              typeof global.mainWindow.isVisible === 'function' && global.mainWindow.isVisible()) {
            global.mainWindow.hide();
          }
        }, 100);
      }
    } catch (error) {
      logger.error('Error sending toggle-recording event:', { error: error.message });
    }
  }
  
  if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed()) {
    try {
      global.popupWindow.webContents.send('recording-toggle-requested');
    } catch (error) {
      logger.error('Error sending recording-toggle-requested event:', { error: error.message });
    }
  }
};

const registerGlobalHotkey = (_, settings) => {
  globalShortcut.unregisterAll();

  const hotkey = settings.hotkey || 'Home';

  try {
    const registered = globalShortcut.register(hotkey, handleHotkeyToggle);

    if (!registered) {
      logger.error(`Failed to register hotkey: ${hotkey}`);
    }
  } catch (error) {
    logger.error(`Error registering hotkey ${hotkey}:`, { error: error.message });

    try {
      globalShortcut.register('Home', handleHotkeyToggle);
    } catch (fallbackError) {
      logger.error('Failed to register fallback hotkey:', { error: fallbackError.message });
    }
  }
};

const restoreMinimizedWindows = () => {
  if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed() && global.mainWindowMinimized) {
    try {
      if (typeof global.mainWindow.isMinimized === 'function' && global.mainWindow.isMinimized()) {
        global.mainWindow.restore();
      } else {
        global.mainWindow.show();
      }
      global.mainWindow.focus();
      global.mainWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring main window:', { error: error.message });
      try {
        global.mainWindow.show();
      } catch (showError) {
        logger.error('Error showing main window as fallback:', { error: showError.message });
      }
    }
  }

  if (global.popupWindow && typeof global.popupWindow.isDestroyed === 'function' && !global.popupWindow.isDestroyed() && global.popupWindowMinimized) {
    try {
      if (typeof global.popupWindow.isMinimized === 'function' && global.popupWindow.isMinimized()) {
        global.popupWindow.restore();
      } else {
        global.popupWindow.show();
      }
      global.popupWindowMinimized = false;
    } catch (error) {
      logger.error('Error restoring popup window:', { error: error.message });
      try {
        global.popupWindow.show();
      } catch (showError) {
        logger.error('Error showing popup window as fallback:', { error: showError.message });
      }
    }
  }
};

const minimizeMainWindow = () => {
  if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.minimize();
      global.mainWindowMinimized = true;
      logger.debug('Main window minimized');
      return true;
    } catch (error) {
      logger.error('Error minimizing main window:', { error: error.message });
      return false;
    }
  }
  return false;
};

module.exports = {
  mainWindow,
  popupWindow,
  isRecording,
  createWindow,
  createPopupWindow,
  hidePopupFromDock,
  showPopupWindow,
  hidePopupWindow,
  setupDockMenu,
  setIgnoreMouseEvents,
  handleHotkeyToggle,
  registerGlobalHotkey,
  restoreMinimizedWindows,
  minimizeMainWindow
}; 