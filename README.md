# Whisper Dictation App

A minimalist, system-wide dictation tool for macOS that uses local processing through OpenAI Whisper to transcribe speech to text at the cursor position.

## Project Overview

This application provides a convenient way to dictate text into any application by holding down the home key. When activated, it shows a small popup indicator, records audio while the key is held, and then processes the speech locally using the Whisper model. Once processed, the transcribed text is inserted at the current cursor position.

## Key Features

- System-wide dictation capability
- Home key activation (press and hold)
- Local processing via OpenAI Whisper (no cloud services)
- Minimalist material design UI
- Works offline
- Cursor-aware text insertion
- Low resource usage when idle
- Multiple model size options (tiny to large)

## Documentation

This repository contains comprehensive documentation for the Whisper Dictation App:

1. [Project Requirement Document](./project_requirement_document.md)
   - Introduction, problem statement, solution approach, and core features

2. [App Flow & Functionality Document](./app_flow_and_functionality_document.md)
   - Detailed user journey and application state descriptions

3. [Tech Stack and Packages Document](./tech_stack_and_packages_document.md)
   - Technology choices, dependencies, and development tools

4. [File Structure Document](./file_structure_document.md)
   - Organization of files and directories in the project

5. [Schema Design Document](./schema_design_document.md)
   - Configuration storage schema and runtime data structures

6. [API Documentation](./api_documentation.md)
   - Integration with Whisper Python API and internal application APIs

7. [Frontend Codebase Document](./frontend_codebase_document.md)
   - Frontend architecture, component structure, and design principles

## Getting Started

### Prerequisites

- macOS 10.15 (Catalina) or newer
- [Node.js](https://nodejs.org/) (LTS version)
- [pnpm](https://pnpm.io/) package manager
- [Python](https://www.python.org/) (version 3.7-3.11)
- [FFmpeg](https://ffmpeg.org/) for audio processing
- [PyTorch](https://pytorch.org/) for Whisper model

### Installation

1. Install Python prerequisites:
   ```bash
   # Install FFmpeg (macOS)
   brew install ffmpeg
   
   # Install Whisper and dependencies
   pip install git+https://github.com/openai/whisper.git
   pip install torch numpy
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/whisper-dictation-app.git
   cd whisper-dictation-app
   ```

3. Install JavaScript dependencies:
   ```bash
   pnpm install
   ```

4. Start the application in development mode:
   ```bash
   pnpm dev
   ```

5. Build for production:
   ```bash
   pnpm build
   ```

## Usage

1. Launch the application
2. Position your cursor where you want text to appear
3. Press and hold the home key
4. Speak clearly into your microphone
5. Release the key when you're done speaking
6. The transcribed text will appear at the cursor position

## Configuration

Access settings by clicking the system tray/menu bar icon:

- **General**: Startup behavior, notifications
- **Shortcuts**: Customize activation key
- **Appearance**: UI theme and popup preferences
- **Speech**: Whisper model selection and language preferences
- **Advanced**: Python path, audio settings, and debugging options

## Whisper Model Selection

The application supports multiple Whisper model sizes:

| Model | Size | Memory | Speed | Accuracy |
|-------|------|--------|-------|----------|
| Tiny | 39M | Low | Very Fast | Good |
| Base | 74M | Low | Fast | Better |
| Small | 244M | Medium | Medium | Strong |
| Medium | 769M | High | Slower | Excellent |
| Large | 1.5GB | Very High | Slowest | Best |

Select the appropriate model based on your hardware capabilities and accuracy needs.

## Development

This application is built with Electron, providing a lightweight desktop application framework that allows development using web technologies (HTML, CSS, JavaScript), with Python integration for speech processing.

### Development Workflow

1. Make changes to the source files in the `src` directory
2. Run `pnpm dev` to test changes in development mode
3. Build the application with `pnpm build`
4. Package for distribution using `pnpm package`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) for the speech recognition model
- [Electron](https://www.electronjs.org/) for the application framework
- [python-shell](https://github.com/extrabacon/python-shell) for JavaScript-Python integration 