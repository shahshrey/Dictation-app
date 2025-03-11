# Tech Stack and Packages Document

## Core Technologies

### Electron Framework
- **Purpose**: Cross-platform desktop application development
- **Version**: Latest stable (currently 28.x)
- **Key Components**:
  - Main Process: Node.js runtime for system-level operations
  - Renderer Process: Chromium-based for UI rendering
  - IPC (Inter-Process Communication): For communication between processes

### TypeScript
- **Purpose**: Type-safe JavaScript development
- **Version**: 5.x
- **Configuration**: Strict mode enabled for maximum type safety

### React
- **Purpose**: UI component library
- **Version**: 18.x
- **Features Used**:
  - Functional components with hooks
  - Context API for state management
  - Suspense for loading states

## UI/UX Libraries

### Material UI
- **Purpose**: Material Design implementation for React
- **Version**: 5.x
- **Key Components**:
  - ThemeProvider for consistent styling
  - Custom theme with centralized color management
  - Responsive components

### Tailwind CSS
- **Purpose**: Utility-first CSS framework
- **Version**: 3.x
- **Configuration**: Custom configuration for Material Design color palette

### Shadcn UI
- **Purpose**: Accessible and customizable UI components
- **Integration**: Used alongside Material UI for specific components
- **Initialization**: Via `pnpm dlx shadcn@latest init`

### Radix UI
- **Purpose**: Unstyled, accessible UI primitives
- **Components Used**:
  - Dialog for modals
  - Popover for tooltips
  - DropdownMenu for menu bar interactions

## Audio Processing

### Web Audio API
- **Purpose**: Native browser API for audio capture and processing
- **Features Used**:
  - AudioContext for audio processing
  - MediaRecorder for capturing microphone input
  - AnalyserNode for generating waveform data

### Audio Visualization
- **Package**: `wavesurfer.js`
- **Purpose**: Real-time audio waveform visualization
- **Features**: Responsive, customizable waveform display

## API Integration

### Groq SDK
- **Package**: `groq-sdk`
- **Version**: Latest available
- **Purpose**: Interface with Groq's AI services
- **Endpoints Used**:
  - `audio.transcriptions.create`: For speech-to-text conversion
  - `audio.translations.create`: For translating speech to English

## System Integration

### macOS Accessibility APIs
- **Purpose**: Enable text insertion into active applications
- **Implementation**: Via Electron's `robotjs` or similar library
- **Permissions**: Requires user approval for accessibility features

### Global Shortcut Registration
- **Purpose**: Capture keyboard events system-wide
- **Implementation**: Electron's `globalShortcut` module
- **Features**: Support for both press/release and toggle modes

## Build and Packaging

### Electron Builder
- **Purpose**: Package and distribute the application
- **Version**: Latest stable
- **Features**:
  - macOS app bundle creation
  - Code signing (if certificates available)
  - Auto-update capability (for future use)

### Development Tools

#### PNPM
- **Purpose**: Package management
- **Features**: Fast, disk-space efficient dependency management

#### ESLint
- **Purpose**: Code quality and style enforcement
- **Configuration**: TypeScript-aware with strict rules

#### Prettier
- **Purpose**: Code formatting
- **Integration**: Works with ESLint for consistent code style

## Data Storage

### Electron Store
- **Purpose**: Simple persistent storage
- **Usage**: Storing application settings and preferences

### File System Access
- **Implementation**: Node.js `fs` module
- **Usage**: Storing transcription history in text files

## Testing Framework

### Jest
- **Purpose**: Unit and integration testing
- **Configuration**: TypeScript support enabled

### Testing Library
- **Purpose**: Component testing
- **Packages**: `@testing-library/react` and `@testing-library/electron` 