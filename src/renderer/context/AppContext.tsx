import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import '../mock-electron-api'; // Import the mock API at the top of the file

// Define types for our context
interface AudioSource {
  id: string;
  name: string;
}

interface Transcription {
  text: string;
  language: string;
  timestamp: Date;
}

interface RecentFile {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

interface AppContextType {
  // Recording state
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Audio sources
  audioSources: AudioSource[];
  selectedSourceId: string;
  setSelectedSourceId: React.Dispatch<React.SetStateAction<string>>;
  refreshAudioSources: () => Promise<void>;
  
  // Transcription
  currentTranscription: Transcription | null;
  setCurrentTranscription: React.Dispatch<React.SetStateAction<Transcription | null>>;
  
  // Recent files
  recentFiles: RecentFile[];
  refreshRecentFiles: () => Promise<void>;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  transcribeRecording: (language?: string) => Promise<void>;
  translateRecording: () => Promise<void>;
  saveTranscription: (filename?: string) => Promise<void>;
  saveTranscriptionAs: () => Promise<void>;
}

// Create the context with a default value
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for recording
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // State for audio sources
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  
  // State for transcription
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  
  // State for recent files
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  
  // Fetch audio sources on component mount
  useEffect(() => {
    refreshAudioSources();
    refreshRecentFiles();
    
    // Set up event listeners for the Home key
    let unsubscribeToggleRecording = () => {};
    let unsubscribeRecordingSourceSelected = () => {};
    
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
      
      // Set up event listener for recording source selected
      if (window.electronAPI && typeof window.electronAPI.onRecordingSourceSelected === 'function') {
        unsubscribeRecordingSourceSelected = window.electronAPI.onRecordingSourceSelected((sourceId) => {
          setSelectedSourceId(sourceId);
          startMediaRecorder(sourceId);
        });
      }
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
    
    return () => {
      try {
        unsubscribeToggleRecording();
        unsubscribeRecordingSourceSelected();
      } catch (error) {
        console.error('Error cleaning up event listeners:', error);
      }
    };
  }, [isRecording]);
  
