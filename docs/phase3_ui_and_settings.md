# Phase 3: UI Enhancement and Settings Implementation

## Overview
Phase 3 focuses on enhancing the user interface and implementing comprehensive settings functionality for the Whisper Dictation App. This phase will build upon the core functionality established in Phase 2 to create a polished, user-friendly experience with customizable options.

## Goals
- Develop a polished popup UI for dictation status
- Create a comprehensive settings interface
- Implement model management functionality
- Add visual and audio feedback mechanisms
- Enhance error handling and user guidance

## Tasks

### 1. Enhanced Popup UI
- [ ] Design and implement a polished popup UI for dictation status
- [ ] Create smooth animations for state transitions
- [ ] Implement audio level visualization
- [ ] Add status indicators for different application states
- [ ] Ensure proper positioning across different screen configurations

### 2. Comprehensive Settings Interface
- [ ] Design and implement a settings window
- [ ] Create UI for configuring keyboard shortcuts
- [ ] Add model selection interface
- [ ] Implement startup and notification preferences
- [ ] Add language selection options
- [ ] Create UI for advanced configuration options

### 3. Model Management
- [ ] Implement model downloading and caching
- [ ] Create model selection logic based on performance requirements
- [ ] Add model verification and integrity checking
- [ ] Implement model update mechanism
- [ ] Create UI for model management

### 4. Feedback Mechanisms
- [ ] Implement visual feedback for dictation status
- [ ] Add audio cues for state transitions
- [ ] Create notification system for important events
- [ ] Implement error visualization
- [ ] Add progress indicators for long-running operations

### 5. User Guidance and Help
- [ ] Create first-run experience with setup guidance
- [ ] Implement tooltips and help text
- [ ] Add troubleshooting information for common issues
- [ ] Create documentation accessible from the application
- [ ] Implement contextual help based on application state

## Technical Specifications

### Theme and Colors
```javascript
// src/renderer/styles/theme.js
const THEME = {
  COLORS: {
    PRIMARY: '#4285F4',
    SECONDARY: '#34A853',
    ACCENT: '#FBBC05',
    ERROR: '#EA4335',
    BACKGROUND: '#FFFFFF',
    SURFACE: '#F8F9FA',
    ON_PRIMARY: '#FFFFFF',
    ON_SECONDARY: '#FFFFFF',
    ON_BACKGROUND: '#202124',
    ON_SURFACE: '#202124',
    BORDER: '#DADCE0',
    SHADOW: 'rgba(60, 64, 67, 0.3)',
    OVERLAY: 'rgba(32, 33, 36, 0.6)'
  },
  TYPOGRAPHY: {
    FONT_FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    FONT_SIZE: {
      SMALL: '12px',
      MEDIUM: '14px',
      LARGE: '16px',
      XLARGE: '18px'
    },
    FONT_WEIGHT: {
      REGULAR: 400,
      MEDIUM: 500,
      BOLD: 700
    }
  },
  SPACING: {
    XSMALL: '4px',
    SMALL: '8px',
    MEDIUM: '16px',
    LARGE: '24px',
    XLARGE: '32px'
  },
  ANIMATION: {
    DURATION: {
      FAST: '150ms',
      MEDIUM: '300ms',
      SLOW: '500ms'
    },
    EASING: {
      STANDARD: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      DECELERATE: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      ACCELERATE: 'cubic-bezier(0.4, 0.0, 1, 1)'
    }
  },
  ELEVATION: {
    NONE: 'none',
    LOW: '0 1px 2px rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
    MEDIUM: '0 4px 8px rgba(60, 64, 67, 0.3), 0 1px 3px rgba(60, 64, 67, 0.15)',
    HIGH: '0 8px 16px rgba(60, 64, 67, 0.3), 0 1px 3px rgba(60, 64, 67, 0.15)'
  }
};

module.exports = THEME;
```

