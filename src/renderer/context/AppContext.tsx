import React, { createContext, useContext, useEffect, ReactNode, useMemo } from 'react';
import { AudioDevice, Transcription, AppSettings } from '../../shared/types';
import { useSettings } from '../hooks/useSettings';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { useRecording } from '../hooks/useRecording';
import logger from '../../shared/logger';

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
  saveTranscription: (transcription: Transcription) => Promise<void>;
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
    const initializeApp = async () => {
      try {
        // Load settings first
        await loadSettings();
        logger.debug('Settings loaded');
        logger.debug(`Settings: ${JSON.stringify(settings, null, 2)}`);
        logger.debug(`API key available: ${!!settings.apiKey}`);
        logger.debug(`Auto-transcribe enabled: ${settings.autoTranscribe}`);
        logger.debug(`Language setting: ${settings.language}`);

        // Then load audio devices and transcriptions
        await refreshAudioDevices();
        await refreshRecentTranscriptions();
      } catch (error) {
        logger.exception('Error initializing app', error);
      }
    };

    initializeApp();

    // Set up event listeners for the Home key and audio device requests
    let unsubscribeToggleRecording = () => {};
    let unsubscribeAudioDevicesRequest = () => {};

    try {
      // Check if the API is available
      if (window.electronAPI && typeof window.electronAPI.onToggleRecording === 'function') {
        unsubscribeToggleRecording = window.electronAPI.onToggleRecording(() => {
          logger.debug('Toggle recording event received from main process');
          logger.debug('Current recording state:', { isRecording });
          logger.debug('Selected device:', {
            id: selectedDevice?.id,
            name: selectedDevice?.name,
          });

          if (isRecording) {
            logger.debug('Stopping recording via toggle event');
            stopRecording();
          } else {
            logger.debug('Starting recording via toggle event');

            // If no device is selected, try to use default microphone
            if (!selectedDevice) {
              logger.debug('No device selected, will attempt to use default microphone');

              // The startRecording function in useRecording will handle
              // getting permission and selecting a default device if needed
            }

            startRecording()
              .then(() => {
                logger.debug('Recording started successfully via toggle event');
              })
              .catch(error => {
                logger.exception('Failed to start recording via toggle event', error);
              });
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
  }, [isRecording, settings.apiKey]);

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
      settings.apiKey,
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
