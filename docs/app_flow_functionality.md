# App Flow & Functionality Document

## Overview
This document outlines the user experience and application flow for the macOS Dictation App, from installation to daily usage. It details how users interact with the application, how audio is processed, and how transcribed text is delivered to the user's active application.

## Application Lifecycle

### Installation & Setup
1. User downloads and installs the packaged Electron application
2. On first launch, the app requests necessary permissions:
   - Microphone access for audio recording
   - Accessibility permissions to insert text into active applications
3. User is presented with a simple onboarding screen explaining key features
4. User configures basic settings (optional):
   - Selects preferred microphone from available devices
   - Customizes keyboard shortcut (default: Home key)
   - Sets preferred language for transcription

### Main Application Flow

#### Launching the Application
1. Application starts and runs in the background
2. A small icon appears in the macOS menu bar indicating the app is active
3. No visible window is shown until dictation is triggered

#### Starting Dictation
1. User navigates to any text field in any application where they want to insert text
2. User presses the Home key (or configured shortcut) to begin dictation
3. A small popup appears at the bottom center of the screen with:
   - Visual indicator showing the app is listening
   - Live waveform animation that responds to audio input
   - Microphone icon and status text ("Listening...")

#### During Dictation
1. As the user speaks, the waveform animation responds to voice input
2. The user can:
   - Hold the key for continuous recording (recording stops when released)
   - Press once to start and press again to stop (toggle mode)
3. Visual feedback indicates audio levels through the waveform animation

#### Ending Dictation
1. User releases the key (in hold mode) or presses it again (in toggle mode)
2. The popup status changes to "Processing..."
3. The recorded audio is sent to Groq API for transcription
4. A brief loading animation indicates processing is underway

#### Receiving Transcription
1. Once transcription is complete, the popup briefly shows "Complete"
2. The transcribed text is automatically inserted at the cursor position in the active text field
3. The popup fades away after a short delay (approximately 1-2 seconds)
4. The transcription is saved to the local history file

#### Accessing History
1. User can click the menu bar icon to open a dropdown menu
2. The menu includes an option to view transcription history
3. Selecting this option opens a simple window displaying past transcriptions with timestamps

## Technical Flow

### Audio Capture Process
1. When dictation is triggered, the app initializes audio recording using the selected microphone
2. Audio is captured in real-time and temporarily stored in memory
3. Audio visualization data is extracted and used to render the waveform animation

### Cloud Processing
1. When recording ends, the audio is prepared for transmission
2. The app connects to Groq API using the groq-sdk package
3. Audio is sent to the appropriate endpoint:
   - `audio.transcriptions.create` for standard transcription
   - `audio.translations.create` if translation is enabled
4. The app waits for the API response with transcribed text

### Text Insertion
1. Upon receiving the transcription, the app uses macOS Accessibility APIs
2. The text is programmatically inserted at the current cursor position in the active application
3. No additional user action is required to complete this process

### Data Storage
1. Each transcription is saved to a local text file with:
   - Timestamp
   - Transcribed text
   - Source application (if available)
   - Duration of recording
2. This file is stored in the user's application data directory

## Error Handling
1. If microphone access is denied, the app displays a helpful message about enabling permissions
2. If network connectivity issues occur, the app notifies the user and offers to retry
3. If text insertion fails, the app copies the text to clipboard and notifies the user

## Settings and Customization
The user can access settings through the menu bar icon to:
1. Change the selected microphone
2. Modify the keyboard shortcut
3. Toggle between hold and toggle recording modes
4. Set the preferred language for transcription
5. Configure the appearance of the popup (size, opacity) 