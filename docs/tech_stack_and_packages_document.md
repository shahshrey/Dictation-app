# Tech Stack and Packages Document - Whisper Dictation App

## Core Technologies

### Electron
- **Purpose**: Cross-platform desktop application framework
- **Version**: Latest stable (^28.0.0)
- **Rationale**: Provides native system integration capabilities while allowing for development using web technologies

### Python
- **Purpose**: Backend for speech processing
- **Version**: 3.7-3.11
- **Rationale**: Required for running OpenAI Whisper locally

### OpenAI Whisper
- **Purpose**: Speech-to-text transcription
- **Model**: OpenAI Whisper (tiny, base, small, medium, or large)
- **Rationale**: State-of-the-art speech recognition capabilities with multilingual support
- **Installation**: Via Python (`pip install git+https://github.com/openai/whisper.git`)

### FFmpeg
- **Purpose**: Audio processing and conversion
- **Version**: Latest stable
- **Rationale**: Required by Whisper for handling various audio formats

### PyTorch
- **Purpose**: Deep learning framework
- **Version**: Latest stable
- **Rationale**: Core dependency for OpenAI Whisper model

## Frontend Technologies

### HTML/CSS/JavaScript
- **Purpose**: User interface development
- **Styling Approach**: CSS-in-JS with minimal external dependencies
- **Design System**: Material Design principles

### Electron Tray
- **Purpose**: System tray/menu bar integration
- **Implementation**: Native Electron API

## Backend Technologies

### Node.js
- **Purpose**: Runtime environment for JavaScript
- **Version**: Current LTS (^20.x)
- **Usage**: Core application logic, system integration, and API communication

### IPC (Inter-Process Communication)
- **Purpose**: Communication between Electron's main and renderer processes
- **Implementation**: Electron's built-in IPC modules

### Node-Python Integration
- **Purpose**: Communication between Node.js and Python processes
- **Implementation**: Python child process spawning via Node.js
- **Alternatives**: python-shell, node-python-bridge

## Development Tools

### Package Manager
- **Tool**: pnpm (JavaScript/Node.js)
- **Tool**: pip (Python)
- **Version**: Latest stable
- **Rationale**: Efficient dependency management for respective ecosystems

### Build Tools
- **Bundler**: Vite or Webpack
- **Transpiler**: Babel or TypeScript (for type safety)
- **Rust**: For building certain Python dependencies

### Code Quality
- **Linter**: ESLint with Airbnb or Standard config
- **Formatter**: Prettier
- **Testing**: Jest for unit tests

## Key Packages

### Core Functionality (JavaScript)

| Package Name | Purpose | Version |
|--------------|---------|---------|
| `electron` | Desktop application framework | ^28.0.0 |
| `node-microphone` | Access system microphone | ^0.1.6 |
| `robotjs` | System-wide keyboard shortcuts and text insertion | ^0.6.0 |
| `electron-store` | Persistent storage for settings | ^8.1.0 |
| `audio-recorder` | Recording audio streams | ^3.0.0 |
| `python-shell` | Node.js to Python communication | ^5.0.0 |
| `temp` | Temporary file management | ^0.9.4 |

### Python Packages

| Package Name | Purpose | Version |
|--------------|---------|---------|
| `openai-whisper` | Speech recognition | latest from GitHub |
| `torch` | Deep learning framework | ^2.0.0 |
| `numpy` | Numerical computations | ^1.24.0 |
| `ffmpeg-python` | Audio processing | ^0.2.0 |
| `setuptools-rust` | Build dependency | ^1.5.2 |

### UI Components

| Package Name | Purpose | Version |
|--------------|---------|---------|
| `electron-positioner` | Popup positioning | ^4.1.0 |
| `electron-log` | Application logging | ^5.0.0 |
| `material-components-web` | Material Design components | ^14.0.0 |

## System Requirements

### Hardware
- **CPU**: Multi-core processor (4+ cores recommended for efficient Whisper processing)
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 2GB available space for application and Whisper model
- **Microphone**: System or external microphone
- **GPU**: Optional but recommended for faster transcription with larger models

### Software
- **OS**: macOS 10.15 (Catalina) or newer
- **Dependencies**: 
  - Python 3.7-3.11
  - FFmpeg
  - PyTorch
  - Rust (optional, helps avoid errors when building wheels for tokenizers)

## Development Environment Setup

### Prerequisites
1. Node.js and pnpm installed
2. Python (3.7-3.11) installed
3. FFmpeg installed (`brew install ffmpeg` on macOS)
4. PyTorch installed (`pip install torch`)
5. OpenAI Whisper installed (`pip install git+https://github.com/openai/whisper.git`)
6. XCode Command Line Tools (for macOS development)
7. Rust (optional)

### Installation Commands
```bash
# Install JavaScript dependencies
pnpm install

# Install Python dependencies
pip install git+https://github.com/openai/whisper.git torch numpy ffmpeg-python

# Development mode
pnpm dev

# Build for production
pnpm build

# Package the application
pnpm package
```

## Python-Node.js Communication

The application uses Node.js's child process module or the python-shell package to communicate with Python:

```javascript
// Using python-shell
const { PythonShell } = require('python-shell');

const options = {
  mode: 'text',
  pythonPath: 'python3', // Or path to Python executable
  args: ['--model', 'medium', '--audio_path', '/path/to/audio.wav']
};

PythonShell.run('src/python/transcribe.py', options, function (err, results) {
  if (err) throw err;
  // results contains transcription
  console.log('Transcription:', results[0]);
});
```

## Performance Optimizations
- Audio compression before processing
- Lazy loading of non-critical components
- Efficient memory management for audio buffers
- Model selection based on accuracy vs. speed tradeoffs (tiny/base for speed, medium/large for accuracy)
- GPU acceleration when available 