# Frontend Codebase Document

This document outlines the architecture and implementation details of the frontend codebase for the macOS Dictation App. The frontend is built using React with TypeScript and follows modern best practices for Electron renderer process development.

## Architecture Overview

The frontend follows a component-based architecture with React, emphasizing:
- Functional components with hooks
- Context API for state management
- Separation of concerns
- Reusable UI components
- Material Design principles

## Component Structure

### Core Components

#### App Component

The root component that initializes the application and provides context providers:

```tsx
// src/renderer/App.tsx
import React, { Suspense } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { DictationProvider } from './contexts/DictationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import DictationPopup from './components/DictationPopup';
import LoadingFallback from './components/common/LoadingFallback';

const Settings = React.lazy(() => import('./components/Settings'));
const History = React.lazy(() => import('./components/History'));

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <DictationProvider>
          <div className="app-container">
            <DictationPopup />
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
              <History />
            </Suspense>
          </div>
        </DictationProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;
```

#### DictationPopup Component

The main UI component that appears during dictation:

```tsx
// src/renderer/components/DictationPopup/index.tsx
import React, { useEffect, useState } from 'react';
import { useDictation } from '../../contexts/DictationContext';
import Waveform from './Waveform';
import { PopupContainer, StatusText, RecordButton } from './styles';

const DictationPopup: React.FC = () => {
  const { 
    isRecording, 
    isProcessing, 
    startRecording, 
    stopRecording,
    audioData
  } = useDictation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show popup when recording or processing
    if (isRecording || isProcessing) {
      setVisible(true);
    } else {
      // Hide popup after a delay when finished
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecording, isProcessing]);

  if (!visible) return null;

  return (
    <PopupContainer>
      <RecordButton 
        active={isRecording}
        onClick={isRecording ? stopRecording : startRecording}
      />
      <Waveform audioData={audioData} isActive={isRecording} />
      <StatusText>
        {isRecording ? 'Listening...' : isProcessing ? 'Processing...' : 'Complete'}
      </StatusText>
    </PopupContainer>
  );
};

export default DictationPopup;
```

#### Waveform Component

Visualizes audio input during recording:

```tsx
// src/renderer/components/DictationPopup/Waveform.tsx
import React, { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { WaveformContainer } from './styles';
import { THEME_COLORS } from '../../styles/theme';

interface WaveformProps {
  audioData: Float32Array | null;
  isActive: boolean;
}

const Waveform: React.FC<WaveformProps> = ({ audioData, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (containerRef.current && !wavesurferRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: THEME_COLORS.primary.light,
        progressColor: THEME_COLORS.primary.main,
        cursorWidth: 0,
        height: 40,
        barWidth: 2,
        barGap: 1,
        responsive: true,
      });
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (wavesurferRef.current && audioData) {
      // Update waveform with new audio data
      wavesurferRef.current.loadDecodedBuffer(createAudioBuffer(audioData));
    }
  }, [audioData]);

  // Helper function to create AudioBuffer from Float32Array
  const createAudioBuffer = (data: Float32Array): AudioBuffer => {
    const audioContext = new AudioContext();
    const buffer = audioContext.createBuffer(1, data.length, audioContext.sampleRate);
    buffer.getChannelData(0).set(data);
    return buffer;
  };

  return (
    <WaveformContainer 
      ref={containerRef} 
      className={isActive ? 'active' : ''}
    />
  );
};

export default Waveform;
```

### Context Providers

#### DictationContext

Manages the state and logic for dictation functionality:

