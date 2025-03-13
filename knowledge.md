# Dictation App Knowledge Base

## Overview

The Dictation app is an Electron-based desktop application that provides speech-to-text functionality with the ability to insert transcribed text at the cursor position in any application on macOS. The app uses the Groq API for transcription and RobotJS for simulating keyboard input to insert text at the cursor position.

## Architecture

The app follows a standard Electron architecture with:

1. **Main Process**: Handles system-level operations, IPC communication, and window management
2. **Renderer Process**: Manages the UI and user interactions
3. **Preload Scripts**: Bridge between main and renderer processes with secure IPC communication

## Key Features

- Audio recording from selected microphone
- Transcription using Groq API
- Floating popup UI for controlling recording
- Global hotkey (default: Home key) to toggle recording
- Automatic insertion of transcribed text at cursor position
- Settings management
- Transcription history

## Core Functionality

### Recording and Transcription Flow

1. User presses global hotkey (Home key by default)
2. App shows floating popup and starts recording
3. User speaks into microphone
4. User presses hotkey again to stop recording
5. Audio is saved to temporary file
6. Audio is sent to Groq API for transcription
7. Transcribed text is saved to history
8. If enabled, transcribed text is inserted at cursor position

### Text Insertion at Cursor

The app uses RobotJS to simulate keyboard input, inserting the transcribed text at the current cursor position in any application. This works by:

1. Getting the current mouse position
2. Using RobotJS to type the text at the current cursor position
3. Restoring the mouse position

A fallback method using clipboard is also implemented:
1. Saving the current clipboard content
2. Setting the clipboard to the transcribed text
3. Simulating Cmd+V to paste
4. Restoring the original clipboard content

## Key Files and Their Paths

### Main Process

- **`src/main/index.js`**: Main entry point for the Electron app
  - Sets up windows, IPC handlers, global shortcuts
  - Manages app lifecycle
  - Handles permissions

- **`src/main/preload.js`**: Preload script for secure IPC communication
  - Exposes a limited API to the renderer process
  - Bridges main and renderer processes

- **`src/main/services/cursor.ts`**: Handles text insertion at cursor position
  - Implements direct typing via RobotJS
  - Implements clipboard-based fallback method

- **`src/main/services/audio.ts`**: Handles audio recording functionality
  - Manages audio devices
  - Handles recording and saving audio files

- **`src/main/services/groq.ts`**: Handles communication with Groq API
  - Manages API key and authentication
  - Handles transcription and translation requests

- **`src/main/services/storage.ts`**: Handles file storage operations
  - Manages transcription history
  - Handles saving and loading settings

### Renderer Process

- **`src/renderer/index.tsx`**: Main renderer entry point
  - Sets up React app
  - Renders main UI

- **`src/renderer/popup.tsx`**: Popup window renderer
  - Renders floating recording control UI

- **`src/renderer/context/AppContext.tsx`**: React context for app state
  - Manages global app state
  - Provides methods for recording, transcription, and text insertion
  - Handles settings and device management

- **`src/renderer/components/features/dictation/DictationPopup/index.tsx`**: Popup UI component
  - Displays recording status
  - Provides controls for recording

- **`src/renderer/components/features/settings/SettingsPanel.tsx`**: Settings UI component
  - Allows configuration of app settings
  - Includes toggle for cursor insertion feature

- **`src/renderer/hooks/useAudioRecording.ts`**: Custom hook for audio recording
  - Manages recording state
  - Handles audio capture

### Shared Code

- **`src/shared/types/index.ts`**: Shared TypeScript interfaces
  - Defines common types used across main and renderer processes

- **`src/shared/constants.ts`**: Shared constants
  - Defines default settings
  - Defines language options

- **`src/shared/logger.ts`**: Logging utility
  - Provides consistent logging across main and renderer processes

- **`src/renderer/types/electron.d.ts`**: TypeScript definitions for Electron API
  - Defines the ElectronAPI interface exposed to the renderer

### Build System

- **`compile.js`**: Build script
  - Compiles TypeScript files
  - Processes CSS with Tailwind
  - Bundles renderer code
  - Builds shared modules and main process services

- **`webpack.main.config.js`**: Webpack configuration for main process
- **`webpack.renderer.config.js`**: Webpack configuration for renderer process
- **`forge.config.js`**: Electron Forge configuration for packaging

## Data Flow

### Recording Flow

1. User presses global hotkey (Home key)
2. Main process (`index.js`) receives hotkey event
3. Main process sends 'toggle-recording' event to renderer
4. Renderer process (`AppContext.tsx`) receives event and calls `startRecording()`
5. `useAudioRecording` hook starts capturing audio
6. When recording stops, audio blob is sent to main process
7. Main process saves audio to temp file
8. Main process sends audio to Groq API for transcription
9. Transcription result is sent back to renderer
10. If enabled, main process inserts text at cursor position using `cursor.ts` service

### Settings Flow

1. User changes settings in UI (`SettingsPanel.tsx`)
2. Renderer process updates settings in `AppContext.tsx`
3. Settings are sent to main process via IPC
4. Main process saves settings using Electron Store
5. Settings are applied (e.g., global hotkey is updated)

## Permissions

The app requires several permissions to function properly:

- **Microphone access**: For audio recording
- **Accessibility permissions**: For global hotkey and text insertion
- **Screen recording permission**: For system-wide overlay (popup)

## Technologies Used

- **Electron**: Cross-platform desktop app framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Groq API**: AI-powered transcription service
- **RobotJS**: Desktop automation library for keyboard/mouse simulation
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: UI component library

## Cursor Insertion Implementation

The cursor insertion feature is implemented in `src/main/services/cursor.ts` using RobotJS. Two methods are provided:

1. **Direct typing**: Uses `robot.typeString()` to type text at the current cursor position
2. **Clipboard method**: Uses clipboard and Cmd+V as a fallback

The feature can be toggled in settings and is enabled by default.

## Compilation and Build Process

The app uses a custom build process defined in `compile.js`:

1. Build shared modules
2. Build main process services
3. Process CSS with Tailwind
4. Build renderer process code
5. Package app using Electron Forge

## Troubleshooting

Common issues:

- **Permissions**: The app requires accessibility and microphone permissions
- **API Key**: A valid Groq API key is required for transcription
- **Global Hotkey**: The global hotkey may conflict with other applications

## Future Improvements

Potential enhancements:

- Support for more languages and transcription services
- Improved text formatting options
- Custom text insertion templates
- Better error handling and recovery
- Enhanced UI for transcription history 