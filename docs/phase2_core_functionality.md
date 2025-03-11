# Phase 2: Core Functionality Implementation

## Overview
Phase 2 focuses on implementing the core functionality of the Whisper Dictation App. This phase will build upon the foundation established in Phase 1 to create the essential features that enable speech-to-text transcription using the OpenAI Whisper model.

## Goals
- Implement global keyboard shortcut detection
- Create audio recording functionality
- Develop Python integration for Whisper transcription
- Implement text insertion mechanism
- Build basic UI for dictation status

## Tasks

### 1. Global Keyboard Shortcut Implementation
- [ ] Implement system-wide keyboard shortcut detection
- [ ] Create event handlers for key press and release events
- [ ] Set up configurable shortcut key mapping
- [ ] Implement shortcut conflict detection and resolution
- [ ] Add error handling for shortcut registration failures

### 2. Audio Recording Service
- [ ] Implement microphone access and permission handling
- [ ] Create audio recording service with appropriate format settings
- [ ] Implement audio buffer management
- [ ] Add visual feedback for audio levels
- [ ] Set up temporary file management for audio storage

### 3. Python Whisper Integration
- [ ] Create Python script for Whisper model loading and transcription
- [ ] Implement Node.js to Python communication
- [ ] Set up model parameter configuration
- [ ] Add error handling for transcription failures
- [ ] Implement model caching for improved performance

### 4. Text Insertion Mechanism
- [ ] Implement system-wide text insertion using RobotJS
- [ ] Create clipboard fallback mechanism
- [ ] Add support for different application contexts
- [ ] Implement error handling for insertion failures
- [ ] Add configurable insertion behavior

### 5. Basic UI Components
- [ ] Create minimal popup UI for dictation status
- [ ] Implement status indicators for different application states
- [ ] Add visual feedback for audio levels
- [ ] Create basic settings UI for configuration
- [ ] Implement error notification system

## Technical Specifications

### Keyboard Shortcut Service
```javascript
// src/main/services/shortcuts.js
const { globalShortcut } = require('electron');
const logger = require('../logger');
const { getSettings, saveSettings } = require('./settings');
const { startRecording, stopRecording } = require('./audio');

const SHORTCUT_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening'
};

let currentState = SHORTCUT_STATES.IDLE;
let activeShortcut = null;

function registerShortcuts() {
  try {
    const settings = getSettings();
    const shortcutKey = settings.shortcutKey || 'home';
    
    // Unregister any existing shortcuts
    unregisterShortcuts();
    
    // Register the new shortcut
    const success = globalShortcut.register(shortcutKey, () => {
      if (currentState === SHORTCUT_STATES.IDLE) {
        currentState = SHORTCUT_STATES.LISTENING;
        activeShortcut = shortcutKey;
        startRecording();
      }
    });
    
    if (!success) {
      throw new Error(`Failed to register shortcut: ${shortcutKey}`);
    }
    
    // Listen for key up event
    process.on('shortcut-released', (key) => {
      if (currentState === SHORTCUT_STATES.LISTENING && key === activeShortcut) {
        currentState = SHORTCUT_STATES.IDLE;
        stopRecording();
      }
    });
    
    logger.info(`Registered shortcut: ${shortcutKey}`);
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

function unregisterShortcuts() {
  try {
    globalShortcut.unregisterAll();
    currentState = SHORTCUT_STATES.IDLE;
    activeShortcut = null;
    logger.info('Unregistered all shortcuts');
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

function getCurrentState() {
  return currentState;
}

module.exports = {
  registerShortcuts,
  unregisterShortcuts,
  getCurrentState,
  SHORTCUT_STATES
};
```

### Audio Recording Service
```javascript
// src/main/services/audio.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { Microphone } = require('node-microphone');
const temp = require('temp');
const logger = require('../logger');
const { TEMP_AUDIO_DIR } = require('../constants');
const { transcribeAudio } = require('./transcribe');
const { emitStatusUpdate } = require('./status');

// Auto-track and cleanup temp files
temp.track();

let microphone = null;
let audioStream = null;
let audioChunks = [];
let tempFilePath = null;

// Ensure temp directory exists
if (!fs.existsSync(TEMP_AUDIO_DIR)) {
  try {
    fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
  } catch (error) {
    logger.exception(error);
  }
}

function startRecording() {
  try {
    // Clean up any previous recording
    if (microphone) {
      stopRecording();
    }
    
    // Initialize microphone
    microphone = new Microphone();
    
    // Start recording
    audioStream = microphone.startRecording();
    audioChunks = [];
    
    // Update status
    emitStatusUpdate('listening');
    
    // Collect audio data
    audioStream.on('data', (data) => {
      audioChunks.push(data);
    });
    
    audioStream.on('error', (error) => {
      logger.exception(error);
      stopRecording();
      emitStatusUpdate('error', 'Failed to record audio');
    });
    
    logger.info('Started audio recording');
    return true;
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Failed to start recording');
    return false;
  }
}

function stopRecording() {
  try {
    if (microphone) {
      microphone.stopRecording();
      microphone = null;
      
      // Update status
      emitStatusUpdate('processing');
      
      // Save audio to temp file
      tempFilePath = path.join(TEMP_AUDIO_DIR, `recording-${Date.now()}.wav`);
      
      fs.writeFile(tempFilePath, Buffer.concat(audioChunks), async (err) => {
        if (err) {
          logger.exception(err);
          emitStatusUpdate('error', 'Failed to save audio');
          return;
        }
        
        // Process the audio with Whisper
        await transcribeAudio(tempFilePath);
      });
      
      audioChunks = [];
      audioStream = null;
      
      logger.info('Stopped audio recording');
      return true;
    }
    return false;
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Failed to stop recording');
    return false;
  }
}

module.exports = {
  startRecording,
  stopRecording
};
```

