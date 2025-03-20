import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import logger from '../../shared/logger';
import { ensureStorageDirectories } from './storage/storageManager';
import { DEFAULT_MAIN_SETTINGS, MainProcessSettings } from '../../shared/constants';

// Define types for our settings
export interface AppSettings extends MainProcessSettings {
  [key: string]: unknown; // Allow for additional properties with unknown type
}

// Extend the Store type to match the actual implementation
interface ElectronStore<T extends Record<string, unknown>> extends Store<T> {
  store: T; // The underlying data object
  set<K extends keyof T>(key: K, value: T[K]): void; // Set method
}

// Augment the global object to include settings
declare global {
  // eslint-disable-next-line no-var
  var settings: AppSettings | undefined;
}

// Create a class for better encapsulation and type safety
export class StoreService {
  private static instance: StoreService;
  private store: ElectronStore<AppSettings> | null = null;
  private settings: AppSettings = { ...DEFAULT_MAIN_SETTINGS };

  private constructor() {}

  /**
   * Get the singleton instance of StoreService
   */
  public static getInstance(): StoreService {
    if (!StoreService.instance) {
      StoreService.instance = new StoreService();
    }
    return StoreService.instance;
  }

  /**
   * Initialize the store
   * @returns Promise<boolean> indicating success
   */
  public async init(): Promise<boolean> {
    try {
      this.store = new Store<AppSettings>({
        defaults: DEFAULT_MAIN_SETTINGS as AppSettings,
        name: 'settings',
        watch: false, // Disable watching for changes to improve performance
      }) as ElectronStore<AppSettings>;

      // Update the settings object with values from the store
      Object.assign(this.settings, this.store.store);
      logger.debug('Settings loaded from electron-store');

      // Update the global settings object if it exists
      if (global.settings) {
        Object.assign(global.settings, this.store.store);
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize store:', { error: (error as Error).message });
      // Try to load settings from fallback file if store initialization fails
      return this.loadSettingsFromFileSync(); // Use sync version for critical path
    }
  }

  /**
   * Get the settings object
   */
  public getSettings(): AppSettings {
    return this.settings;
  }

  /**
   * Get the store instance
   */
  public getStore(): ElectronStore<AppSettings> | null {
    return this.store;
  }

  /**
   * Update a setting value
   * @param key The setting key
   * @param value The setting value
   */
  public updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    if (this.store) {
      this.store.set(key, value);
      this.settings[key] = value;
    } else {
      logger.error('Store not initialized, cannot update setting');
    }
  }

  /**
   * Load settings from fallback file
   * @returns Promise<boolean> indicating success
   */
  public async loadSettingsFromFile(): Promise<boolean> {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');

      // Check if file exists
      try {
        await fs.access(settingsPath);
      } catch (error) {
        logger.debug('Settings file does not exist:', { path: settingsPath });
        logger.exception('Settings file does not exist:', error as Error);
        return false;
      }

      logger.debug('Loading settings from fallback file:', { path: settingsPath });
      const fileData = await fs.readFile(settingsPath, { encoding: 'utf-8' });
      const fileSettings = JSON.parse(fileData);
      Object.assign(this.settings, fileSettings);
      logger.debug('Settings loaded from fallback file');
      return true;
    } catch (error) {
      logger.error('Failed to load settings from fallback file:', {
        error: (error as Error).message,
      });
    }
    return false;
  }

  /**
   * Synchronous version for critical startup path
   * @returns boolean indicating success
   */
  public loadSettingsFromFileSync(): boolean {
    try {
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      if (fsSync.existsSync(settingsPath)) {
        logger.debug('Loading settings from fallback file (sync):', { path: settingsPath });
        const fileSettings = JSON.parse(fsSync.readFileSync(settingsPath, { encoding: 'utf-8' }));
        Object.assign(this.settings, fileSettings);
        logger.debug('Settings loaded from fallback file (sync)');
        return true;
      }
    } catch (error) {
      logger.error('Failed to load settings from fallback file (sync):', {
        error: (error as Error).message,
      });
    }
    return false;
  }

  /**
   * Ensure directories exist using the storage manager
   * @returns Promise<void>
   */
  public async ensureDirectories(): Promise<void> {
    return ensureStorageDirectories();
  }
}

// Export a singleton instance for easy access
export const storeService = StoreService.getInstance();

// Export for backward compatibility
export const settings = storeService.getSettings();
export const getStore = () => storeService.getStore();
export const initStore = async () => storeService.init();
export const ensureDirectories = async () => storeService.ensureDirectories();
export const loadSettingsFromFile = async () => storeService.loadSettingsFromFile();
export const loadSettingsFromFileSync = () => storeService.loadSettingsFromFileSync();
