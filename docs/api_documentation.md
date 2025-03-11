# API Documentation - Whisper Dictation App

This document provides details about the APIs used in the Whisper Dictation App, focusing primarily on the integration with Python for local speech processing using the OpenAI Whisper model.

## Python-Node.js Integration

The application bridges JavaScript (Electron) and Python through a combination of child process management and file-based data exchange.

### Communication Methods

#### 1. Python Shell Package

The primary method of communication uses the `python-shell` npm package.

```javascript
const { PythonShell } = require('python-shell');

// Function to transcribe audio using Whisper
function transcribeAudio(audioFilePath, modelSize = 'medium') {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text',
      pythonPath: 'python3', // Or specific path to Python executable
      args: [
        '--model', modelSize,
        '--audio_path', audioFilePath,
        '--language', 'auto'
      ]
    };

    PythonShell.run('src/python/transcribe.py', options, (err, results) => {
      if (err) {
        logger.exception('Python transcription error:', err);
        reject(err);
        return;
      }
      resolve(results[0]); // First line of output contains transcription
    });
  });
}
```

#### 2. Child Process (Alternative Method)

An alternative approach using Node.js built-in child process module:

```javascript
const { spawn } = require('child_process');
const path = require('path');

// Function to transcribe audio using direct child process
function transcribeAudioWithChildProcess(audioFilePath, modelSize = 'medium') {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/transcribe.py');
    const process = spawn('python3', [
      pythonScript,
      '--model', modelSize,
      '--audio_path', audioFilePath
    ]);

    let stdoutData = '';
    let stderrData = '';

    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        logger.exception(`Python process exited with code ${code}: ${stderrData}`);
        reject(new Error(`Transcription failed: ${stderrData}`));
        return;
      }
      resolve(stdoutData.trim());
    });
  });
}
```

## Python Whisper API

The application uses a custom Python script that wraps the OpenAI Whisper API for transcription.

### Main Python Script: `transcribe.py`

```python
#!/usr/bin/env python3
import argparse
import sys
import whisper
import logging
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("whisper_transcriber")

def setup_args():
    parser = argparse.ArgumentParser(description="Transcribe audio using OpenAI Whisper")
    parser.add_argument("--model", type=str, default="medium", 
                       choices=["tiny", "base", "small", "medium", "large"],
                       help="Model size to use for transcription")
    parser.add_argument("--audio_path", type=str, required=True,
                       help="Path to audio file to transcribe")
    parser.add_argument("--language", type=str, default="auto",
                       help="Language code (use 'auto' for auto-detection)")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu",
                       help="Device to use for inference (cuda or cpu)")
    return parser.parse_args()

def transcribe_audio(args):
    try:
        logger.info(f"Loading model {args.model}")
        model = whisper.load_model(args.model, device=args.device)
        
        logger.info(f"Transcribing audio file: {args.audio_path}")
        language = None if args.language == "auto" else args.language
        result = model.transcribe(args.audio_path, language=language)
        
        return result["text"]
    except Exception as e:
        logger.exception("Error transcribing audio")
        raise e

if __name__ == "__main__":
    try:
        args = setup_args()
        text = transcribe_audio(args)
        # Print the result to stdout for the Node.js process to capture
        print(text)
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)
```

### API Parameters

| Parameter | Description | Default | Options |
|-----------|-------------|---------|---------|
| `model` | Whisper model size | `"medium"` | `"tiny"`, `"base"`, `"small"`, `"medium"`, `"large"` |
| `audio_path` | Path to the audio file | Required | Any valid file path |
| `language` | Language code | `"auto"` | `"auto"` or any valid language code (`"en"`, `"es"`, etc.) |
| `device` | Computation device | `"cuda"` if available, else `"cpu"` | `"cuda"`, `"cpu"` |

### Response Format

The Python script outputs the transcribed text to stdout, which is captured by the Node.js process. The text is returned as a simple string.

## Internal Application APIs

The application itself uses several internal APIs for communication between processes:

