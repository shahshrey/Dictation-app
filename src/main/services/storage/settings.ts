import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';
import logger from '../../../shared/logger';
import { DEFAULT_SETTINGS } from '../constants';
import { registerGlobalHotkey } from '../window/hotkeyManager';
import { BrowserWindow } from 'electron';

type Store = {
  set: (settings: Record<string, unknown>) => void;
};

interface Settings {
  [key: string]: unknown;
  apiKey?: string;
  hotkeyToggleRecording?: string;
}

/**
 * Sets up settings-related IPC handlers
 * @param mainWindow - The main application window
 * @param settings - The settings object
 * @param store - The electron-store instance
 */
export const setupSettingsHandlers = (
  mainWindow: BrowserWindow,
  settings: Settings,
  store?: Store
): void => {
  // Get settings
  ipcMain.handle('get-settings', (): Settings => {
    try {
      // Try to load settings from fallback file if store is not available
      if (!store) {
        logger.debug('Store not available, trying to load settings from fallback file');
        try {
          const settingsPath = path.join(app.getPath('userData'), 'settings.json');
          if (fs.existsSync(settingsPath)) {
            const fileSettings = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf-8' }));
            logger.debug('Loaded settings from fallback file');
            // Update the in-memory settings
            Object.assign(settings, fileSettings);
          } else {
            logger.debug('No fallback settings file found, using default settings');
          }
        } catch (fileError) {
          logger.error('Error loading settings from fallback file:', {
            error: (fileError as Error).message,
          });
        }
      }

      // Log the settings being returned to the renderer
      logger.debug('[DEBUG] Current settings from getSettings:', {
        settings: JSON.stringify({
          ...settings,
          apiKey: settings.apiKey ? '[API KEY PRESENT]' : 'null',
        }),
      });
      logger.debug('[DEBUG] Current settings API key available:', { available: !!settings.apiKey });
      logger.debug('[DEBUG] Current settings API key length:', {
        length: settings.apiKey ? settings.apiKey.length : 0,
      });

      return settings;
    } catch (error) {
      logger.error('Error in get-settings handler:', { error: (error as Error).message });
      return { ...DEFAULT_SETTINGS };
    }
  });

  // Save settings
  ipcMain.handle(
    'save-settings',
    (_, newSettings: Settings): { success: boolean; error?: string } => {
      try {
        if (store) {
          logger.debug('Saving settings using electron-store');
          try {
            store.set(newSettings);
            logger.debug('Settings saved successfully to electron-store');
          } catch (storeError) {
            logger.error('Error saving to electron-store, falling back to file:', {
              error: (storeError as Error).message,
            });
            // Fall back to file storage if store.set fails
            Object.assign(settings, newSettings);
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), {
              encoding: 'utf-8',
            });
            logger.debug('Settings saved to fallback file:', { path: settingsPath });
          }
        } else {
          logger.debug('Store not available, saving settings to file');
          Object.assign(settings, newSettings);
          // Save to a JSON file as fallback
          const settingsPath = path.join(app.getPath('userData'), 'settings.json');
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), { encoding: 'utf-8' });
          logger.debug('Settings saved to file:', { path: settingsPath });
        }

        // Always update the in-memory settings
        Object.assign(settings, newSettings);

        // Re-register the global hotkey with the new settings
        registerGlobalHotkey(mainWindow, {
          hotkeyToggleRecording: settings.hotkeyToggleRecording as string | undefined,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to save settings:', { error: (error as Error).message });
        return { success: false, error: String(error) };
      }
    }
  );
};

export default { setupSettingsHandlers };
