import { useState } from 'react';
import { DEFAULT_RENDERER_SETTINGS, RendererSettings } from '../../shared/constants';
import logger from '../../shared/logger';

export const useSettings = () => {
  const [settings, setSettings] = useState<RendererSettings>(DEFAULT_RENDERER_SETTINGS);

  // Load settings
  const loadSettings = async (): Promise<void> => {
    try {
      logger.debug('Loading settings...');
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

        // First convert to unknown, then assert as RendererSettings to avoid type errors
        const typedSettings =
          (loadedSettings as unknown as RendererSettings) ?? DEFAULT_RENDERER_SETTINGS;

        // Log important settings
        logger.debug(`API key available: ${!!typedSettings.apiKey}`);
        logger.debug(`API key length: ${typedSettings.apiKey ? typedSettings.apiKey.length : 0}`);
        logger.debug(`Auto-transcribe enabled: ${typedSettings.autoTranscribe}`);
        logger.debug(`Language setting: ${typedSettings.language}`);

        setSettings(typedSettings);
        return;
      }

      logger.warn('getSettings API not available, using default settings');
      setSettings(DEFAULT_RENDERER_SETTINGS);
    } catch (error) {
      logger.exception('Failed to load settings', error);
      // Fall back to default settings
      setSettings(DEFAULT_RENDERER_SETTINGS);
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<RendererSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      logger.debug('Updating settings...');
      logger.debug(`Updated settings: ${JSON.stringify(updatedSettings, null, 2)}`);

      setSettings(updatedSettings);

      if (window.electronAPI && typeof window.electronAPI.saveSettings === 'function') {
        await window.electronAPI.saveSettings(updatedSettings);
        logger.debug('Settings saved successfully');
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
