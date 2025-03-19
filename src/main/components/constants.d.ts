declare module '../main/components/constants' {
  export const TEMP_DIR: string;
  export const AUDIO_FILE_PATH: string;
  export const DEFAULT_SAVE_DIR: string;
  export const DEFAULT_SETTINGS: {
    apiKey: string;
    defaultLanguage: string;
    transcriptionModel: string;
    showNotifications: boolean;
    saveTranscriptionsAutomatically: boolean;
  };
} 