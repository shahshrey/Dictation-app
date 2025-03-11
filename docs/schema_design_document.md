# Schema Design Document - Whisper Dictation App

Since the Whisper Dictation App doesn't use a traditional database for storing transcriptions (as per requirements), this schema design document focuses on the configuration storage and runtime data structures used within the application.

## Configuration Storage Schema

The application uses `electron-store` to persist configuration settings. This creates a JSON file on the user's system to store settings.

### Settings Schema

```json
{
  "general": {
    "startAtLogin": {
      "type": "boolean",
      "default": true,
      "description": "Launch the application when the system starts"
    },
    "showNotifications": {
      "type": "boolean",
      "default": true,
      "description": "Show notification when dictation is complete"
    }
  },
  "shortcuts": {
    "activationKey": {
      "type": "string",
      "default": "home",
      "description": "Key used to activate dictation",
      "enum": ["home", "f13", "f14", "f15", "meta+d", "alt+space"]
    },
    "modifierRequired": {
      "type": "boolean",
      "default": false,
      "description": "Whether a modifier key is required along with the activation key"
    },
    "modifierKey": {
      "type": "string",
      "default": "meta",
      "description": "Modifier key to use with activation key if required",
      "enum": ["shift", "control", "alt", "meta"]
    }
  },
  "appearance": {
    "theme": {
      "type": "string",
      "default": "system",
      "description": "UI theme preference",
      "enum": ["light", "dark", "system"]
    },
    "popupPosition": {
      "type": "string",
      "default": "top-right",
      "description": "Position of the dictation popup on the screen",
      "enum": ["top-left", "top-right", "bottom-left", "bottom-right", "center"]
    },
    "popupSize": {
      "type": "string",
      "default": "medium",
      "description": "Size of the dictation popup",
      "enum": ["small", "medium", "large"]
    }
  },
  "speech": {
    "whisperModel": {
      "type": "string",
      "default": "medium",
      "description": "Whisper model to use for speech recognition",
      "enum": ["tiny", "base", "small", "medium", "large"]
    },
    "language": {
      "type": "string",
      "default": "auto",
      "description": "Language preference for speech recognition",
      "enum": ["auto", "en", "es", "fr", "de", "it", "pt", "nl", "ja", "zh", "ru"]
    },
    "sensitivity": {
      "type": "number",
      "default": 0.5,
      "minimum": 0.1,
      "maximum": 1.0,
      "description": "Microphone sensitivity"
    },
    "useGPU": {
      "type": "boolean",
      "default": true,
      "description": "Use GPU acceleration if available"
    }
  },
  "advanced": {
    "pythonPath": {
      "type": "string",
      "default": "",
      "description": "Custom path to Python executable (leave empty for auto-detection)"
    },
    "debugMode": {
      "type": "boolean",
      "default": false,
      "description": "Enable detailed logging for troubleshooting"
    },
    "audioFormat": {
      "type": "string",
      "default": "wav",
      "description": "Format for audio recordings",
      "enum": ["wav", "mp3", "ogg"]
    },
    "sampleRate": {
      "type": "number",
      "default": 16000,
      "description": "Audio sample rate in Hz",
      "enum": [8000, 16000, 22050, 44100, 48000]
    },
    "tempDir": {
      "type": "string",
      "default": "",
      "description": "Custom directory for temporary audio files (leave empty for system default)"
    }
  }
}
```

## Runtime Data Structures

These structures represent the in-memory data used during application operation.

### Audio Recording State

```typescript
interface AudioRecordingState {
  isRecording: boolean;
  startTime: number | null;
  duration: number;
  audioBuffer: ArrayBuffer | null;
  volumeLevel: number;
}
```

### Dictation State

```typescript
interface DictationState {
  status: 'idle' | 'listening' | 'processing' | 'inserting';
  text: string;
  confidence: number;
  errorMessage?: string;
  processingStartTime?: number;
  processingDuration?: number;
  model?: string;
  language?: string;
  audioFilePath?: string;
}
```

### Python Process State

```typescript
interface PythonProcessState {
  isRunning: boolean;
  processId: number | null;
  startTime: number | null;
  stderr: string;
  stdout: string;
  exitCode: number | null;
  modelLoaded: string | null;
}
```

### UI State

```typescript
interface UIState {
  isVisible: boolean;
  position: {
    x: number;
    y: number;
  };
  theme: 'light' | 'dark' | 'system';
  animationState: 'enter' | 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'exit';
}
```

## Data Flow

The application doesn't maintain persistent storage for transcriptions, but data flows through the system as follows:

1. **Audio Capture**:
   - Audio is captured from the system microphone
   - Stored temporarily in memory (AudioRecordingState)
   - Saved to a temporary file for processing by Whisper

2. **Transcription Processing**:
   - Temporary audio file path is passed to Python script
   - Python loads Whisper model and processes audio
   - Transcribed text is returned via standard output
   - Temporary file is deleted after processing

3. **Text Insertion**:
   - Transcribed text is inserted at the current cursor position
   - No persistent storage of the transcription occurs

4. **Configuration**:
   - User preferences are stored in the system using electron-store
   - Loaded at application startup
   - Persisted when changes are made

## Security Considerations

While the application doesn't store sensitive data long-term, the following security considerations apply:

1. **Audio Data**: Temporarily stored in memory and as a file, then discarded after processing
2. **Configuration Data**: Stored locally on the user's system (not containing sensitive information)
3. **No Network Transmission**: All processing occurs locally through Python and the Whisper model
4. **Temporary Files**: Audio files are stored in the system's temporary directory and cleaned up after processing

## Schema Evolution Strategy

As this is a personal-use application with simple storage needs, schema evolution can be handled by:

1. Including a version number in the configuration schema
2. Implementing migration logic for settings when versions change
3. Providing defaults for any new settings to ensure backward compatibility 