### Popup UI Component
```javascript
// src/renderer/components/DictationPopup.js
const { ipcRenderer } = require('electron');
const THEME = require('../styles/theme');

class DictationPopup {
  constructor() {
    this.container = document.getElementById('dictation-popup');
    this.statusText = document.getElementById('status-text');
    this.audioLevels = document.getElementById('audio-levels');
    this.closeButton = document.getElementById('close-button');
    
    this.currentState = 'idle';
    this.audioLevelData = [];
    this.maxAudioLevel = 100;
    
    this.initEventListeners();
  }
  
  initEventListeners() {
    // Listen for status updates from main process
    ipcRenderer.on('status-update', (event, data) => {
      this.updateStatus(data.status, data.message);
    });
    
    // Listen for audio level updates
    ipcRenderer.on('audio-level', (event, level) => {
      this.updateAudioLevel(level);
    });
    
    // Close button handler
    this.closeButton.addEventListener('click', () => {
      ipcRenderer.send('cancel-dictation');
    });
  }
  
  updateStatus(status, message = '') {
    // Remove previous state class
    this.container.classList.remove(`state-${this.currentState}`);
    
    // Add new state class
    this.currentState = status;
    this.container.classList.add(`state-${status}`);
    
    // Update status text
    this.statusText.textContent = message || this.getDefaultStatusMessage(status);
    
    // Show/hide audio level visualization based on state
    if (status === 'listening') {
      this.audioLevels.classList.remove('hidden');
    } else {
      this.audioLevels.classList.add('hidden');
    }
    
    // Play sound effect for state change
    this.playStateChangeSound(status);
  }
  
  getDefaultStatusMessage(status) {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'inserting':
        return 'Inserting text...';
      case 'error':
        return 'Error occurred';
      default:
        return '';
    }
  }
  
  updateAudioLevel(level) {
    // Normalize level
    const normalizedLevel = Math.min(Math.max(level, 0), this.maxAudioLevel);
    const percentage = (normalizedLevel / this.maxAudioLevel) * 100;
    
    // Add to data array and keep only recent values
    this.audioLevelData.push(percentage);
    if (this.audioLevelData.length > 50) {
      this.audioLevelData.shift();
    }
    
    // Update visualization
    this.renderAudioLevels();
  }
  
  renderAudioLevels() {
    // Clear previous visualization
    this.audioLevels.innerHTML = '';
    
    // Create bars for each data point
    this.audioLevelData.forEach((level, index) => {
      const bar = document.createElement('div');
      bar.className = 'audio-level-bar';
      bar.style.height = `${level}%`;
      bar.style.left = `${(index / this.audioLevelData.length) * 100}%`;
      this.audioLevels.appendChild(bar);
    });
  }
  
  playStateChangeSound(status) {
    // Play appropriate sound effect based on state
    const soundMap = {
      listening: 'start-recording.mp3',
      processing: 'stop-recording.mp3',
      inserting: 'success.mp3',
      error: 'error.mp3'
    };
    
    const soundFile = soundMap[status];
    if (soundFile) {
      const audio = new Audio(`../assets/sounds/${soundFile}`);
      audio.play().catch(err => console.error('Failed to play sound:', err));
    }
  }
  
  show() {
    this.container.classList.remove('hidden');
    this.container.classList.add('fade-in');
  }
  
  hide() {
    this.container.classList.add('fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
      this.container.classList.remove('fade-out');
    }, 300);
  }
}

module.exports = DictationPopup;
```

