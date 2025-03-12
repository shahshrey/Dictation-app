import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
      console.error('Error setting up event listeners:', error);
    }
    
    return () => {
      try {
        unsubscribeToggleRecording();
        unsubscribeAudioDevicesRequest();
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
          console.error('Failed to get microphone permission:', err);
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
      console.error('Failed to get audio devices:', error);
    }
  };
  
  // Refresh recent transcriptions
  const refreshRecentTranscriptions = async (): Promise<void> => {
    try {
      console.log('Attempting to refresh recent transcriptions...');
      console.log('electronAPI available:', !!window.electronAPI);
      console.log('getTranscriptions method available:', !!(window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function'));
      console.log('getRecentTranscriptions method available:', !!(window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function'));
      
      if (window.electronAPI && typeof window.electronAPI.getTranscriptions === 'function') {
        console.log('Calling getTranscriptions IPC method...');
        try {
          const transcriptions = await window.electronAPI.getTranscriptions();
          console.log('Transcriptions received:', transcriptions);
          setRecentTranscriptions(transcriptions || []);
        } catch (error) {
          console.error('Failed to get recent transcriptions:', error);
        }
      } else if (window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function') {
        console.log('Falling back to getRecentTranscriptions IPC method...');
        try {
          const result = await window.electronAPI.getRecentTranscriptions();
          console.log('Recent transcriptions result:', result);
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
            console.warn('getRecentTranscriptions returned invalid data:', result);
            setRecentTranscriptions([]);
          }
        } catch (error) {
          console.error('Failed to get recent transcriptions (fallback):', error);
        }
      } else {
        console.warn('getTranscriptions API not available');
      }
    } catch (error) {
      console.error('Failed to get recent transcriptions:', error);
    }
  };
  
  // Handle recording complete
  function handleRecordingComplete(audioBlob: Blob): void {
    try {
      console.log('Recording complete, blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        console.error('Error: Empty audio blob received');
        return;
      }
      
      // Convert blob to array buffer for sending to main process
      audioBlob.arrayBuffer().then(async (arrayBuffer) => {
        console.log('Array buffer size:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
          console.error('Error: Empty array buffer converted from blob');
          return;
        }
        
        if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
          console.log('Sending recording to main process...');
          const result = await window.electronAPI.saveRecording(arrayBuffer);
          
          if (result.success) {
            console.log('Recording saved:', result.filePath, 'size:', (result as any).size || 'unknown');
            // Auto-transcribe if enabled in settings
            if (settings.autoTranscribe) {
              console.log('Auto-transcribe enabled, transcribing with language:', settings.language);
              transcribeRecording(settings.language);
            } else {
              console.log('Auto-transcribe disabled, not transcribing automatically');
            }
          } else {
            console.error('Failed to save recording:', result.error);
          }
        } else {
          console.warn('saveRecording API not available');
        }
      }).catch(error => {
        console.error('Failed to convert blob to array buffer:', error);
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
      console.log('Attempting to transcribe recording with language:', language || settings.language);
      console.log('API key available:', !!settings.apiKey);
      console.log('transcribeRecording API available:', !!(window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function'));
      
      if (window.electronAPI && typeof window.electronAPI.transcribeRecording === 'function') {
        console.log('Calling transcribeRecording IPC method...');
        const result = await window.electronAPI.transcribeRecording(
          language || settings.language,
          settings.apiKey
        );
        console.log('Transcription result:', result);
        
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
        } else if (result.error) {
          console.error('Transcription error:', result.error);
          // You could add error handling UI here
        }
      } else {
        console.warn('transcribeRecording API not available');
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