import { BrowserWindow } from 'electron';
import { setupPermissionHandlers } from './permissions/permissions';
import { setupAudioHandlers } from './audio/audio';
import { setupStorageHandlers } from './storage/storageIpc';
import { setupFileDialogHandlers } from './storage/fileDialog';
import { setupApiKeyValidatorHandlers } from './groq/apiKeyValidator';
import { setupSettingsHandlers } from './storage/settings';
import { setupWindowHandlers } from './window/window';
import { setupTrayHandlers } from './tray/tray';
import { setupClipboardHandlers } from './clipboard/clipboard';

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
