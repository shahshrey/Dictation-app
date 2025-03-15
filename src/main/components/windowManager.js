const { BrowserWindow, app } = require('electron');
const path = require('path');

// Global reference to the main window
let mainWindow = null;
// Global reference to the popup window
let popupWindow = null;

// Track recording state
let isRecording = false;

const createWindow = () => {
  console.log('createWindow called');

  try {
    console.log('Creating main browser window');
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local resources
      },
    });
    
    // IMPORTANT: Store the window in the global state
    global.mainWindow = mainWindow;
    
    console.log('Main window created successfully');

    console.log('Loading index.html file');
    // Load the index.html file
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Opening DevTools');
      mainWindow.webContents.openDevTools();
    }

    // Add event listeners to track window state
    mainWindow.on('close', () => {
      console.log('Main window close event triggered');
    });

    mainWindow.on('closed', () => {
      console.log('Main window closed event triggered');
      global.mainWindow = null;
    });

    mainWindow.on('focus', () => {
      console.log('Main window focus event triggered');
    });

    mainWindow.on('blur', () => {
      console.log('Main window blur event triggered');
    });

    console.log('Main window setup complete');

    return mainWindow;
  } catch (error) {
    console.error('Error creating main window:', error);
    return null;
  }
};

// After creating the popup window, set additional properties to hide it from dock
const hidePopupFromDock = () => {
  if (popupWindow && process.platform === 'darwin') {
    console.log('Setting additional properties to hide popup from dock');
    try {
      // Set additional properties to hide from dock and app switcher
      popupWindow.setSkipTaskbar(true);

      // For macOS, we need to set some additional properties
      if (typeof popupWindow.setHiddenInMissionControl === 'function') {
        popupWindow.setHiddenInMissionControl(true);
      }

      // Set the window to be an accessory window which helps hide it from dock
      if (typeof popupWindow.setWindowButtonVisibility === 'function') {
        popupWindow.setWindowButtonVisibility(false);
      }

      // Set the window to be a utility window which helps hide it from dock
      if (typeof popupWindow.setVisibleOnAllWorkspaces === 'function') {
        popupWindow.setVisibleOnAllWorkspaces(true, {
          visibleOnFullScreen: true,
          skipTransformProcessType: true, // Add this option to prevent dock hiding
        });
      }

      console.log('Successfully set additional properties to hide popup from dock');
    } catch (error) {
      console.error('Error setting additional properties to hide popup from dock:', error);
    }
  }
};

// Create a popup window for dictation
const createPopupWindow = () => {
  console.log('createPopupWindow called');

  try {
    console.log('Creating popup window with system-wide overlay settings');
    // Create the popup window as a system-wide overlay
    const popupWindow = new BrowserWindow({
      width: 180, // Smaller width for the pill
      height: 50, // Smaller height for the pill
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      resizable: false,
      movable: true,
      hasShadow: false, // Remove shadow to eliminate white border
      // Use 'panel' type for macOS to ensure it stays above all windows
      type: process.platform === 'darwin' ? 'panel' : 'panel',
      visibleOnAllWorkspaces: true, // Visible on all workspaces
      focusable: false, // Make it non-focusable to prevent it from stealing focus
      icon: path.join(app.getAppPath(), 'src/assets/logo/logo.png'),
      webPreferences: {
        preload: path.join(app.getAppPath(), 'dist/preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Allow loading local resources
      },
      // Remove any styling that might cause a white border
      backgroundColor: '#00000000', // Fully transparent background
      // Set the window level to be above everything else
      level: 'screen-saver', // Use the highest level possible
      // Hide from dock and app switcher
      skipDock: true, // macOS specific property to hide from dock
      accessory: true, // macOS specific property to make it an accessory window
    });
    
    // IMPORTANT: Store the window in the global state
    global.popupWindow = popupWindow;
    
    console.log('Popup window created successfully');

    // Set additional properties to hide from dock
    hidePopupFromDock();

    console.log('Loading popup HTML file');
    // Load the popup HTML file
    popupWindow.loadFile(path.join(app.getAppPath(), 'dist/popup.html'));

    console.log('Getting primary display dimensions');
    // Position the popup window in the bottom right corner
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    console.log('Primary display dimensions:', width, 'x', height);
    console.log('Positioning popup window at:', width - 200, height - 100);
    popupWindow.setPosition(width - 200, height - 100);

    console.log('Setting popup window to be visible on all workspaces');
    // Make sure it's visible on all workspaces and full screen
    if (typeof popupWindow.setVisibleOnAllWorkspaces === 'function') {
      popupWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true, // Add this option to prevent dock hiding
      });
    }

    // Set the window to be always on top with the highest level
    popupWindow.setAlwaysOnTop(true, 'screen-saver');

    // For macOS, set the window level to floating (above everything)
    if (process.platform === 'darwin') {
      if (typeof popupWindow.setWindowButtonVisibility === 'function') {
        popupWindow.setWindowButtonVisibility(false);
      }
    }

    console.log('Setting popup window to ignore mouse events by default');
    // Make the window non-interactive when not hovered
    // This allows clicks to pass through to the application underneath
    popupWindow.setIgnoreMouseEvents(true, { forward: true });

    console.log('Setting up mouse event handlers for the popup window');
    // But enable mouse events when hovering over the window
    popupWindow.webContents.on('did-finish-load', () => {
      console.log('Popup window finished loading, setting up mouse event handlers');
      try {
        popupWindow.webContents.executeJavaScript(`
          document.addEventListener('mouseover', () => {
            console.log('Mouse over popup window, enabling mouse events');
            window.electronAPI.setIgnoreMouseEvents(false);
          });
          
          document.addEventListener('mouseout', () => {
            console.log('Mouse out of popup window, disabling mouse events');
            window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          });
        `);
        console.log('Mouse event handlers set up successfully');
      } catch (error) {
        console.error('Error setting up mouse event handlers:', error);
      }
    });

    // Add event listeners to track window state
    popupWindow.on('close', () => {
      console.log('Popup window close event triggered');
    });

    popupWindow.on('closed', () => {
      console.log('Popup window closed event triggered');
      global.popupWindow = null;
    });

    popupWindow.on('show', () => {
      console.log('Popup window show event triggered');
    });

    popupWindow.on('hide', () => {
      console.log('Popup window hide event triggered');
    });

    console.log('Popup window setup complete');

    return popupWindow;
  } catch (error) {
    console.error('Error creating popup window:', error);
    return null;
  }
};

