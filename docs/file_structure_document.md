# File Structure Document - Whisper Dictation App

This document outlines the organization and structure of files within the Whisper Dictation App project. The file structure follows conventional Electron application patterns while organizing components logically based on their functionality.

```
whisper-dictation-app/
├── package.json           # Project metadata and dependencies
├── pnpm-lock.yaml         # Lock file for dependencies
├── .gitignore             # Git ignore file
├── README.md              # Project overview and setup instructions
├── LICENSE                # Project license
├── electron-builder.json  # Electron packaging configuration
│
├── src/                   # Source code directory
│   ├── main/              # Electron main process
│   │   ├── index.js       # Main entry point
│   │   ├── constants.js   # Application constants
│   │   ├── logger.js      # Logging utility
│   │   ├── tray.js        # System tray implementation
│   │   ├── shortcuts.js   # Global shortcut registration
│   │   ├── windows.js     # Window management
│   │   └── services/      # Backend services
│   │       ├── audio.js   # Audio recording service
│   │       ├── transcribe.js  # Python integration for transcription
│   │       └── text.js    # Text insertion service
│   │
│   ├── renderer/          # Electron renderer process
│   │   ├── index.html     # Main HTML entry
│   │   ├── index.js       # Renderer process entry point
│   │   ├── styles.css     # Main stylesheet
│   │   ├── components/    # UI components
│   │   │   ├── App.js     # Main app component
│   │   │   ├── DictationPopup.js  # Popup UI component
│   │   │   ├── Settings.js        # Settings UI component
│   │   │   └── StatusIndicator.js # Status visualization
│   │   └── assets/        # Static assets
│   │       ├── icons/     # Application icons
│   │       └── sounds/    # Notification sounds
│   │
│   ├── preload/           # Preload scripts for renderer
│   │   └── preload.js     # Preload script for IPC
│   │
│   └── python/            # Python scripts for whisper integration
│       ├── transcribe.py  # Main script for audio transcription
│       ├── requirements.txt # Python dependencies
│       └── utils/         # Python utility functions
│           ├── audio_processing.py # Audio preprocessing utilities
│           └── model_management.py # Whisper model management
│
├── config/                # Configuration files
│   ├── default.js         # Default app settings
│   └── webpack.config.js  # Webpack build configuration
│
├── scripts/               # Build and utility scripts
│   ├── build.js           # Build script
│   ├── notarize.js        # macOS notarization script
│   └── setup_python.js    # Python environment setup helper
│
├── resources/             # Application resources
│   └── icons/             # App icons in various formats
│       ├── icon.icns      # macOS icon
│       ├── icon.ico       # Windows icon
│       └── icon.png       # General PNG icon
│
├── dist/                  # Built and packaged application (git-ignored)
│   ├── mac/               # macOS build
│   └── win/               # Windows build
│
└── test/                  # Automated tests
    ├── unit/              # Unit tests
    │   ├── audio.test.js  # Tests for audio services
    │   ├── transcribe.test.js # Tests for transcription service
    │   └── text.test.js   # Tests for text insertion
    └── integration/       # Integration tests
        └── app.test.js    # Full app tests
```

## Key Directory Explanations

### `src/main/`
Contains all code related to the Electron main process, including system integration, global shortcuts, and core services. This is where the application's main functionality resides, including audio recording, Node.js-Python communication, and text insertion services.

### `src/renderer/`
Houses the user interface components and logic that runs in the Electron renderer process. This includes the minimal UI for the dictation popup and settings screens. Material design principles are applied here.

### `src/preload/`
Contains the preload scripts that securely expose main process functionality to the renderer process via contextBridge, following Electron security best practices.

### `src/python/`
Contains all Python scripts necessary for audio transcription using the OpenAI Whisper model. This directory is bundled with the application and includes:
- `transcribe.py`: Main entry point for Python-based transcription
- `requirements.txt`: Lists Python package dependencies
- Utility modules for audio processing and model management

### `src/main/services/`
Modular services that handle specific functionality:
- `audio.js`: Manages microphone access and recording
- `transcribe.js`: Handles communication with Python scripts for Whisper integration
- `text.js`: Handles system-wide text insertion

### `config/`
Application configuration files, including default settings and build configurations.

### `scripts/`
Build and utility scripts including `setup_python.js` which helps validate and ensure the Python environment is properly configured.

### `resources/`
Static resources used by the application, primarily icons in various formats required for different platforms.

## JavaScript-Python Communication

The application uses JavaScript to invoke Python scripts for speech transcription:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│  Electron Main  │──1─▶│  transcribe.js   │──2─▶│  Python Script   │
│   Process       │      │  Service         │      │  (transcribe.py)│
│                 │◀─4──│                  │◀─3──│                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                                                  │
        │                                                  │
        │                        ┌────────────────────┐    │
        │                        │                    │    │
        └───────5───────────────▶│  Text Insertion    │◀───┘
                                 │     Service        │
                                 │                    │
                                 └────────────────────┘
```

1. Main process captures audio and signals transcription service
2. Transcription service invokes Python script with audio file path
3. Python script processes audio with Whisper and returns text
4. Transcription service receives text and forwards to main process
5. Main process uses text insertion service to input the text at cursor

## Build Artifacts

The `dist/` directory contains the built and packaged application after running the build process. This directory is excluded from version control.

## Python Environment Management

During installation, the application performs the following steps:
1. Checks for Python installation
2. Verifies required Python packages (Whisper, PyTorch, etc.)
3. Offers to install missing dependencies if needed
4. Validates that FFmpeg is available on the system

## Development Workflow

During development, the main files to work with are:

1. `src/main/index.js` - Main application entry point
2. `src/main/services/transcribe.js` - Python integration service
3. `src/python/transcribe.py` - Whisper audio transcription script
4. `src/renderer/components/` - UI components

Changes to these files will have the most significant impact on the application's functionality and appearance. 