import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AudioDevice, Transcription, AppSettings, IPC_CHANNELS } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { rendererLogger } from '../../shared/preload-logger';

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
      rendererLogger.exception(error as Error, 'Error setting up event listeners');
    }
    
    return () => {
      try {
        unsubscribeToggleRecording();
        unsubscribeAudioDevicesRequest();
      } catch (error) {
        rendererLogger.exception(error as Error, 'Error cleaning up event listeners');
      }
    };
  }, [isRecording]);
  
  // Load settings from storage
  const loadSettings = async (): Promise<void> => {
    try {
      // First try to get settings from the main settings store
      if (window.electronAPI && typeof window.electronAPI.getSettings === 'function') {
        const loadedSettings = await window.electronAPI.getSettings();
        setSettings(loadedSettings || DEFAULT_SETTINGS);
      }
      
      // Then try to get the Groq API key specifically (this will override the one from settings)
      if (window.electronAPI && typeof window.electronAPI.getGroqApiKey === 'function') {
        const result = await window.electronAPI.getGroqApiKey();
        if (result.success && result.apiKey) {
          setSettings(prevSettings => ({
            ...prevSettings,
            apiKey: result.apiKey
          }));
        }
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to load settings');
    }
  };
  
  // Update settings
  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Save to the main settings store
      if (window.electronAPI && typeof window.electronAPI.saveSettings === 'function') {
        await window.electronAPI.saveSettings(updatedSettings);
      }
      
      // If the API key is being updated, also save it specifically
      if (newSettings.apiKey !== undefined && window.electronAPI && typeof window.electronAPI.saveGroqApiKey === 'function') {
        await window.electronAPI.saveGroqApiKey(newSettings.apiKey);
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to update settings');
    }
  };
  
  // Refresh audio devices
  const refreshAudioDevices = async (): Promise<void> => {
    try {
      // Use the Web Audio API to enumerate devices directly in the renderer
      const devices: AudioDevice[] = [];
      
      // Get all media devices
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio input devices (microphones)
      const audioInputDevices = mediaDevices.filter(device => device.kind === 'audioinput');
      
      // Map to our AudioDevice type
      for (const device of audioInputDevices) {
        devices.push({
          id: device.deviceId,
          name: device.label || `Microphone ${devices.length + 1}`,
          isDefault: device.deviceId === 'default' || device.deviceId === ''
        });
      }
      
      // If no devices have labels, we need to request permission first
      if (devices.length > 0 && devices.every(d => !d.name || d.name.startsWith('Microphone '))) {
        try {
          // Request microphone access to get device labels
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately after getting labels
          stream.getTracks().forEach(track => track.stop());
          
          // Try enumerating again to get labels
          const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
          const audioInputDevicesWithLabels = devicesWithLabels.filter(device => device.kind === 'audioinput');
          
          // Clear and refill the devices array
          devices.length = 0;
          for (const device of audioInputDevicesWithLabels) {
            devices.push({
              id: device.deviceId,
              name: device.label || `Microphone ${devices.length + 1}`,
              isDefault: device.deviceId === 'default' || device.deviceId === ''
            });
          }
        } catch (err) {
          rendererLogger.exception(err as Error, 'Failed to get microphone permission');
        }
      }
      
      // Update state with the devices
      setAudioDevices(devices);
      
      // Select the default device if none is selected
      if (devices.length > 0 && !selectedDevice) {
        const defaultDevice = devices.find(d => d.isDefault) || devices[0];
        setSelectedDevice(defaultDevice);
      }
      
      // Send the devices back to the main process
      if (window.electronAPI && typeof window.electronAPI.sendAudioDevicesResult === 'function') {
        window.electronAPI.sendAudioDevicesResult(devices);
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to get audio devices');
    }
  };
  
  // Refresh recent transcriptions
  const refreshRecentTranscriptions = async (): Promise<void> => {
    try {
      rendererLogger.debug('Refreshing recent transcriptions');
      
      if (window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function') {
        try {
          const transcriptions = await window.electronAPI.getTranscriptions();
          
          // Only update if we actually got transcriptions
          if (Array.isArray(transcriptions) && transcriptions.length > 0) {
            setRecentTranscriptions(transcriptions);
          } else if (!transcriptions || transcriptions.length === 0) {
            rendererLogger.debug('No transcriptions received, trying fallback method');
            // Try the fallback method if no transcriptions were found
            if (window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function') {
              const result = await window.electronAPI.getRecentTranscriptions();
              if (result && result.success && Array.isArray(result.files) && result.files.length > 0) {
                const fallbackTranscriptions = result.files.map(file => ({
                  id: file.name.replace(/\.txt$/, ''),
                  text: '', // We don't have the content here
                  timestamp: file.modifiedAt instanceof Date ? file.modifiedAt.getTime() : 
                           file.createdAt instanceof Date ? file.createdAt.getTime() : 
                           Date.now(),
                  duration: 0,
                  language: 'en'
                }));
                setRecentTranscriptions(fallbackTranscriptions);
              }
            }
          } else {
            setRecentTranscriptions([]);
          }
        } catch (error) {
          rendererLogger.exception(error as Error, 'Failed to get recent transcriptions');
        }
      } else if (window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function') {
        rendererLogger.debug('Using getRecentTranscriptions fallback method');
        try {
          const result = await window.electronAPI.getRecentTranscriptions();
          if (result && result.success && Array.isArray(result.files)) {
            // Convert file objects to transcription objects
            const transcriptions = result.files.map(file => ({
              id: file.name.replace(/\.txt$/, ''),
              text: '', // We don't have the content here
              timestamp: file.modifiedAt instanceof Date ? file.modifiedAt.getTime() : 
                         file.createdAt instanceof Date ? file.createdAt.getTime() : 
                         Date.now(),
              duration: 0,
              language: 'en'
            }));
            setRecentTranscriptions(transcriptions);
          } else {
            rendererLogger.warn('getRecentTranscriptions returned invalid data');
            setRecentTranscriptions([]);
          }
        } catch (error) {
          rendererLogger.exception(error as Error, 'Failed to get recent transcriptions (fallback)');
        }
      } else {
        rendererLogger.warn('Transcription API not available');
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to get recent transcriptions');
    }
  };
  
  // Handle recording complete
  function handleRecordingComplete(audioBlob: Blob): void {
    try {
      rendererLogger.debug('Recording complete', { size: audioBlob.size, type: audioBlob.type });
      
      if (audioBlob.size === 0) {
        rendererLogger.error('Empty audio blob received');
        return;
      }
      
      // Convert blob to array buffer for sending to main process
      audioBlob.arrayBuffer().then(async (arrayBuffer) => {
        rendererLogger.debug('Converted blob to array buffer', { size: arrayBuffer.byteLength });
        
        if (arrayBuffer.byteLength === 0) {
          rendererLogger.error('Empty array buffer converted from blob');
          return;
        }
        
        if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
          rendererLogger.debug('Saving recording to main process');
          const result = await window.electronAPI.saveRecording(arrayBuffer);
          
          if (result.success) {
            rendererLogger.info('Recording saved successfully', { path: result.filePath });
            // Auto-transcribe if enabled in settings
            if (settings.autoTranscribe) {
              rendererLogger.debug('Auto-transcribing recording', { language: settings.language });
              transcribeRecording(settings.language);
            } else {
              rendererLogger.debug('Auto-transcribe disabled');
            }
          } else {
            rendererLogger.error('Failed to save recording', { error: result.error });
          }
        } else {
          rendererLogger.warn('saveRecording API not available');
        }
      }).catch(error => {
        rendererLogger.exception(error as Error, 'Failed to convert blob to array buffer');
      });
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to handle recording complete');
    }
  };
  
  // Start recording
  const startRecording = async (): Promise<void> => {
    rendererLogger.info('Start recording requested in AppContext', { 
      hasSelectedDevice: !!selectedDevice,
      deviceInfo: selectedDevice ? { id: selectedDevice.id, name: selectedDevice.name } : null
    });
    
    if (selectedDevice) {
      try {
        rendererLogger.info('Calling startAudioRecording with selected device', { 
          deviceId: selectedDevice.id, 
          deviceName: selectedDevice.name 
        });
        await startAudioRecording();
        rendererLogger.info('startAudioRecording completed');
      } catch (error) {
        rendererLogger.exception(error as Error, 'Failed to start recording in AppContext');
      }
    } else {
      rendererLogger.error('No audio device selected for recording');
      // Attempt to refresh audio devices in case they weren't loaded properly
      try {
        rendererLogger.info('Attempting to refresh audio devices');
        await refreshAudioDevices();
        rendererLogger.info('Audio devices refreshed', { deviceCount: audioDevices.length });
      } catch (refreshError) {
        rendererLogger.exception(refreshError as Error, 'Failed to refresh audio devices');
      }
    }
  };
  
  // Stop recording
  const stopRecording = (): void => {
    rendererLogger.info('Stop recording requested in AppContext', { isRecording });
    try {
      stopAudioRecording();
      rendererLogger.info('stopAudioRecording called successfully');
    } catch (error) {
      rendererLogger.exception(error as Error, 'Error stopping recording in AppContext');
    }
  };
  
  // Transcribe recording
  const transcribeRecording = async (language?: string): Promise<void> => {
    try {
      rendererLogger.debug('Transcribing recording', { 
        language: language || settings.language,
        hasApiKey: !!settings.apiKey
      });
      
      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        const result = await window.electronAPI.transcribeRecording(
          language || settings.language,
          settings.apiKey
        );
        
        if (result.success) {
          rendererLogger.info('Transcription successful', { id: result.id });
          setCurrentTranscription({
            id: result.id,
            text: result.text,
            timestamp: result.timestamp,
            duration: result.duration,
            language: result.language || settings.language
          });
          
          // Refresh the list of transcriptions immediately
          await refreshRecentTranscriptions();
          
          // Add a second refresh after a delay to ensure we get the latest data
          // This helps in case the file is still being written when the first refresh happens
          setTimeout(async () => {
            await refreshRecentTranscriptions();
          }, 2000);
        } else if (result.error) {
          rendererLogger.error('Transcription error', { error: result.error });
          // You could add error handling UI here
        }
      } else {
        rendererLogger.warn('transcribeRecording API not available');
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to transcribe recording');
    }
  };
  
  // Save transcription
  const saveTranscription = async (id: string): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.saveTranscription === 'function') {
        await window.electronAPI.saveTranscription(id);
        refreshRecentTranscriptions();
      } else {
        rendererLogger.warn('saveTranscription API not available');
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to save transcription');
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