### Settings Window
```javascript
// src/renderer/components/Settings.js
const { ipcRenderer } = require('electron');
const THEME = require('../styles/theme');

class SettingsWindow {
  constructor() {
    this.container = document.getElementById('settings-container');
    this.saveButton = document.getElementById('save-settings');
    this.cancelButton = document.getElementById('cancel-settings');
    this.shortcutInput = document.getElementById('shortcut-input');
    this.modelSelect = document.getElementById('model-select');
    this.startupCheckbox = document.getElementById('startup-checkbox');
    this.notificationsCheckbox = document.getElementById('notifications-checkbox');
    
    this.currentSettings = {};
    this.initEventListeners();
    this.loadSettings();
  }
  
  initEventListeners() {
    // Save button handler
    this.saveButton.addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Cancel button handler
    this.cancelButton.addEventListener('click', () => {
      ipcRenderer.send('close-settings');
    });
    
    // Shortcut recording
    this.shortcutInput.addEventListener('keydown', (event) => {
      event.preventDefault();
      this.shortcutInput.value = event.key;
      this.shortcutInput.dataset.key = event.key;
    });
    
    // Model selection change
    this.modelSelect.addEventListener('change', () => {
      const selectedModel = this.modelSelect.value;
      this.updateModelInfo(selectedModel);
    });
  }
  
  loadSettings() {
    // Request current settings from main process
    ipcRenderer.send('get-settings');
    
    // Listen for settings response
    ipcRenderer.once('settings', (event, settings) => {
      this.currentSettings = settings;
      this.populateForm(settings);
    });
    
    // Get available models
    ipcRenderer.send('get-available-models');
    
    // Listen for models response
    ipcRenderer.once('available-models', (event, models) => {
      this.populateModelSelect(models);
    });
  }
  
  populateForm(settings) {
    // Set form values based on current settings
    this.shortcutInput.value = settings.shortcutKey || 'home';
    this.shortcutInput.dataset.key = settings.shortcutKey || 'home';
    this.modelSelect.value = settings.modelSize || 'base';
    this.startupCheckbox.checked = settings.startAtLogin || false;
    this.notificationsCheckbox.checked = settings.showNotifications || true;
    
    // Update model info
    this.updateModelInfo(settings.modelSize || 'base');
  }
  
  populateModelSelect(models) {
    // Clear existing options
    this.modelSelect.innerHTML = '';
    
    // Add options for each available model
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      this.modelSelect.appendChild(option);
    });
    
    // Select current model
    this.modelSelect.value = this.currentSettings.modelSize || 'base';
  }
  
  updateModelInfo(modelId) {
    // Update model information display
    const modelInfoElement = document.getElementById('model-info');
    
    const modelInfo = {
      tiny: {
        size: '~75MB',
        speed: 'Very Fast',
        accuracy: 'Low',
        languages: 'English-focused'
      },
      base: {
        size: '~150MB',
        speed: 'Fast',
        accuracy: 'Moderate',
        languages: 'English-focused'
      },
      small: {
        size: '~500MB',
        speed: 'Moderate',
        accuracy: 'Good',
        languages: 'Multilingual'
      },
      medium: {
        size: '~1.5GB',
        speed: 'Slow',
        accuracy: 'Very Good',
        languages: 'Multilingual'
      },
      large: {
        size: '~3GB',
        speed: 'Very Slow',
        accuracy: 'Excellent',
        languages: 'Multilingual'
      }
    };
    
    const info = modelInfo[modelId] || modelInfo.base;
    
    modelInfoElement.innerHTML = `
      <div class="model-info-item">
        <span class="label">Size:</span>
        <span class="value">${info.size}</span>
      </div>
      <div class="model-info-item">
        <span class="label">Speed:</span>
        <span class="value">${info.speed}</span>
      </div>
      <div class="model-info-item">
        <span class="label">Accuracy:</span>
        <span class="value">${info.accuracy}</span>
      </div>
      <div class="model-info-item">
        <span class="label">Languages:</span>
        <span class="value">${info.languages}</span>
      </div>
    `;
  }
  
  saveSettings() {
    // Collect form values
    const settings = {
      shortcutKey: this.shortcutInput.dataset.key,
      modelSize: this.modelSelect.value,
      startAtLogin: this.startupCheckbox.checked,
      showNotifications: this.notificationsCheckbox.checked
    };
    
    // Send settings to main process
    ipcRenderer.send('save-settings', settings);
    
    // Show saving indicator
    const saveIndicator = document.getElementById('save-indicator');
    saveIndicator.textContent = 'Saving...';
    saveIndicator.classList.remove('hidden');
    
    // Listen for save confirmation
    ipcRenderer.once('settings-saved', () => {
      saveIndicator.textContent = 'Settings saved!';
      setTimeout(() => {
        saveIndicator.classList.add('hidden');
      }, 2000);
    });
  }
}

module.exports = SettingsWindow;
```

