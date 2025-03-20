import { BrowserWindow } from 'electron';
import { setupPermissionHandlers } from './permissions';
import { setupAudioHandlers } from './audio';
import { setupStorageHandlers } from './storageIpc';
import { setupFileDialogHandlers } from './fileDialog';
import { setupApiKeyValidatorHandlers } from './groq/apiKeyValidator';
import { setupSettingsHandlers } from './settings';
import { setupWindowHandlers } from './window';
import { setupTrayHandlers } from './tray';
import { setupClipboardHandlers } from './clipboard';

type Store = {
  set: (settings: Record<string, unknown>) => void;
};

interface Settings {
  [key: string]: unknown;
  apiKey?: string;
}

/**
 * Sets up all IPC handlers for the application
 * @param mainWindow - The main application window
 * @param popupWindow - The popup window for recording
 * @param settings - The settings object
 * @param store - The electron-store instance
 */
const setupIpcHandlers = (
  mainWindow: BrowserWindow,
  popupWindow: BrowserWindow,
  settings: Settings,
  store?: Store
): void => {
  // Set up all modular IPC handlers
  setupPermissionHandlers();
  setupAudioHandlers(mainWindow);
  setupStorageHandlers();
  setupFileDialogHandlers();
  setupApiKeyValidatorHandlers();
  setupSettingsHandlers(mainWindow, settings, store);
  setupWindowHandlers();
  setupTrayHandlers();
  setupClipboardHandlers();
};

export { setupIpcHandlers };
