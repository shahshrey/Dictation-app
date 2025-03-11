import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const unsubscribeToggleRecording = window.electronAPI.onToggleRecording(() => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    });
    
    // Set up event listener for recording source selected
    const unsubscribeRecordingSourceSelected = window.electronAPI.onRecordingSourceSelected((sourceId) => {
      setSelectedSourceId(sourceId);
      startMediaRecorder(sourceId);
    });
    
    return () => {
      unsubscribeToggleRecording();
      unsubscribeRecordingSourceSelected();
    };
  }, [isRecording]);
  
  // Refresh audio sources
  const refreshAudioSources = async (): Promise<void> => {
    try {
      const sources = await window.electronAPI.getAudioSources();
      setAudioSources(sources);
      
      // Select the first source if none is selected
      if (sources.length > 0 && !selectedSourceId) {
        setSelectedSourceId(sources[0].id);
      }
    } catch (error) {
      console.error('Failed to get audio sources:', error);
    }
  };
  
  // Refresh recent files
  const refreshRecentFiles = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.getRecentTranscriptions();
      if (result.success) {
        setRecentFiles(result.files);
      }
    } catch (error) {
      console.error('Failed to get recent files:', error);
    }
  };
  
  // Start media recorder
  const startMediaRecorder = async (sourceId: string): Promise<void> => {
    try {
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
        const result = await window.electronAPI.saveRecording(arrayBuffer);
        if (result.success) {
          console.log('Recording saved:', result.filePath);
        }
      };
      
      recorder.start();
      setIsRecording(true);
      setAudioChunks([]);
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
        await window.electronAPI.startRecording(selectedSourceId);
        
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
      await window.electronAPI.stopRecording();
      
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };
  
  // Transcribe recording
  const transcribeRecording = async (language?: string): Promise<void> => {
    try {
      const filePath = await window.electronAPI.getRecordingPath();
      const result = await window.electronAPI.transcribeAudio(filePath, { language });
      
      if (result.success) {
        setCurrentTranscription({
          text: result.text,
          language: result.language,
          timestamp: new Date()
        });
      } else {
        console.error('Failed to transcribe audio:', result.error);
      }
    } catch (error) {
      console.error('Failed to transcribe recording:', error);
    }
  };
  
  // Translate recording
  const translateRecording = async (): Promise<void> => {
    try {
      const filePath = await window.electronAPI.getRecordingPath();
      const result = await window.electronAPI.translateAudio(filePath);
      
      if (result.success) {
        setCurrentTranscription({
          text: result.text,
          language: 'en', // Translation is always to English
          timestamp: new Date()
        });
      } else {
        console.error('Failed to translate audio:', result.error);
      }
    } catch (error) {
      console.error('Failed to translate recording:', error);
    }
  };
  
  // Save transcription
  const saveTranscription = async (filename?: string): Promise<void> => {
    if (!currentTranscription) return;
    
    try {
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
    } catch (error) {
      console.error('Failed to save transcription:', error);
    }
  };
  
  // Save transcription as
  const saveTranscriptionAs = async (): Promise<void> => {
    if (!currentTranscription) return;
    
    try {
      const result = await window.electronAPI.saveTranscriptionAs(currentTranscription.text);
      
      if (result.success) {
        console.log('Transcription saved as:', result.filePath);
        refreshRecentFiles();
      } else if (!result.canceled) {
        console.error('Failed to save transcription:', result.error);
      }
    } catch (error) {
      console.error('Failed to save transcription as:', error);
    }
  };
  
  // Context value
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

// Custom hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}; 