### Model Management Service
```javascript
// src/main/services/modelManager.js
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { spawn } = require('child_process');
const logger = require('../logger');
const { PYTHON_PATH } = require('../constants');

// Define model directory
const MODEL_DIR = path.join(app.getPath('userData'), 'models');

// Ensure model directory exists
if (!fs.existsSync(MODEL_DIR)) {
  try {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  } catch (error) {
    logger.exception(error);
  }
}

// Define available models
const AVAILABLE_MODELS = [
  { id: 'tiny', name: 'Tiny (Fast, Lower Accuracy)', size: 75 },
  { id: 'base', name: 'Base (Balanced)', size: 150 },
  { id: 'small', name: 'Small (Better Accuracy)', size: 500 },
  { id: 'medium', name: 'Medium (High Accuracy)', size: 1500 },
  { id: 'large', name: 'Large (Highest Accuracy)', size: 3000 }
];

async function getAvailableModels() {
  return AVAILABLE_MODELS;
}

async function getInstalledModels() {
  try {
    // Run Python script to check installed models
    const scriptPath = path.join(__dirname, '../../python/utils/model_management.py');
    
    const pythonProcess = spawn(PYTHON_PATH, [
      scriptPath,
      '--action', 'list'
    ]);
    
    let output = '';
    let errorOutput = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error('Python error:', data.toString());
    });
    
    // Handle process completion
    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          reject(new Error(`Failed to list models: ${errorOutput}`));
          return;
        }
        
        try {
          const installedModels = JSON.parse(output.trim());
          resolve(installedModels);
        } catch (error) {
          logger.exception(error);
          reject(new Error('Failed to parse installed models'));
        }
      });
    });
  } catch (error) {
    logger.exception(error);
    throw error;
  }
}

async function downloadModel(modelId) {
  try {
    // Run Python script to download model
    const scriptPath = path.join(__dirname, '../../python/utils/model_management.py');
    
    const pythonProcess = spawn(PYTHON_PATH, [
      scriptPath,
      '--action', 'download',
      '--model', modelId
    ]);
    
    let output = '';
    let errorOutput = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error('Python error:', data.toString());
    });
    
    // Handle process completion
    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          reject(new Error(`Failed to download model: ${errorOutput}`));
          return;
        }
        
        resolve({ success: true, message: output.trim() });
      });
    });
  } catch (error) {
    logger.exception(error);
    throw error;
  }
}

async function verifyModel(modelId) {
  try {
    // Run Python script to verify model
    const scriptPath = path.join(__dirname, '../../python/utils/model_management.py');
    
    const pythonProcess = spawn(PYTHON_PATH, [
      scriptPath,
      '--action', 'verify',
      '--model', modelId
    ]);
    
    let output = '';
    let errorOutput = '';
    
    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    // Collect stderr data
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error('Python error:', data.toString());
    });
    
    // Handle process completion
    return new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}`);
          reject(new Error(`Failed to verify model: ${errorOutput}`));
          return;
        }
        
        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (error) {
          logger.exception(error);
          reject(new Error('Failed to parse verification result'));
        }
      });
    });
  } catch (error) {
    logger.exception(error);
    throw error;
  }
}

module.exports = {
  getAvailableModels,
  getInstalledModels,
  downloadModel,
  verifyModel,
  AVAILABLE_MODELS
};
```

### Python Model Management Script
```python
# src/python/utils/model_management.py
import argparse
import os
import sys
import json
import whisper
import torch
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('whisper-model-management')

