# Phase 1: Foundation Setup

## Overview
Phase 1 focuses on establishing the core foundation of the Whisper Dictation App. This phase will set up the basic Electron application structure, configure the development environment, and implement the essential system integration components.

## Goals
- Set up the Electron application framework
- Configure the development environment with all necessary tools
- Implement system tray integration
- Create the basic application architecture
- Set up Python environment detection and validation

## Tasks

### 1. Project Initialization
- [ ] Initialize the Electron project with pnpm
- [ ] Configure ESLint, Prettier, and other development tools
- [ ] Set up the basic file structure according to the file structure document
- [ ] Create the main process entry point
- [ ] Implement a basic renderer process

### 2. System Tray Integration
- [ ] Create system tray icon and menu
- [ ] Implement basic application state management
- [ ] Add quit, settings, and about options to the tray menu
- [ ] Ensure proper tray behavior across operating systems

### 3. Python Environment Setup
- [ ] Create Python environment detection script
- [ ] Implement validation for required Python packages
- [ ] Set up error handling for missing dependencies
- [ ] Create a user-friendly setup guide for Python dependencies

### 4. Basic IPC Communication
- [ ] Set up secure IPC channels between main and renderer processes
- [ ] Implement preload scripts following Electron security best practices
- [ ] Create basic communication patterns for future functionality

### 5. Application Configuration
- [ ] Implement persistent settings storage
- [ ] Create default configuration values
- [ ] Set up configuration loading and saving mechanisms
- [ ] Add basic settings UI shell (to be expanded in later phases)

## Technical Specifications

### Constants and Configuration
```javascript
// src/main/constants.js
const CONSTANTS = {
  APP_NAME: "Whisper Dictation",
  APP_VERSION: "0.1.0",
  TRAY_ICON_PATH: path.join(__dirname, '../renderer/assets/icons/tray.png'),
  DEFAULT_SETTINGS: {
    modelSize: "base",
    shortcutKey: "home",
    startAtLogin: true,
    showNotifications: true
  },
  PYTHON_PATH: process.platform === 'win32' ? 'python' : 'python3',
  TEMP_AUDIO_DIR: path.join(app.getPath('temp'), 'whisper-dictation')
};

module.exports = CONSTANTS;
```

### Error Handling
```javascript
// src/main/logger.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const electronLog = require('electron-log');

// Configure logger
electronLog.transports.file.resolvePath = () => path.join(
  app.getPath('userData'),
  'logs/main.log'
);

const logger = {
  info: (message) => {
    console.log(message);
    electronLog.info(message);
  },
  error: (message, error) => {
    console.error(message, error);
    electronLog.error(message, error);
  },
  warn: (message) => {
    console.warn(message);
    electronLog.warn(message);
  },
  exception: (error) => {
    console.error('Exception:', error);
    electronLog.error('Exception:', error);
  }
};

module.exports = logger;
```

### Python Environment Validation
```javascript
// src/main/services/pythonValidator.js
const { exec } = require('child_process');
const { PYTHON_PATH } = require('../constants');
const logger = require('../logger');

async function validatePythonEnvironment() {
  try {
    // Check Python installation
    const pythonVersion = await new Promise((resolve, reject) => {
      exec(`${PYTHON_PATH} --version`, (error, stdout) => {
        if (error) {
          reject(new Error('Python not found'));
          return;
        }
        resolve(stdout.trim());
      });
    });
    
    // Check for required packages
    const requiredPackages = ['whisper', 'torch', 'numpy', 'ffmpeg-python'];
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
      try {
        await new Promise((resolve, reject) => {
          exec(`${PYTHON_PATH} -c "import ${pkg}"`, (error) => {
            if (error) {
              missingPackages.push(pkg);
            }
            resolve();
          });
        });
      } catch (error) {
        logger.exception(error);
      }
    }
    
    return {
      pythonInstalled: true,
      pythonVersion,
      missingPackages,
      isValid: missingPackages.length === 0
    };
  } catch (error) {
    logger.exception(error);
    return {
      pythonInstalled: false,
      pythonVersion: null,
      missingPackages: [],
      isValid: false,
      error: error.message
    };
  }
}

module.exports = { validatePythonEnvironment };
```

## Deliverables
- Functional Electron application shell
- System tray integration with basic menu
- Python environment validation utility
- Configuration management system
- Basic project structure following the file structure document

## Success Criteria
- Application launches successfully and appears in the system tray
- Python environment can be validated
- Settings can be saved and loaded
- Project structure follows the defined architecture
- All error handling is properly implemented with descriptive messages

## Dependencies
- Node.js and pnpm
- Electron
- Python 3.7-3.11
- ESLint and Prettier
- electron-store for configuration
- electron-log for logging

## Timeline
- Project initialization: 2 days
- System tray integration: 1 day
- Python environment setup: 2 days
- IPC communication: 1 day
- Application configuration: 1 day
- Testing and refinement: 1 day

**Total Duration: 8 days** 