  // Refresh audio sources
  const refreshAudioSources = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getAudioSources === 'function') {
        const sources = await window.electronAPI.getAudioSources();
        setAudioSources(sources);
        
        // Select the first source if none is selected
        if (sources.length > 0 && !selectedSourceId) {
          setSelectedSourceId(sources[0].id);
        }
      } else {
        console.warn('getAudioSources API not available');
        // Use mock data
        setAudioSources([
          { id: 'mock-device-1', name: 'Mock Microphone 1' },
          { id: 'mock-device-2', name: 'Mock Microphone 2' }
        ]);
        setSelectedSourceId('mock-device-1');
      }
    } catch (error) {
      console.error('Failed to get audio sources:', error);
    }
  };
  
  // Refresh recent files
  const refreshRecentFiles = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.getRecentTranscriptions === 'function') {
        const result = await window.electronAPI.getRecentTranscriptions();
        if (result.success) {
          setRecentFiles(result.files);
        }
      } else {
        console.warn('getRecentTranscriptions API not available');
        // Use mock data
        setRecentFiles([
          { 
            name: 'Mock Transcription 1.txt', 
            path: '/mock/path/to/transcription1.txt',
            size: 1024,
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            modifiedAt: new Date(Date.now() - 86400000)
          },
          { 
            name: 'Mock Transcription 2.txt', 
            path: '/mock/path/to/transcription2.txt',
            size: 2048,
            createdAt: new Date(Date.now() - 172800000), // 2 days ago
            modifiedAt: new Date(Date.now() - 172800000)
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to get recent files:', error);
    }
  };
  
  // Start media recorder
  const startMediaRecorder = async (sourceId: string): Promise<void> => {
    try {
      // Check if we're in a browser environment that supports MediaRecorder
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // @ts-ignore - Electron specific constraint
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
            }
          }
        });
        
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioChunks((chunks) => [...chunks, event.data]);
          }
        };
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          // Save the recording
          if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
            const result = await window.electronAPI.saveRecording(arrayBuffer);
            if (result.success) {
              console.log('Recording saved:', result.filePath);
            }
          } else {
            console.warn('saveRecording API not available');
          }
        };
        
        recorder.start();
        setIsRecording(true);
        setAudioChunks([]);
      } else {
        console.warn('MediaRecorder not supported in this environment');
        // Mock recording behavior
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  // Start recording
  const startRecording = async (): Promise<void> => {
    if (selectedSourceId) {
      try {
        // Start the media recorder
        await startMediaRecorder(selectedSourceId);
        
        // Notify the main process that recording has started
        if (window.electronAPI && typeof window.electronAPI.startRecording === 'function') {
          await window.electronAPI.startRecording(selectedSourceId);
        } else {
          console.warn('startRecording API not available');
        }
        
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      console.error('No audio source selected');
    }
  };
  
  // Stop recording
  const stopRecording = async (): Promise<void> => {
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Stop all tracks in the stream
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      
      // Notify the main process that recording has stopped
      if (window.electronAPI && typeof window.electronAPI.stopRecording === 'function') {
        await window.electronAPI.stopRecording();
      } else {
        console.warn('stopRecording API not available');
      }
      
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      // Ensure recording state is reset even if there's an error
      setIsRecording(false);
    }
  };
  
  // Transcribe recording
  const transcribeRecording = async (language?: string): Promise<void> => {
    try {
      if (window.electronAPI && 
          typeof window.electronAPI.getRecordingPath === 'function' && 
          typeof window.electronAPI.transcribeAudio === 'function') {
        const filePath = await window.electronAPI.getRecordingPath();
        const result = await window.electronAPI.transcribeAudio(filePath, { language });
        
        if (result.success) {
          setCurrentTranscription({
            text: result.text || '',
            language: result.language || 'en',
            timestamp: new Date()
          });
        } else {
          console.error('Failed to transcribe audio:', result.error);
        }
      } else {
        console.warn('transcribeAudio API not available');
        // Mock transcription
        setCurrentTranscription({
          text: 'This is a mock transcription of the audio file.',
          language: language || 'en',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to transcribe recording:', error);
    }
  };
  
  // Translate recording
  const translateRecording = async (): Promise<void> => {
    try {
      if (window.electronAPI && 
          typeof window.electronAPI.getRecordingPath === 'function' && 
          typeof window.electronAPI.translateAudio === 'function') {
        const filePath = await window.electronAPI.getRecordingPath();
        const result = await window.electronAPI.translateAudio(filePath);
        
        if (result.success) {
          setCurrentTranscription({
            text: result.text || '',
            language: 'en', // Translation is always to English
            timestamp: new Date()
          });
        } else {
          console.error('Failed to translate audio:', result.error);
        }
      } else {
        console.warn('translateAudio API not available');
        // Mock translation
        setCurrentTranscription({
          text: 'This is a mock translation of the audio file.',
          language: 'en',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to translate recording:', error);
    }
  };
  
  // Save transcription
  const saveTranscription = async (filename?: string): Promise<void> => {
    if (!currentTranscription) return;
    
    try {
      if (window.electronAPI && typeof window.electronAPI.saveTranscription === 'function') {
        const result = await window.electronAPI.saveTranscription(
          currentTranscription.text,
          { filename, format: 'txt' }
        );
        
        if (result.success) {
          console.log('Transcription saved:', result.filePath);
          refreshRecentFiles();
        } else {
          console.error('Failed to save transcription:', result.error);
        }
      } else {
        console.warn('saveTranscription API not available');
        console.log('Mock: Transcription would be saved as:', filename || 'transcription.txt');
      }
    } catch (error) {
      console.error('Failed to save transcription:', error);
    }
  };
  
  // Save transcription as
  const saveTranscriptionAs = async (): Promise<void> => {
    if (!currentTranscription) return;
    
    try {
      if (window.electronAPI && typeof window.electronAPI.saveTranscriptionAs === 'function') {
        const result = await window.electronAPI.saveTranscriptionAs(currentTranscription.text);
        
        if (result.success) {
          console.log('Transcription saved as:', result.filePath);
          refreshRecentFiles();
        } else if (result.canceled) {
          console.log('Save dialog canceled');
        } else {
          console.error('Failed to save transcription:', result.error);
        }
      } else {
        console.warn('saveTranscriptionAs API not available');
        console.log('Mock: Save dialog would be shown');
      }
    } catch (error) {
      console.error('Failed to save transcription as:', error);
    }
  };
  
  // Create the context value
  const contextValue: AppContextType = {
    isRecording,
    setIsRecording,
    audioSources,
    selectedSourceId,
    setSelectedSourceId,
    refreshAudioSources,
    currentTranscription,
    setCurrentTranscription,
    recentFiles,
    refreshRecentFiles,
    startRecording,
    stopRecording,
    transcribeRecording,
    translateRecording,
    saveTranscription,
    saveTranscriptionAs,
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