```tsx
// src/renderer/contexts/DictationContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useGroq } from '../hooks/useGroq';
import { useSettings } from './SettingsContext';
import { insertText } from '../utils/ipc';

interface DictationContextType {
  isRecording: boolean;
  isProcessing: boolean;
  audioData: Float32Array | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  error: string | null;
}

const DictationContext = createContext<DictationContextType | undefined>(undefined);

export const DictationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { 
    startRecording: startAudioRecording, 
    stopRecording: stopAudioRecording,
    audioData
  } = useAudio();
  const { transcribeAudio } = useGroq();

  // Register global shortcut
  useEffect(() => {
    const handleShortcut = async (event: KeyboardEvent) => {
      if (event.key === 'Home') {
        if (settings.shortcutMode === 'toggle') {
          if (isRecording) {
            await stopRecording();
          } else {
            await startRecording();
          }
        } else if (settings.shortcutMode === 'hold') {
          if (event.type === 'keydown' && !isRecording) {
            await startRecording();
          } else if (event.type === 'keyup' && isRecording) {
            await stopRecording();
          }
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    window.addEventListener('keyup', handleShortcut);

    return () => {
      window.removeEventListener('keydown', handleShortcut);
      window.removeEventListener('keyup', handleShortcut);
    };
  }, [isRecording, settings.shortcutMode]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);
      await startAudioRecording(settings.preferredMicrophone);
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
    }
  }, [settings.preferredMicrophone, startAudioRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      const audioBuffer = await stopAudioRecording();
      
      // Process with Groq API
      const result = await transcribeAudio(audioBuffer, {
        model: settings.model,
        language: settings.defaultLanguage,
        temperature: settings.temperature,
      });
      
      // Insert text into active application
      if (result.text) {
        await insertText(result.text);
      }
      
      setIsProcessing(false);
    } catch (err) {
      setError(`Failed to process recording: ${err.message}`);
      setIsProcessing(false);
    }
  }, [isRecording, settings, stopAudioRecording, transcribeAudio]);

  const value = {
    isRecording,
    isProcessing,
    audioData,
    startRecording,
    stopRecording,
    error
  };

  return (
    <DictationContext.Provider value={value}>
      {children}
    </DictationContext.Provider>
  );
};

export const useDictation = (): DictationContextType => {
  const context = useContext(DictationContext);
  if (context === undefined) {
    throw new Error('useDictation must be used within a DictationProvider');
  }
  return context;
};
```

#### SettingsContext

Manages application settings:

```tsx
// src/renderer/contexts/SettingsContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/ipc';

interface Settings {
  preferredMicrophone: string;
  shortcutKey: string;
  shortcutMode: 'toggle' | 'hold';
  defaultLanguage: string;
  enableTranslation: boolean;
  translationTarget: string;
  popupSize: 'small' | 'medium' | 'large';
  popupOpacity: number;
  theme: 'light' | 'dark' | 'system';
  apiKey: string;
  model: string;
  temperature: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  preferredMicrophone: 'default',
  shortcutKey: 'Home',
  shortcutMode: 'toggle',
  defaultLanguage: 'en',
  enableTranslation: false,
  translationTarget: 'en',
  popupSize: 'medium',
  popupOpacity: 0.9,
  theme: 'system',
  apiKey: '',
  model: 'whisper-large-v3-turbo',
  temperature: 0.0
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getSettings();
        setSettings({ ...defaultSettings, ...savedSettings });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
```

### Custom Hooks

#### useAudio Hook

Manages audio recording functionality:

```tsx
// src/renderer/hooks/useAudio.ts
import { useState, useCallback } from 'react';
import { getAudioDevices, startRecording, stopRecording } from '../utils/ipc';

export const useAudio = () => {
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; label: string }>>([]);
  
  const loadDevices = useCallback(async () => {
    try {
      const availableDevices = await getAudioDevices();
      setDevices(availableDevices);
      return availableDevices;
    } catch (error) {
      console.error('Failed to load audio devices:', error);
      throw error;
    }
  }, []);

  const startAudioRecording = useCallback(async (deviceId: string) => {
    try {
      await startRecording(deviceId);
      setAudioData(new Float32Array()); // Initialize empty audio data
      
      // Set up visualization data updates
      const updateVisualization = () => {
        // This would be implemented with actual audio data in a real app
        // For now, we'll simulate with random data
        if (audioData) {
          const newData = new Float32Array(1024);
          for (let i = 0; i < newData.length; i++) {
            newData[i] = Math.random() * 2 - 1;
          }
          setAudioData(newData);
        }
      };
      
      const interval = setInterval(updateVisualization, 100);
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [audioData]);

  const stopAudioRecording = useCallback(async () => {
    try {
      const buffer = await stopRecording();
      setAudioData(null);
      return buffer;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }, []);

  return {
    audioData,
    devices,
    loadDevices,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording
  };
};
```

#### useGroq Hook

Manages Groq API integration:

```tsx
// src/renderer/hooks/useGroq.ts
import { useCallback } from 'react';
import { processTranscription, processTranslation } from '../utils/ipc';

interface TranscriptionOptions {
  model?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

interface TranslationOptions {
  model?: string;
  prompt?: string;
  temperature?: number;
}

export const useGroq = () => {
  const transcribeAudio = useCallback(async (
    audioBuffer: Buffer,
    options?: TranscriptionOptions
  ) => {
    try {
      return await processTranscription(audioBuffer, options);
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }, []);

  const translateAudio = useCallback(async (
    audioBuffer: Buffer,
    options?: TranslationOptions
  ) => {
    try {
      return await processTranslation(audioBuffer, options);
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  }, []);

  return {
    transcribeAudio,
    translateAudio
  };
};
```

## Styling Approach

The application uses a combination of Tailwind CSS for utility classes and styled components for component-specific styling, all adhering to Material Design principles.

### Theme Configuration

```tsx
// src/styles/theme.ts
export const THEME_COLORS = {
  primary: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#f50057',
    light: '#ff4081',
    dark: '#c51162',
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
    dark: '#121212',
    darkPaper: '#1e1e1e',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    primaryDark: 'rgba(255, 255, 255, 0.87)',
    secondaryDark: 'rgba(255, 255, 255, 0.6)',
    disabledDark: 'rgba(255, 255, 255, 0.38)',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
};

export const createTheme = (mode: 'light' | 'dark') => ({
  colors: THEME_COLORS,
  mode,
  spacing: (factor: number) => `${factor * 8}px`,
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 4,
  },
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
});
```

### Component Styling

```tsx
// src/renderer/components/DictationPopup/styles.ts
import styled from 'styled-components';
import { THEME_COLORS } from '../../../styles/theme';

export const PopupContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? THEME_COLORS.background.darkPaper : THEME_COLORS.background.paper};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: all 0.3s ${({ theme }) => theme.transitions.easing.easeInOut};
`;

export const StatusText = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  font-size: 14px;
  color: ${({ theme }) => 
    theme.mode === 'dark' ? THEME_COLORS.text.primaryDark : THEME_COLORS.text.primary};
  margin-top: 12px;
`;

export const RecordButton = styled.button<{ active: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: ${({ active }) => 
    active ? THEME_COLORS.error.main : THEME_COLORS.primary.main};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.2s ${({ theme }) => theme.transitions.easing.easeInOut};
  
  &:hover {
    background-color: ${({ active }) => 
      active ? THEME_COLORS.error.dark : THEME_COLORS.primary.dark};
  }
  
  &:before {
    content: '';
    display: block;
    width: ${({ active }) => active ? '16px' : '24px'};
    height: ${({ active }) => active ? '16px' : '24px'};
    background-color: white;
    border-radius: ${({ active }) => active ? '2px' : '12px'};
  }
`;

export const WaveformContainer = styled.div`
  width: 100%;
  height: 40px;
  margin: 8px 0;
  
  &.active {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.6;
    }
  }
`;
```

## State Management

The application uses React's Context API for state management, with separate contexts for:

1. **DictationContext**: Manages recording state, audio processing, and transcription
2. **SettingsContext**: Manages user preferences and application settings
3. **ThemeContext**: Manages theme settings (light/dark mode)

This approach provides a clean separation of concerns while avoiding the complexity of external state management libraries.

## Performance Optimizations

Several performance optimizations are implemented:

1. **Code Splitting**: Using React.lazy and Suspense for component loading
2. **Memoization**: Using React.memo, useCallback, and useMemo to prevent unnecessary re-renders
3. **Efficient Rendering**: Optimizing component updates with proper dependency arrays
4. **Lazy Loading**: Loading non-critical components only when needed

## Accessibility Considerations

The application implements several accessibility features:

1. **Keyboard Navigation**: Full keyboard support for all interactions
2. **Screen Reader Support**: Proper ARIA attributes and semantic HTML
3. **Color Contrast**: Meeting WCAG AA standards for text contrast
4. **Focus Management**: Proper focus handling for keyboard users

## Testing Strategy

The frontend components are tested using:

1. **Unit Tests**: Testing individual components and hooks
2. **Integration Tests**: Testing component interactions
3. **End-to-End Tests**: Testing the complete application flow

## Conclusion

The frontend architecture follows modern React best practices with a focus on:
- Component-based design
- Clean separation of concerns
- Type safety with TypeScript
- Material Design principles
- Accessibility and performance
- Maintainable and scalable code structure 