### 1. IPC Channels (Main ↔ Renderer Communication)

#### Main to Renderer

- **`dictation:start`**: Notifies the renderer process that dictation has started
  ```javascript
  mainWindow.webContents.send('dictation:start');
  ```

- **`dictation:status`**: Updates the renderer with the current dictation status
  ```javascript
  mainWindow.webContents.send('dictation:status', { status: 'listening', volumeLevel: 0.75 });
  ```

- **`dictation:result`**: Sends the transcription result to the renderer
  ```javascript
  mainWindow.webContents.send('dictation:result', { text: 'Transcribed text', confidence: 0.95 });
  ```

- **`dictation:error`**: Sends error information to the renderer
  ```javascript
  mainWindow.webContents.send('dictation:error', { message: 'Failed to transcribe audio' });
  ```

#### Renderer to Main

- **`settings:get`**: Requests current settings from the main process
  ```javascript
  ipcRenderer.invoke('settings:get');
  ```

- **`settings:set`**: Updates settings in the main process
  ```javascript
  ipcRenderer.invoke('settings:set', { key: 'shortcuts.activationKey', value: 'f13' });
  ```

- **`dictation:cancel`**: Cancels an ongoing dictation
  ```javascript
  ipcRenderer.send('dictation:cancel');
  ```

## Audio Processing APIs

The application uses the following Node.js APIs for audio capture and processing:

### 1. Node Microphone API

Used to access the system microphone and record audio.

```javascript
const mic = require('node-microphone');
const microphone = new mic({
  rate: '16000',
  channels: '1',
  debug: false,
  exitOnSilence: 6
});

const micStream = microphone.startRecording();
micStream.on('data', (data) => {
  // Process audio data
});
```

### 2. Audio Processing Utility Functions

```javascript
/**
 * Saves audio buffer to a temporary file for processing by Whisper
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @returns {Promise<string>} - Path to the temporary file
 */
function saveAudioToTemp(audioBuffer) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `dictation_${Date.now()}.wav`);
    fs.writeFile(tempFile, audioBuffer, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tempFile);
    });
  });
}

/**
 * Analyzes audio data to determine volume level
 * @param {Buffer} audioData - Raw audio data buffer
 * @returns {number} - Volume level between 0 and 1
 */
function getVolumeLevel(audioData) {
  // Implementation to calculate RMS or peak amplitude
}
```

## Text Insertion API

The application uses the `robotjs` library to simulate keyboard input for inserting text at the cursor position.

```javascript
const robot = require('robotjs');

/**
 * Types the transcribed text at the current cursor position
 * @param {string} text - Text to insert
 */
function insertText(text) {
  robot.typeString(text);
}
```

## Error Handling

All API interactions include robust error handling:

```javascript
// Error handling for Python script execution
try {
  const text = await transcribeAudio(audioFilePath);
  return text;
} catch (error) {
  logger.exception('Transcription error:', error);
  
  // Provide user-friendly error messages based on error type
  if (error.message.includes('No such file or directory')) {
    throw new Error('Python not found. Please ensure Python 3.7+ is installed.');
  } else if (error.message.includes('ModuleNotFoundError')) {
    throw new Error('Whisper module not found. Please install OpenAI Whisper.');
  } else if (error.message.includes('CUDA')) {
    // Fallback to CPU if CUDA error occurs
    logger.info('CUDA error detected, falling back to CPU');
    return transcribeAudio(audioFilePath, model, 'cpu');
  } else {
    throw new Error('Speech recognition failed. Please check the logs for details.');
  }
}
```

## Configuration API

The application uses `electron-store` to manage persistent settings:

```javascript
const Store = require('electron-store');

const schema = {
  speech: {
    whisperModel: {
      type: 'string',
      default: 'medium',
      enum: ['tiny', 'base', 'small', 'medium', 'large']
    },
    // Additional settings...
  }
};

const store = new Store({ schema });

// Get a setting
const modelSize = store.get('speech.whisperModel');

// Set a setting
store.set('speech.whisperModel', 'small');
``` 