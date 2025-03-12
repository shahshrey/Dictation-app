import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import '../mock-electron-api'; // Import the mock API at the top of the file
import { AudioDevice, Transcription, AppSettings, IPC_CHANNELS } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { useAudioRecording } from '../hooks/useAudioRecording';

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
  // Settings state
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Audio devices state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<AudioDevice | null>(null);
  
  // Transcription state
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);
  
  // Use our custom hook for audio recording
  const { 
    isRecording, 
    startRecording: startAudioRecording, 
    stopRecording: stopAudioRecording,
    recordingTime,
    error: recordingError
  } = useAudioRecording({
    selectedDevice: selectedDevice || undefined,
    onRecordingComplete: handleRecordingComplete
  });
  
  // Fetch audio devices and settings on component mount
  useEffect(() => {
    refreshAudioDevices();
    loadSettings();
    refreshRecentTranscriptions();
    
    // Set up event listeners for the Home key
    let unsubscribeToggleRecording = () => {};
    
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
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
    
    return () => {
      try {
        unsubscribeToggleRecording();
      } catch (error) {
        console.error('Error cleaning up event listeners:', error);
      }
    };
  }, [isRecording]);
  
  // Load settings from storage
  const loadSettings = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getSettings === 'function') {
        const loadedSettings = await window.electronAPI.getSettings();
        setSettings(loadedSettings || DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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
      console.error('Failed to update settings:', error);
    }
  };
  
  // Refresh audio devices
  const refreshAudioDevices = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getAudioDevices === 'function') {
        const devices = await window.electronAPI.getAudioDevices();
        setAudioDevices(devices);
        
        // Select the first device if none is selected
        if (devices.length > 0 && !selectedDevice) {
          setSelectedDevice(devices[0]);
        }
      } else {
        console.warn('getAudioDevices API not available');
        // Use mock data
        const mockDevices: AudioDevice[] = [
          { id: 'mock-device-1', name: 'Mock Microphone 1', isDefault: true },
          { id: 'mock-device-2', name: 'Mock Microphone 2', isDefault: false }
        ];
        setAudioDevices(mockDevices);
        setSelectedDevice(mockDevices[0]);
      }
    } catch (error) {
      console.error('Failed to get audio devices:', error);
    }
  };
  
  // Refresh recent transcriptions
  const refreshRecentTranscriptions = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function') {
        const transcriptions = await window.electronAPI.getTranscriptions();
        setRecentTranscriptions(transcriptions || []);
      } else {
        console.warn('getTranscriptions API not available');
        // Use mock data
        setRecentTranscriptions([
          { 
            id: 'mock-1',
            text: 'This is a mock transcription for testing purposes.',
            timestamp: Date.now() - 86400000, // 1 day ago
            duration: 30,
            language: 'en'
          },
          { 
            id: 'mock-2',
            text: 'Another mock transcription with different content.',
            timestamp: Date.now() - 172800000, // 2 days ago
            duration: 45,
            language: 'en'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to get recent transcriptions:', error);
    }
  };
  
  // Handle recording complete
  function handleRecordingComplete(audioBlob: Blob): void {
    try {
      // Convert blob to array buffer for sending to main process
      audioBlob.arrayBuffer().then(async (arrayBuffer) => {
        if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
          const result = await window.electronAPI.saveRecording(arrayBuffer);
          if (result.success) {
            console.log('Recording saved:', result.filePath);
            // Auto-transcribe if enabled in settings
            if (settings.autoTranscribe) {
              transcribeRecording(settings.language);
            }
          }
        } else {
          console.warn('saveRecording API not available');
        }
      });
    } catch (error) {
      console.error('Failed to handle recording complete:', error);
    }
  }
  
  // Start recording
  const startRecording = async (): Promise<void> => {
    if (selectedDevice) {
      try {
        await startAudioRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      console.error('No audio device selected');
    }
  };
  
  // Stop recording
  const stopRecording = (): void => {
    stopAudioRecording();
  };
  
  // Transcribe recording
  const transcribeRecording = async (language?: string): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        const result = await window.electronAPI.transcribeRecording(language || settings.language);
        if (result.success) {
          setCurrentTranscription({
            id: result.id,
            text: result.text,
            timestamp: result.timestamp,
            duration: result.duration,
            language: result.language || settings.language
          });
          
          // Refresh the list of transcriptions
          refreshRecentTranscriptions();
        }
      } else {
        console.warn('transcribeRecording API not available');
        // Mock transcription for testing
        setCurrentTranscription({
          id: `mock-${Date.now()}`,
          text: 'This is a mock transcription generated for testing purposes.',
          timestamp: Date.now(),
          duration: recordingTime,
          language: language || settings.language
        });
      }
    } catch (error) {
      console.error('Failed to transcribe recording:', error);
    }
  };
  
  // Save transcription
  const saveTranscription = async (id: string): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveTranscription === 'function') {
        await window.electronAPI.saveTranscription(id);
        refreshRecentTranscriptions();
      } else {
        console.warn('saveTranscription API not available');
      }
    } catch (error) {
      console.error('Failed to save transcription:', error);
    }
  };
  
  // Context value
  const contextValue: AppContextType = {
    // Settings
    settings,
    updateSettings,
    
    // Recording state
    isRecording,
    recordingTime,
    
    // Audio devices
    audioDevices,
    selectedDevice,
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
    saveTranscription
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}; 