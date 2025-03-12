import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import { setupAudioRecording } from './services/audio';
import { setupGroqAPI } from './services/groq';
import { setupFileStorage } from './services/storage';
import { UI_CONSTANTS } from '../shared/constants';
import { IPC_CHANNELS } from '../shared/types';

// Declare the webpack entry points as globals
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global reference to the main window
let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
 */
const createWindow = (): void => {
  try {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: UI_CONSTANTS.MAIN_WINDOW_WIDTH,
      height: UI_CONSTANTS.MAIN_WINDOW_HEIGHT,
      backgroundColor: '#f8f9fa', // Light background color
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  } catch (error) {
    console.error('Error creating window:', error);
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  try {
    createWindow();
    
    // Setup global shortcut (Home key) for starting/stopping recording
    globalShortcut.register('Home', () => {
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.TOGGLE_RECORDING);
      }
    });
    
    // Setup audio recording handlers
    setupAudioRecording(ipcMain, mainWindow);
    
    // Setup Groq API integration
    setupGroqAPI(ipcMain);
    
    // Setup file storage for transcriptions
    setupFileStorage(ipcMain);
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (error) {
    console.error('Error unregistering shortcuts:', error);
  }
}); 