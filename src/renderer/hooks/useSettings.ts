import { useState } from 'react';
import { AppSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { logger } from '../utils/logger';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings
  const loadSettings = async (): Promise<void> => {
    try {
      const loadedSettings = await window.electronAPI.getSettings();
      // First convert to unknown, then assert as AppSettings to avoid type errors
      setSettings((loadedSettings as unknown as AppSettings) ?? DEFAULT_SETTINGS);
    } catch (error) {
      logger.exception('Failed to load settings', error);
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      if (window.electronAPI && typeof window.electronAPI.saveSettings === 'function') {
        await window.electronAPI.saveSettings(updatedSettings);
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
