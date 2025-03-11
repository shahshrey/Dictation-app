# App Flow & Functionality Document - Whisper Dictation App

## Overview
This document outlines the complete user journey and core functionalities of the Whisper Dictation App, providing a comprehensive understanding of how users interact with the application and how the system processes these interactions.

## Application States

### 1. Idle State
- Application runs silently in the system tray/menu bar
- Minimal resource usage while monitoring for keyboard shortcut
- No visible UI elements on the screen
- Ready to respond to activation shortcut

### 2. Listening State
- Triggered when user presses and holds the home key
- Small, unobtrusive popup appears indicating dictation is active
- Microphone begins recording audio input
- Visual indicator shows audio levels for feedback
- Continues until the home key is released

### 3. Processing State
- Occurs immediately after the home key is released
- Popup changes to indicate processing
- Audio is saved to a temporary file
- Python script is invoked to process the audio using the Whisper model
- Brief delay depending on recording length, model size, and system performance

### 4. Insertion State
- Transcribed text is automatically inserted at the current cursor position
- Brief visual confirmation that text has been inserted
- Returns to idle state

## User Journey

1. **Setup & Installation**
   - User installs the Electron application
   - Application automatically starts with system boot (configurable)
   - Python, FFmpeg, and OpenAI Whisper are installed as prerequisites

2. **Daily Usage**
   - User positions cursor where text should be inserted
   - User presses and holds the home key
   - User speaks clearly into the system microphone
   - User releases the home key when finished speaking
   - System processes speech and inserts transcribed text
   - User continues with their work

3. **Configuration** (Optional)
   - User can access settings via system tray/menu bar icon
   - Adjustable settings include:
     - Keyboard shortcut customization
     - Popup appearance preferences
     - Whisper model parameters (size, language)

## Core Functionalities

### 1. System Tray Integration
- Minimal UI footprint with system tray/menu bar presence
- Quick access to application settings and controls
- Status indicators for application state

### 2. Keyboard Shortcut Management
- Registers system-wide keyboard listener for the home key
- Differentiates between press, hold, and release events
- Works across all applications

### 3. Audio Capture
- Accesses system microphone when activated
- Records audio at appropriate quality for speech recognition
- Provides visual feedback of audio input levels
- Temporary storage of audio for processing

### 4. Speech Processing
- Saves captured audio to a temporary file
- Invokes Python script through Node.js child process or python-shell
- Loads the Whisper model with specified parameters
- Processes audio using OpenAI Whisper
- Returns transcribed text to the main application

### 5. Text Insertion
- Identifies active text field across various applications
- Positions text at current cursor location
- Simulates keyboard input to insert the transcribed text
- Handles different application contexts appropriately

### 6. Notification System
- Provides visual feedback through the popup UI
- Indicates different application states clearly
- Minimalistic design to avoid distracting the user

## Error Handling

### Python Environment Issues
- Checks for Python installation at startup
- Verifies Whisper model is installed and accessible
- Provides clear error messages if Python or Whisper is not properly configured
- Offers quick remediation options

### Recognition Failures
- Indicates when speech couldn't be properly recognized
- Provides feedback on potential issues (background noise, unclear speech)
- Option to retry the dictation

### System Integration Issues
- Gracefully handles cases where text insertion isn't possible
- Provides clipboard fallback for text that can't be directly inserted

## Technical Flow

### 1. Audio Recording Flow
- User holds home key → Electron captures keypress event
- Main process activates audio recording → Creates audio stream
- Audio buffer accumulates data while key is held
- User releases key → Audio recording stops

### 2. Transcription Flow
- Audio buffer saved to temporary WAV file
- Python process spawned with file path and model parameters
- Whisper model loads and processes audio
- Transcribed text returned via stdout
- Main process captures output and cleans up temporary file

### 3. Text Insertion Flow
- Transcribed text received in main process
- RobotJS used to simulate keyboard input at cursor position
- Text inserted character by character
- Success notification shown to user

## Performance Considerations
- Application optimized for minimal CPU/memory usage in idle state
- Appropriate Whisper model selection based on system capabilities:
  - Small/Base models for older hardware
  - Medium/Large models for better accuracy on capable systems
- GPU acceleration used when available
- Startup time minimized to ensure availability when needed
- Intelligent cleanup of temporary files 