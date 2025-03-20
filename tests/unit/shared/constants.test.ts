import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_RENDERER_SETTINGS,
  STORAGE_PATHS,
  AUDIO_SETTINGS,
  UI_CONSTANTS,
  DEFAULT_MAIN_SETTINGS,
  TEMP_DIR,
  DEFAULT_SAVE_DIR,
  AUDIO_FILE_PATH,
} from '../../../src/shared/constants';

describe('Shared Constants', () => {
  describe('APP_NAME', () => {
    it('should be defined', () => {
      expect(APP_NAME).toBeDefined();
      expect(typeof APP_NAME).toBe('string');
    });
  });

  describe('APP_VERSION', () => {
    it('should be defined', () => {
      expect(APP_VERSION).toBeDefined();
      expect(typeof APP_VERSION).toBe('string');
    });

    it('should follow semantic versioning format', () => {
      const semverRegex = /^\d+\.\d+\.\d+$/;
      expect(APP_VERSION).toMatch(semverRegex);
    });
  });

  describe('DEFAULT_RENDERER_SETTINGS', () => {
    it('should be defined', () => {
      expect(DEFAULT_RENDERER_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_RENDERER_SETTINGS).toBe('object');
    });

    it('should have the required properties', () => {
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('apiKey');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('selectedMicrophone');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('language');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('theme');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('saveTranscriptions');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('transcriptionSavePath');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('autoTranscribe');
      expect(DEFAULT_RENDERER_SETTINGS).toHaveProperty('hotkey');
    });

    it('should have the correct default values', () => {
      expect(DEFAULT_RENDERER_SETTINGS.apiKey).toBe('');
      expect(DEFAULT_RENDERER_SETTINGS.selectedMicrophone).toBe('');
      expect(DEFAULT_RENDERER_SETTINGS.language).toBe('en');
      expect(DEFAULT_RENDERER_SETTINGS.theme).toBe('system');
      expect(DEFAULT_RENDERER_SETTINGS.saveTranscriptions).toBe(true);
      expect(DEFAULT_RENDERER_SETTINGS.autoTranscribe).toBe(false);
      expect(DEFAULT_RENDERER_SETTINGS.hotkey).toBe('Home');
    });
  });

  describe('DEFAULT_MAIN_SETTINGS', () => {
    it('should be defined', () => {
      expect(DEFAULT_MAIN_SETTINGS).toBeDefined();
      expect(typeof DEFAULT_MAIN_SETTINGS).toBe('object');
    });

    it('should have the required properties', () => {
      expect(DEFAULT_MAIN_SETTINGS).toHaveProperty('apiKey');
      expect(DEFAULT_MAIN_SETTINGS).toHaveProperty('defaultLanguage');
      expect(DEFAULT_MAIN_SETTINGS).toHaveProperty('transcriptionModel');
      expect(DEFAULT_MAIN_SETTINGS).toHaveProperty('showNotifications');
      expect(DEFAULT_MAIN_SETTINGS).toHaveProperty('saveTranscriptionsAutomatically');
    });

    it('should have the correct default values', () => {
      expect(DEFAULT_MAIN_SETTINGS.apiKey).toBe('');
      expect(DEFAULT_MAIN_SETTINGS.defaultLanguage).toBe('auto');
      expect(DEFAULT_MAIN_SETTINGS.showNotifications).toBe(true);
      expect(DEFAULT_MAIN_SETTINGS.saveTranscriptionsAutomatically).toBe(false);
    });
  });

  describe('File paths', () => {
    it('should be defined', () => {
      expect(TEMP_DIR).toBeDefined();
      expect(DEFAULT_SAVE_DIR).toBeDefined();
      expect(AUDIO_FILE_PATH).toBeDefined();
      expect(typeof TEMP_DIR).toBe('string');
      expect(typeof DEFAULT_SAVE_DIR).toBe('string');
      expect(typeof AUDIO_FILE_PATH).toBe('string');
    });
  });

  describe('STORAGE_PATHS', () => {
    it('should be defined', () => {
      expect(STORAGE_PATHS).toBeDefined();
      expect(typeof STORAGE_PATHS).toBe('object');
    });

    it('should have the required properties', () => {
      expect(STORAGE_PATHS).toHaveProperty('SETTINGS');
      expect(STORAGE_PATHS).toHaveProperty('TRANSCRIPTIONS');
    });

    it('should have the correct values', () => {
      expect(STORAGE_PATHS.SETTINGS).toBe('settings.json');
      expect(STORAGE_PATHS.TRANSCRIPTIONS).toBe('transcriptions.json');
    });
  });

  describe('AUDIO_SETTINGS', () => {
    it('should be defined', () => {
      expect(AUDIO_SETTINGS).toBeDefined();
      expect(typeof AUDIO_SETTINGS).toBe('object');
    });

    it('should have the required properties', () => {
      expect(AUDIO_SETTINGS).toHaveProperty('SAMPLE_RATE');
      expect(AUDIO_SETTINGS).toHaveProperty('CHANNELS');
      expect(AUDIO_SETTINGS).toHaveProperty('BIT_DEPTH');
      expect(AUDIO_SETTINGS).toHaveProperty('FILE_FORMAT');
    });

    it('should have the correct values', () => {
      expect(AUDIO_SETTINGS.SAMPLE_RATE).toBe(44100);
      expect(AUDIO_SETTINGS.CHANNELS).toBe(1);
      expect(AUDIO_SETTINGS.BIT_DEPTH).toBe(16);
      expect(AUDIO_SETTINGS.FILE_FORMAT).toBe('wav');
    });
  });

  describe('UI_CONSTANTS', () => {
    it('should be defined', () => {
      expect(UI_CONSTANTS).toBeDefined();
      expect(typeof UI_CONSTANTS).toBe('object');
    });

    it('should have the required properties', () => {
      expect(UI_CONSTANTS).toHaveProperty('POPUP_WIDTH');
      expect(UI_CONSTANTS).toHaveProperty('POPUP_HEIGHT');
      expect(UI_CONSTANTS).toHaveProperty('MAIN_WINDOW_WIDTH');
      expect(UI_CONSTANTS).toHaveProperty('MAIN_WINDOW_HEIGHT');
    });

    it('should have the correct values', () => {
      expect(UI_CONSTANTS.POPUP_WIDTH).toBe(400);
      expect(UI_CONSTANTS.POPUP_HEIGHT).toBe(200);
      expect(UI_CONSTANTS.MAIN_WINDOW_WIDTH).toBe(800);
      expect(UI_CONSTANTS.MAIN_WINDOW_HEIGHT).toBe(600);
    });
  });
});
