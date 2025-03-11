# Schema Design Document

This document outlines the data structures used in the macOS Dictation App. While the initial implementation uses simple text file storage, this schema design provides a foundation for potential future database integration.

## Current Implementation: File-Based Storage

### Settings Storage

Settings are stored using Electron Store, which persists data as JSON in a configuration file.

```typescript
interface AppSettings {
  // Audio settings
  preferredMicrophone: string;
  audioQuality: 'low' | 'medium' | 'high';
  
  // Shortcut settings
  shortcutKey: string;
  shortcutMode: 'toggle' | 'hold';
  
  // Transcription settings
  defaultLanguage: string;
  enableTranslation: boolean;
  translationTarget: string;
  
  // UI settings
  popupSize: 'small' | 'medium' | 'large';
  popupOpacity: number; // 0.0 to 1.0
  theme: 'light' | 'dark' | 'system';
  
  // Groq API settings
  apiKey: string;
  model: string;
  temperature: number;
}
```

### Transcription History Storage

Transcriptions are stored in a text file with the following format:

```
[TIMESTAMP] | [DURATION] | [APP_NAME] | [TRANSCRIPTION_TEXT]
```

Example:
```
2023-06-15T14:32:45Z | 00:00:12 | TextEdit | This is a sample transcription.
2023-06-15T15:10:22Z | 00:00:05 | Safari | Remember to check the website later.
```

## Future Database Schema Design

For future scalability, the following database schema is proposed:

### Users Table

```typescript
interface User {
  id: string;              // Primary key, UUID
  name: string;            // User's name
  email: string;           // User's email (optional)
  createdAt: Date;         // Account creation timestamp
  settings: UserSettings;  // JSON blob of user settings
}
```

### Settings Table

```typescript
interface UserSettings {
  id: string;              // Primary key, UUID
  userId: string;          // Foreign key to Users table
  preferredMicrophone: string;
  shortcutKey: string;
  shortcutMode: 'toggle' | 'hold';
  defaultLanguage: string;
  enableTranslation: boolean;
  translationTarget: string;
  popupSize: 'small' | 'medium' | 'large';
  popupOpacity: number;
  theme: 'light' | 'dark' | 'system';
  updatedAt: Date;         // Last updated timestamp
}
```

### Transcriptions Table

```typescript
interface Transcription {
  id: string;              // Primary key, UUID
  userId: string;          // Foreign key to Users table
  timestamp: Date;         // When the transcription was created
  duration: number;        // Duration in seconds
  sourceApplication: string; // Application where transcription was inserted
  text: string;            // The transcribed text
  language: string;        // Source language
  translated: boolean;     // Whether this was translated
  translationTarget: string; // Target language if translated
  audioQuality: {          // Metadata about the audio quality
    avgLogprob: number;    // Average log probability
    noSpeechProb: number;  // No speech probability
    compressionRatio: number; // Compression ratio
  };
  model: string;           // Model used for transcription
  tags: string[];          // Optional user-defined tags
}
```

### Audio Files Table (Future Consideration)

```typescript
interface AudioFile {
  id: string;              // Primary key, UUID
  transcriptionId: string; // Foreign key to Transcriptions table
  filePath: string;        // Path to stored audio file
  format: string;          // Audio format (e.g., 'wav', 'mp3')
  sizeBytes: number;       // File size in bytes
  duration: number;        // Duration in seconds
  createdAt: Date;         // When the file was created
}
```

## Data Relationships

- One User has many Transcriptions (1:N)
- One User has one Settings record (1:1)
- One Transcription may have one AudioFile (1:1, optional)

## Data Flow

1. **Settings Flow**:
   - User changes settings in the UI
   - Settings are validated
   - Settings are saved to Electron Store
   - Settings are loaded on application startup

2. **Transcription Flow**:
   - Audio is recorded and sent to Groq API
   - Transcription result is received
   - Text is inserted into active application
   - Transcription record is created and saved
   - Transcription history is updated

## Data Migration Strategy

When transitioning from file-based storage to a database in the future:

1. Parse existing transcription text file into structured data
2. Import into the new database schema
3. Maintain backward compatibility during transition period
4. Provide data export/import functionality for users

## Security Considerations

Even for personal use applications, basic security measures are implemented:

1. API keys are stored securely using OS keychain when possible
2. Sensitive data is not logged in plain text
3. File permissions are set appropriately for transcription history files

## Performance Considerations

1. Pagination for transcription history when it grows large
2. Indexing on timestamp and tags fields for quick filtering
3. Potential archiving strategy for old transcriptions 