// Show the popup window - always show it when the app starts
const showPopupWindow = () => {
  console.log('showPopupWindow called');

  if (!global.popupWindow) {
    console.log('No popup window exists, creating one');
    createPopupWindow();
  }

  if (global.popupWindow) {
    if (global.popupWindow.isDestroyed()) {
      console.log('Popup window is destroyed, creating a new one');
      createPopupWindow();
    }

    if (!global.popupWindow.isVisible()) {
      console.log('Showing popup window');
      try {
        global.popupWindow.show();
        console.log('Popup window shown successfully');

        // Ensure it's always on top and visible on all workspaces
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
          global.popupWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true, // Add this option to prevent dock hiding
          });
        }

        // For macOS, set the window level to floating (above everything)
        if (process.platform === 'darwin') {
          if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
            global.popupWindow.setWindowButtonVisibility(false);
          }
        }
      } catch (error) {
        console.error('Error showing popup window:', error);
      }
    } else {
      console.log('Popup window is already visible');
    }
  } else {
    console.error('Failed to create popup window');
  }
};

// Hide the popup window - we'll keep this for potential future use
const hidePopupWindow = () => {
  console.log('hidePopupWindow called');

  if (global.popupWindow) {
    if (!global.popupWindow.isDestroyed()) {
      console.log('Updating popup window to show not recording state');
      try {
        // Instead of hiding, we'll just update the UI to show not recording
        // The actual UI update is handled by the renderer process based on isRecording state
        // We'll just ensure it stays visible and on top
        global.popupWindow.setAlwaysOnTop(true, 'screen-saver');
        if (typeof global.popupWindow.setVisibleOnAllWorkspaces === 'function') {
          global.popupWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: true, // Add this option to prevent dock hiding
          });
        }

        // For macOS, ensure window level is set to floating
        if (process.platform === 'darwin') {
          if (typeof global.popupWindow.setWindowButtonVisibility === 'function') {
            global.popupWindow.setWindowButtonVisibility(false);
          }
        }

        console.log('Popup window updated to not recording state');
      } catch (error) {
        console.error('Error updating popup window:', error);
      }
    } else {
      console.log('Popup window is destroyed, cannot update');
    }
  } else {
    console.log('No popup window to update');
  }
};

// Set up the dock menu for macOS
const setupDockMenu = () => {
  if (process.platform === 'darwin') {
    console.log('Setting up dock menu for macOS');

    const dockMenu = [
      {
        label: 'Show/Hide Dictation Popup',
        click: () => {
          if (global.popupWindow && !global.popupWindow.isDestroyed()) {
            if (global.popupWindow.isVisible()) {
              console.log('Hiding popup window from dock menu');
              hidePopupWindow();
            } else {
              console.log('Showing popup window from dock menu');
              showPopupWindow();
            }
          } else {
            console.log('Creating and showing popup window from dock menu');
            createPopupWindow();
            showPopupWindow();
          }
        },
      },
    ];

    app.dock.setMenu(require('electron').Menu.buildFromTemplate(dockMenu));
    console.log('Dock menu set up successfully');
  }
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
  setupDockMenu
}; 