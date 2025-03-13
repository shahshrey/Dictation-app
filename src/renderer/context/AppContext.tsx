import React, { createContext, useContext, useEffect, ReactNode, useMemo } from 'react';
import { AudioDevice, Transcription, AppSettings } from '../../shared/types';
import { useSettings } from '../hooks/useSettings';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { useRecording } from '../hooks/useRecording';
import { logger } from '../utils/logger';

// Define types for our context
interface AppContextType {
  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Recording state
  isRecording: boolean;
  recordingTime: number;

  // Audio sources
  audioDevices: AudioDevice[];
  selectedDevice: AudioDevice | null;
  setSelectedDevice: (device: AudioDevice) => void;
  refreshAudioDevices: () => Promise<void>;

  // Transcription
  currentTranscription: Transcription | null;
  setCurrentTranscription: React.Dispatch<React.SetStateAction<Transcription | null>>;
  recentTranscriptions: Transcription[];
  refreshRecentTranscriptions: () => Promise<void>;

  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcribeRecording: (language?: string) => Promise<void>;
  saveTranscription: (id: string) => Promise<void>;
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use our custom hooks
  const { settings, loadSettings, updateSettings } = useSettings();
  const { audioDevices, selectedDevice, setSelectedDevice, refreshAudioDevices } =
    useAudioDevices();
  const {
    currentTranscription,
    setCurrentTranscription,
    recentTranscriptions,
    refreshRecentTranscriptions,
    transcribeRecording,
    saveTranscription,
  } = useTranscriptions(settings);

  const { isRecording, recordingTime, startRecording, stopRecording } = useRecording({
    selectedDevice,
    autoTranscribe: settings.autoTranscribe,
    language: settings.language,
    transcribeRecording,
  });

  // Fetch audio devices and settings on component mount
  useEffect(() => {
    refreshAudioDevices();
    loadSettings().then(() => {
      logger.info('Settings loaded');
      logger.debug(`Settings: ${JSON.stringify(settings, null, 2)}`);
      logger.debug(`API key available: ${!!settings.apiKey}`);
      logger.debug(`Auto-transcribe enabled: ${settings.autoTranscribe}`);
      logger.debug(`Language setting: ${settings.language}`);
    });
    refreshRecentTranscriptions();

    // Set up event listeners for the Home key and audio device requests
    let unsubscribeToggleRecording = () => {};
    let unsubscribeAudioDevicesRequest = () => {};

    try {
      // Check if the API is available
      if (window.electronAPI && typeof window.electronAPI.onToggleRecording === 'function') {
        unsubscribeToggleRecording = window.electronAPI.onToggleRecording(() => {
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        });
      }

      // Set up listener for audio device requests from the main process
      if (window.electronAPI && typeof window.electronAPI.onAudioDevicesRequest === 'function') {
        unsubscribeAudioDevicesRequest = window.electronAPI.onAudioDevicesRequest(() => {
          // When the main process requests audio devices, refresh them
          refreshAudioDevices();
        });
      }
    } catch (error) {
      logger.exception('Error setting up event listeners', error);
    }

    return () => {
      try {
        unsubscribeToggleRecording();
        unsubscribeAudioDevicesRequest();
      } catch (error) {
        logger.exception('Error cleaning up event listeners', error);
      }
    };
  }, [isRecording]);

  // Context value - memoize to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      // Settings
      settings,
      updateSettings,

      // Recording state
      isRecording,
      recordingTime,

      // Audio devices
      audioDevices,
      selectedDevice: selectedDevice ?? null,
      setSelectedDevice,
      refreshAudioDevices,

      // Transcription
      currentTranscription,
      setCurrentTranscription,
      recentTranscriptions,
      refreshRecentTranscriptions,

      // Actions
      startRecording,
      stopRecording,
      transcribeRecording,
      saveTranscription,
    }),
    [
      settings,
      isRecording,
      recordingTime,
      audioDevices,
      selectedDevice,
      currentTranscription,
      recentTranscriptions,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

// Custom hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
