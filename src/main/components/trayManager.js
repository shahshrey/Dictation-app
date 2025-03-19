const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');
const logger = require('../../shared/logger').default;
const fs = require('fs');

let tray = null;

/**
 * Creates the system tray icon and menu
 */
const createTray = () => {
  logger.debug('Creating system tray');
  
  try {
    // Get the appropriate icon paths
    const regularIconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'logo.png')
      : path.join(app.getAppPath(), 'src/assets/logo/logo.png');
    
    const menubarIconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'logo', 'menubar', 'icon.png')
      : path.join(app.getAppPath(), 'src/assets/logo/menubar/icon.png');
    
    // Check if dedicated menubar icon exists
    let trayIconPath = regularIconPath;
    if (process.platform === 'darwin' && fs.existsSync(menubarIconPath)) {
      trayIconPath = menubarIconPath;
    }
    
    logger.debug('Creating tray with icon from:', { path: trayIconPath });
    
    let menubarIcon;
    
    try {
      // Create a native image from the icon path
      const trayIcon = nativeImage.createFromPath(trayIconPath);
      
      // For macOS, create a resized image that fits better in the menubar
      // and set it as template for proper dark/light mode display
      menubarIcon = trayIcon;
      if (process.platform === 'darwin') {
        // Use a slightly larger version for the menubar (24x24)
        if (trayIcon.getSize().width > 22) {
          menubarIcon = trayIcon.resize({ width: 30, height: 30 });
        }
        
        // Set as template image for automatic dark/light mode handling
        menubarIcon.setTemplateImage(true);
      }
      
      // If the icon is empty for some reason, create a basic icon
      if (menubarIcon.isEmpty()) {
        throw new Error('Icon is empty');
      }
    } catch (iconError) {
      logger.error('Error creating icon, using built-in icon:', { error: iconError.message });
      
      if (process.platform === 'darwin') {
        // On macOS, create a simple microphone icon
        menubarIcon = nativeImage.createEmpty();
        
        // Create a simple icon for macOS
        // This is a small black icon that will be correctly displayed in dark/light modes
        const iconData = Buffer.from(`
          89504E470D0A1A0A0000000D49484452000000100000001008060000001FF3FF
          610000000467414D410000B18F0BFC6105000000097048597300000EC300000E
          C301C76FA8640000001A74455874536F667477617265005061696E742E4E4554
          2076332E352E313030F472A1000000304944415438CBEDD2310A00300804D177
          C77DBCBD2331581C8208D18BEE0E82105906A0A8CE0C0DEEE6F00336B9BB3FEC
          2CF35B783F07E705D5835A20000000049454E44AE426082
        `.replace(/[^a-f0-9]/gi, ''), 'hex');
        
        menubarIcon = nativeImage.createFromBuffer(iconData);
        menubarIcon.setTemplateImage(true);
      } else {
        // For other platforms, use a square icon
        menubarIcon = nativeImage.createEmpty();
      }
    }
    
    // Create the tray instance with the appropriate icon
    logger.debug('Creating the tray instance');
    tray = new Tray(menubarIcon);
    tray.setToolTip('Voice Vibe');
    
    // Update the tray context menu
    updateTrayMenu();
    
    // For additional debugging on macOS
    if (process.platform === 'darwin') {
      logger.debug('Created macOS menubar icon - details:', { 
        isEmpty: menubarIcon.isEmpty(),
        size: menubarIcon.getSize(),
        isTemplate: menubarIcon.isTemplateImage()
      });
    }
    
    logger.debug('System tray created successfully');
    return tray;
  } catch (error) {
    logger.error('Error creating system tray:', { error: error.message });
    return null;
  }
};

/**
 * Updates the tray menu based on current application state
 */
const updateTrayMenu = () => {
  if (!tray) return;
  
  try {
    const mainWindowExists = global.mainWindow && 
                           typeof global.mainWindow.isDestroyed === 'function' && 
                           !global.mainWindow.isDestroyed();
    
    const popupWindowExists = global.popupWindow && 
                            typeof global.popupWindow.isDestroyed === 'function' && 
                            !global.popupWindow.isDestroyed();
    
    const isRecording = global.recordingManager ? 
                      global.recordingManager.getIsRecording() : 
                      global.isRecording;
    
    const template = [
      {
        label: 'Voice Vibe',
        enabled: false
      },
      { type: 'separator' },
      {
        label: isRecording ? 'Stop Recording' : 'Start Recording',
        click: () => {
          if (global.mainWindow && typeof global.mainWindow.isDestroyed === 'function' && !global.mainWindow.isDestroyed()) {
            global.mainWindow.webContents.send('toggle-recording');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Show Main Window',
        click: () => {
          if (mainWindowExists) {
            // Restore from minimized state if needed
            if (global.mainWindowMinimized) {
              global.mainWindow.restore();
              global.mainWindowMinimized = false;
            }
            // Show and focus
            global.mainWindow.show();
            global.mainWindow.focus();
          } else if (global.createWindow) {
            global.mainWindow = global.createWindow();
            if (global.mainWindow) {
              global.mainWindow.show();
              global.mainWindow.focus();
            }
          }
        }
      },
      {
        label: popupWindowExists && global.popupWindow.isVisible() ? 'Hide Popup' : 'Show Popup',
        click: () => {
          if (popupWindowExists) {
            if (global.popupWindow.isVisible()) {
              global.popupWindow.hide();
            } else {
              global.showPopupWindow();
            }
          } else if (global.createPopupWindow && global.showPopupWindow) {
            global.popupWindow = global.createPopupWindow();
            global.showPopupWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          // Set the isQuitting flag to true to allow complete shutdown
          global.isQuitting = true;
          app.quit();
        }
      }
    ];
    
    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);
    
    // On macOS, ensure the icon is visible
    if (process.platform === 'darwin') {
      tray.setToolTip(isRecording ? 'Voice Vibe - Recording' : 'Voice Vibe');
    }
  } catch (error) {
    logger.error('Error updating tray menu:', { error: error.message });
  }
};

/**
 * Destroys the tray instance
 */
const destroyTray = () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
};

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray
}; 