def setup_args():
    parser = argparse.ArgumentParser(description='Manage Whisper models')
    parser.add_argument('--action', type=str, required=True, 
                        choices=['list', 'download', 'verify'],
                        help='Action to perform')
    parser.add_argument('--model', type=str,
                        choices=['tiny', 'base', 'small', 'medium', 'large'],
                        help='Model to download or verify')
    return parser.parse_args()

def list_installed_models():
    try:
        # Get whisper cache directory
        cache_dir = os.path.join(os.path.expanduser('~'), '.cache', 'whisper')
        
        # Check if directory exists
        if not os.path.exists(cache_dir):
            return []
        
        # List files in directory
        files = os.listdir(cache_dir)
        
        # Filter model files
        model_files = [f for f in files if f.endswith('.pt')]
        
        # Extract model names
        installed_models = []
        for model_file in model_files:
            model_name = model_file.replace('.pt', '')
            if model_name in ['tiny', 'base', 'small', 'medium', 'large']:
                installed_models.append({
                    'id': model_name,
                    'path': os.path.join(cache_dir, model_file),
                    'size_mb': round(os.path.getsize(os.path.join(cache_dir, model_file)) / (1024 * 1024), 2)
                })
        
        return installed_models
    except Exception as e:
        logger.exception(f"Error listing models: {str(e)}")
        return []

def download_model(model_name):
    try:
        logger.info(f"Downloading model: {model_name}")
        
        # Check if CUDA is available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        # Download and load model
        model = whisper.load_model(model_name, device=device)
        
        logger.info(f"Model {model_name} downloaded successfully")
        return True
    except Exception as e:
        logger.exception(f"Error downloading model: {str(e)}")
        return False

def verify_model(model_name):
    try:
        logger.info(f"Verifying model: {model_name}")
        
        # Check if CUDA is available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Try to load the model
        model = whisper.load_model(model_name, device=device)
        
        # Get model info
        model_size = sum(p.numel() for p in model.parameters())
        model_size_mb = model_size * 4 / (1024 * 1024)  # Assuming float32 (4 bytes)
        
        return {
            'valid': True,
            'model_name': model_name,
            'parameters': model_size,
            'size_mb': round(model_size_mb, 2),
            'device': device
        }
    except Exception as e:
        logger.exception(f"Error verifying model: {str(e)}")
        return {
            'valid': False,
            'model_name': model_name,
            'error': str(e)
        }

def main():
    try:
        args = setup_args()
        
        if args.action == 'list':
            installed_models = list_installed_models()
            print(json.dumps(installed_models))
            sys.exit(0)
        
        elif args.action == 'download':
            if not args.model:
                logger.error("Model parameter is required for download action")
                sys.exit(1)
            
            success = download_model(args.model)
            if success:
                print(f"Model {args.model} downloaded successfully")
                sys.exit(0)
            else:
                sys.exit(1)
        
        elif args.action == 'verify':
            if not args.model:
                logger.error("Model parameter is required for verify action")
                sys.exit(1)
            
            result = verify_model(args.model)
            print(json.dumps(result))
            sys.exit(0 if result['valid'] else 1)
        
    except Exception as e:
        logger.exception(f"Unhandled exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Deliverables
- Polished popup UI with animations and audio level visualization
- Comprehensive settings interface with model selection
- Model management functionality for downloading and verifying models
- Visual and audio feedback mechanisms
- User guidance and help system
- Centralized theme and styling system

## Success Criteria
- Popup UI provides clear visual feedback during dictation
- Settings interface allows customization of all application parameters
- Models can be downloaded, verified, and selected
- User receives appropriate feedback through visual and audio cues
- First-run experience guides users through setup
- All UI components follow the centralized theme

## Dependencies
- electron-positioner for popup positioning
- electron-store for settings persistence
- Material Design components for UI
- Audio visualization libraries
- Sound effect assets

## Timeline
- Enhanced popup UI: 3 days
- Comprehensive settings interface: 3 days
- Model management: 2 days
- Feedback mechanisms: 2 days
- User guidance and help: 2 days
- Testing and refinement: 2 days

**Total Duration: 14 days** 