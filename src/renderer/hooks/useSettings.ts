import { useState } from 'react';
import { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { logger } from '../utils/logger';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings
  const loadSettings = async (): Promise<void> => {
    try {
      logger.info('Loading settings...');
      if (window.electronAPI && typeof window.electronAPI.getSettings === 'function') {
        const loadedSettings = await window.electronAPI.getSettings();
        logger.debug(
          `Loaded settings: ${JSON.stringify(
            {
              ...loadedSettings,
              apiKey: loadedSettings.apiKey ? '[API KEY PRESENT]' : 'null',
            },
            null,
            2
          )}`
        );

        // First convert to unknown, then assert as AppSettings to avoid type errors
        const typedSettings = (loadedSettings as unknown as AppSettings) ?? DEFAULT_SETTINGS;

        // Log important settings
        logger.debug(`API key available: ${!!typedSettings.apiKey}`);
        logger.debug(`API key length: ${typedSettings.apiKey ? typedSettings.apiKey.length : 0}`);
        logger.debug(`Auto-transcribe enabled: ${typedSettings.autoTranscribe}`);
        logger.debug(`Language setting: ${typedSettings.language}`);

        setSettings(typedSettings);
        return;
      }

      logger.warn('getSettings API not available, using default settings');
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      logger.exception('Failed to load settings', error);
      // Fall back to default settings
      setSettings(DEFAULT_SETTINGS);
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      logger.info('Updating settings...');
      logger.debug(`Updated settings: ${JSON.stringify(updatedSettings, null, 2)}`);

      setSettings(updatedSettings);

      if (window.electronAPI && typeof window.electronAPI.saveSettings === 'function') {
        await window.electronAPI.saveSettings(updatedSettings);
        logger.info('Settings saved successfully');
      } else {
        logger.warn('saveSettings API not available, settings not persisted');
      }
    } catch (error) {
      logger.exception('Failed to update settings', error);
    }
  };

  return {
    settings,
    loadSettings,
    updateSettings,
  };
};
