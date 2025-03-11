# File Structure Document

This document outlines the organization of files and directories in the macOS Dictation App project. The structure follows Electron's main/renderer process separation pattern and organizes code by feature and responsibility.

```
dictation-app/
├── .github/                      # GitHub related files (CI/CD, issue templates)
├── build/                        # Build output directory
├── dist/                         # Distribution packages
├── docs/                         # Documentation files
│   ├── project_requirements.md
│   ├── app_flow_functionality.md
│   ├── tech_stack_packages.md
│   ├── file_structure.md
│   ├── schema_design.md
│   ├── api_documentation.md
│   └── frontend_codebase.md
├── node_modules/                 # Dependencies (not in repository)
├── public/                       # Static assets
│   ├── icons/                    # Application icons
│   └── index.html                # Main HTML entry point
├── src/                          # Source code
│   ├── main/                     # Main process code
│   │   ├── index.ts              # Main process entry point
│   │   ├── preload.ts            # Preload script for secure IPC
│   │   ├── menu.ts               # Menu bar configuration
│   │   ├── shortcuts.ts          # Global shortcut registration
│   │   ├── accessibility/        # macOS accessibility features
│   │   │   ├── index.ts          # Accessibility module entry point
│   │   │   ├── permissions.ts    # Permission handling
│   │   │   └── text-insertion.ts # Text insertion into active applications
│   │   └── storage/              # Data storage functionality
│   │       ├── index.ts          # Storage module entry point
│   │       ├── settings.ts       # Application settings storage
│   │       └── transcriptions.ts # Transcription history storage
│   ├── renderer/                 # Renderer process code
│   │   ├── index.tsx             # Renderer entry point
│   │   ├── App.tsx               # Main React component
│   │   ├── components/           # UI components
│   │   │   ├── DictationPopup/   # Main dictation popup component
│   │   │   │   ├── index.tsx     # Component entry point
│   │   │   │   ├── Waveform.tsx  # Audio visualization component
│   │   │   │   └── styles.ts     # Component styles
│   │   │   ├── Settings/         # Settings UI components
│   │   │   │   ├── index.tsx     # Settings component entry point
│   │   │   │   ├── MicrophoneSelector.tsx # Microphone selection UI
│   │   │   │   └── ShortcutConfig.tsx # Keyboard shortcut configuration
│   │   │   ├── History/          # Transcription history components
│   │   │   │   ├── index.tsx     # History component entry point
│   │   │   │   └── HistoryItem.tsx # Individual history entry
│   │   │   └── common/           # Shared UI components
│   │   │       ├── Button.tsx    # Custom button component
│   │   │       ├── Tooltip.tsx   # Tooltip component
│   │   │       └── ThemeProvider.tsx # Theme provider with Material Design
│   │   ├── contexts/             # React contexts
│   │   │   ├── DictationContext.tsx # Dictation state management
│   │   │   ├── SettingsContext.tsx # Application settings context
│   │   │   └── ThemeContext.tsx  # Theme context
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useAudio.ts       # Audio recording and processing hook
│   │   │   ├── useGroq.ts        # Groq API integration hook
│   │   │   └── useShortcut.ts    # Keyboard shortcut hook
│   │   ├── services/             # Service modules
│   │   │   ├── audio/            # Audio processing services
│   │   │   │   ├── index.ts      # Audio service entry point
│   │   │   │   ├── recorder.ts   # Audio recording functionality
│   │   │   │   └── visualizer.ts # Audio visualization
│   │   │   └── groq/             # Groq API services
│   │   │       ├── index.ts      # Groq service entry point
│   │   │       ├── transcription.ts # Transcription service
│   │   │       └── translation.ts # Translation service
│   │   └── utils/                # Utility functions
│   │       ├── audio.ts          # Audio utility functions
│   │       ├── ipc.ts            # IPC communication utilities
│   │       └── format.ts         # Text formatting utilities
│   ├── shared/                   # Shared code between processes
│   │   ├── constants.ts          # Shared constants
│   │   ├── types.ts              # TypeScript type definitions
│   │   └── utils.ts              # Shared utility functions
│   └── styles/                   # Global styles
│       ├── globals.css           # Global CSS
│       ├── tailwind.css          # Tailwind CSS entry point
│       └── theme.ts              # Material Design theme configuration
├── .eslintrc.js                  # ESLint configuration
├── .gitignore                    # Git ignore file
├── .prettierrc                   # Prettier configuration
├── electron-builder.yml          # Electron Builder configuration
├── package.json                  # Project metadata and dependencies
├── pnpm-lock.yaml               # PNPM lock file
├── README.md                     # Project README
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # Vite configuration
```

## Key Directories Explained

### Main Process (`src/main/`)
Contains all code that runs in Electron's main process, including:
- Application lifecycle management
- Native OS integration
- Global shortcut registration
- Menu bar configuration
- File system access
- IPC (Inter-Process Communication) handlers

### Renderer Process (`src/renderer/`)
Contains all code that runs in Electron's renderer process, including:
- React components for UI
- Audio recording and visualization
- Groq API integration
- State management via React Context
- Custom hooks for functionality

### Shared (`src/shared/`)
Contains code shared between main and renderer processes:
- Type definitions
- Constants
- Utility functions

### Services (`src/renderer/services/`)
Modular service implementations for:
- Audio recording and processing
- Groq API integration
- Other external services

### Components (`src/renderer/components/`)
React components organized by feature:
- DictationPopup: Main UI for dictation
- Settings: Configuration UI
- History: Transcription history UI
- Common: Shared UI components

## Build and Configuration Files
- `electron-builder.yml`: Configuration for packaging the application
- `tsconfig.json`: TypeScript compiler configuration
- `vite.config.ts`: Vite bundler configuration
- `tailwind.config.js`: Tailwind CSS configuration

## Documentation (`docs/`)
Comprehensive documentation covering:
- Project requirements
- Application flow
- Technical specifications
- API documentation
- Frontend architecture 