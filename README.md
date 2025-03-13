# Dictation App

A desktop dictation application built with Electron, React, TypeScript, and Material UI that uses the Groq API for audio transcription and translation.

## Features

- Record audio from your computer's microphone
- Transcribe audio to text using Groq API
- Translate audio to English using Groq API
- Save transcriptions to local files
- View recent transcriptions
- Global shortcut (Home key) to start/stop recording
- Modern Material Design UI

## Prerequisites

- Node.js (v14 or higher)
- pnpm (v6 or higher)
- Groq API key (sign up at [groq.com](https://groq.com))

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/dictation-app.git
   cd dictation-app
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file in the root directory with your Groq API key:
   ```
   GROQ_API_KEY=your_api_key_here
   ```

## Development

Start the app in development mode:

```bash
pnpm start
```

### Git Hooks

This project uses Husky and lint-staged to enforce code quality and consistent commit messages:

- **Pre-commit Hook**: Automatically runs ESLint and Prettier on staged files before each commit
- **Commit Message Hook**: Validates commit messages against the Conventional Commits standard

Commit messages should follow the format:

```
type(scope): subject

body
```

Where `type` is one of:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or fixing tests
- `chore`: Changes to the build process or auxiliary tools
- `ci`: Changes to CI configuration
- `revert`: Reverting a previous commit

Example: `feat(audio): add support for multiple microphones`

## Building

Build the app for production:

```bash
pnpm make
```

This will create distributable packages in the `out` directory.

## Usage

1. Launch the application
2. Select your microphone from the dropdown
3. Click "Start Recording" or press the Home key to begin recording
4. Click "Stop Recording" or press the Home key again to stop recording
5. Click "Transcribe" to convert the audio to text
6. Click "Translate" to translate the audio to English
7. Save the transcription using the "Save" or "Save As..." buttons

## Project Structure

```
dictation-app/
├── src/
│   ├── main/                  # Main process code
│   │   ├── services/          # Services for main process
│   │   │   ├── audio.ts       # Audio recording functionality
│   │   │   ├── groq.ts        # Groq API integration
│   │   │   └── storage.ts     # File storage functionality
│   │   ├── utils/             # Utility functions
│   │   └── index.ts           # Main entry point
│   ├── preload/               # Preload scripts
│   │   └── preload.ts         # Preload script for exposing APIs
│   ├── renderer/              # Renderer process code
│   │   ├── components/        # React components
│   │   │   ├── ui/            # UI components (shadcn)
│   │   │   ├── features/      # Feature-specific components
│   │   │   │   ├── dictation/ # Dictation-related components
│   │   │   │   ├── settings/  # Settings-related components
│   │   │   │   └── transcription/ # Transcription-related components
│   │   │   └── layout/        # Layout components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Renderer-specific utilities
│   │   ├── styles/            # Global styles
│   │   └── index.tsx          # Renderer entry point
│   └── shared/                # Shared code between processes
│       ├── constants.ts       # Shared constants
│       └── types/             # Shared TypeScript interfaces
├── package.json               # Project metadata and dependencies
├── tsconfig.json              # TypeScript configuration
├── forge.config.js            # Electron Forge configuration
└── webpack.*.js               # Webpack configuration files
```

## License

MIT

## Acknowledgements

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Groq](https://groq.com/)
- [Material UI](https://material-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [WaveSurfer.js](https://wavesurfer-js.org/)