### Python Transcription Service
```javascript
// src/main/services/transcribe.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');
const { PYTHON_PATH } = require('../constants');
const { getSettings } = require('./settings');
const { insertText } = require('./text');
const { emitStatusUpdate } = require('./status');

async function transcribeAudio(audioFilePath) {
  try {
    const settings = getSettings();
    const modelSize = settings.modelSize || 'base';
    
    // Path to Python script
    const scriptPath = path.join(__dirname, '../../python/transcribe.py');
    
    // Spawn Python process
    emitStatusUpdate('processing', 'Transcribing audio...');
    
    const pythonProcess = spawn(PYTHON_PATH, [
      scriptPath,
      '--audio_path', audioFilePath,
      '--model', modelSize
    ]);
    
    let transcribedText = '';
    let errorOutput = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      transcribedText += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error('Python error:', data.toString());
    });
    
    // Handle process completion
    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(audioFilePath);
        } catch (error) {
          logger.error('Failed to delete temp file:', error);
        }
        
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          emitStatusUpdate('error', 'Transcription failed');
          reject(new Error(`Transcription failed: ${errorOutput}`));
          return;
        }
        
        // Trim whitespace
        transcribedText = transcribedText.trim();
        
        if (!transcribedText) {
          emitStatusUpdate('error', 'No speech detected');
          reject(new Error('No speech detected'));
          return;
        }
        
        // Insert the transcribed text
        insertText(transcribedText);
        resolve(transcribedText);
      });
    });
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Transcription failed');
    throw error;
  }
}

module.exports = {
  transcribeAudio
};
```

### Text Insertion Service
```javascript
// src/main/services/text.js
const robot = require('robotjs');
const { clipboard } = require('electron');
const logger = require('../logger');
const { emitStatusUpdate } = require('./status');

// Store original clipboard content
let originalClipboardContent = '';

function insertText(text) {
  try {
    // Update status
    emitStatusUpdate('inserting', 'Inserting text...');
    
    // Save original clipboard content
    originalClipboardContent = clipboard.readText();
    
    // Copy text to clipboard
    clipboard.writeText(text);
    
    // Simulate Cmd+V or Ctrl+V to paste
    const modifier = process.platform === 'darwin' ? 'command' : 'control';
    robot.keyTap('v', modifier);
    
    // Restore original clipboard content after a short delay
    setTimeout(() => {
      clipboard.writeText(originalClipboardContent);
      emitStatusUpdate('idle', 'Text inserted');
    }, 500);
    
    logger.info('Text inserted successfully');
    return true;
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Failed to insert text');
    
    // Attempt to restore clipboard
    try {
      clipboard.writeText(originalClipboardContent);
    } catch (clipboardError) {
      logger.error('Failed to restore clipboard:', clipboardError);
    }
    
    return false;
  }
}

module.exports = {
  insertText
};
```

### Python Transcription Script
```python
# src/python/transcribe.py
import argparse
import os
import sys
import torch
import whisper
import logging
import tempfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('whisper-transcribe')

def setup_args():
    parser = argparse.ArgumentParser(description='Transcribe audio using OpenAI Whisper')
    parser.add_argument('--audio_path', type=str, required=True, help='Path to audio file')
    parser.add_argument('--model', type=str, default='base', choices=['tiny', 'base', 'small', 'medium', 'large'], 
                        help='Whisper model size')
    return parser.parse_args()

def transcribe_audio(audio_path, model_name):
    try:
        # Check if CUDA is available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        # Load model
        logger.info(f"Loading Whisper model: {model_name}")
        model = whisper.load_model(model_name, device=device)
        
        # Transcribe audio
        logger.info("Transcribing audio...")
        result = model.transcribe(audio_path)
        
        # Return transcribed text
        return result["text"]
    except Exception as e:
        logger.exception(f"Error transcribing audio: {str(e)}")
        sys.exit(1)

def main():
    try:
        args = setup_args()
        
        # Validate audio file
        if not os.path.exists(args.audio_path):
            logger.error(f"Audio file not found: {args.audio_path}")
            sys.exit(1)
        
        # Transcribe audio
        transcribed_text = transcribe_audio(args.audio_path, args.model)
        
        # Print result to stdout (will be captured by Node.js)
        print(transcribed_text)
        sys.exit(0)
    except Exception as e:
        logger.exception(f"Unhandled exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Deliverables
- Functional keyboard shortcut detection system
- Audio recording service with proper error handling
- Python integration for Whisper transcription
- Text insertion mechanism using RobotJS
- Basic UI components for dictation status
- Complete end-to-end workflow for dictation

## Success Criteria
- User can press and hold the home key to start dictation
- Audio is properly recorded and saved to a temporary file
- Whisper model successfully transcribes the audio
- Transcribed text is inserted at the cursor position
- User receives appropriate visual feedback throughout the process
- All error cases are properly handled with user-friendly messages

## Dependencies
- RobotJS for system-wide keyboard simulation
- node-microphone for audio recording
- Python with OpenAI Whisper, PyTorch, and FFmpeg
- electron-positioner for popup positioning

## Timeline
- Keyboard shortcut implementation: 2 days
- Audio recording service: 2 days
- Python Whisper integration: 3 days
- Text insertion mechanism: 2 days
- Basic UI components: 2 days
- Testing and refinement: 2 days

**Total Duration: 13 days** 