# Phase 5: Packaging and Distribution

## Overview
Phase 5 focuses on preparing the Whisper Dictation App for distribution to end users. This phase will handle packaging the application for macOS, creating installers, implementing auto-updates, and ensuring a smooth user experience from installation to updates.

## Goals
- Package the application for macOS
- Create a user-friendly installer
- Implement auto-update functionality
- Prepare documentation and help resources
- Ensure proper code signing and notarization
- Create a distribution strategy

## Tasks

### 1. Application Packaging
- [ ] Configure electron-builder for macOS packaging
- [ ] Set up proper application metadata
- [ ] Create application icons in all required formats
- [ ] Configure build scripts for production
- [ ] Implement resource bundling and optimization
- [ ] Set up proper file permissions

### 2. Installer Creation
- [ ] Create a user-friendly installer for macOS
- [ ] Implement first-run experience
- [ ] Add license agreement and terms of service
- [ ] Configure installation options
- [ ] Implement dependency checking during installation
- [ ] Create uninstallation process

### 3. Auto-Update Implementation
- [ ] Set up auto-update infrastructure
- [ ] Implement update checking mechanism
- [ ] Create update notification UI
- [ ] Add download and installation process for updates
- [ ] Implement rollback mechanism for failed updates
- [ ] Add update settings in preferences

### 4. Documentation and Help
- [ ] Create comprehensive user documentation
- [ ] Implement in-app help system
- [ ] Add tooltips and contextual help
- [ ] Create troubleshooting guide
- [ ] Prepare FAQ and knowledge base
- [ ] Add keyboard shortcut reference

### 5. Code Signing and Notarization
- [ ] Obtain Apple Developer ID certificate
- [ ] Implement code signing process
- [ ] Set up notarization workflow
- [ ] Configure hardened runtime
- [ ] Add entitlements for required permissions
- [ ] Implement security best practices

## Technical Specifications

### Electron Builder Configuration
```javascript
// electron-builder.json
{
  "appId": "com.yourdomain.whisperdictation",
  "productName": "Whisper Dictation",
  "copyright": "Copyright © 2023 Your Name",
  "directories": {
    "output": "dist",
    "buildResources": "resources"
  },
  "files": [
    "package.json",
    "build/**/*",
    "node_modules/**/*",
    "src/python/**/*",
    "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!**/node_modules/*.d.ts",
    "!**/node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  "extraResources": [
    {
      "from": "resources",
      "to": "resources"
    }
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      "dmg",
      "zip"
    ],
    "icon": "resources/icons/icon.icns",
    "darkModeSupport": true,
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "resources/entitlements.plist",
    "entitlementsInherit": "resources/entitlements.plist",
    "extendInfo": {
      "NSMicrophoneUsageDescription": "This app requires microphone access for speech recognition.",
      "NSAppleEventsUsageDescription": "This app requires access to control other applications to insert text at the cursor position."
    }
  },
  "dmg": {
    "background": "resources/dmg-background.png",
    "icon": "resources/icons/icon.icns",
    "iconSize": 128,
    "contents": [
      {
        "x": 380,
        "y": 240,
        "type": "link",
        "path": "/Applications"
      },
      {
        "x": 122,
        "y": 240,
        "type": "file"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  },
  "afterSign": "scripts/notarize.js",
  "publish": {
    "provider": "github",
    "owner": "yourusername",
    "repo": "whisper-dictation"
  }
}
```

### Notarization Script
```javascript
// scripts/notarize.js
const { notarize } = require('electron-notarize');
const { build } = require('../package.json');
const path = require('path');
const logger = require('../src/main/logger');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    return;
  }
  
  // Skip notarization in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('Skipping notarization in development mode');
    return;
  }
  
  // Get app name from build configuration
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  
  logger.info(`Notarizing ${appName} at ${appPath}`);
  
  try {
    // Ensure environment variables are set
    const { APPLE_ID, APPLE_ID_PASSWORD, TEAM_ID } = process.env;
    
    if (!APPLE_ID || !APPLE_ID_PASSWORD || !TEAM_ID) {
      throw new Error('Required environment variables for notarization are missing');
    }
    
    // Notarize the app
    await notarize({
      appBundleId: build.appId,
      appPath,
      appleId: APPLE_ID,
      appleIdPassword: APPLE_ID_PASSWORD,
      teamId: TEAM_ID
    });
    
    logger.info(`Successfully notarized ${appName}`);
  } catch (error) {
    logger.exception(error);
    throw error;
  }
};
```

### Auto-Update Service
```javascript
// src/main/services/updater.js
const { app, autoUpdater, dialog } = require('electron');
const logger = require('../logger');
const { getSettings, saveSettings } = require('./settings');

// Configure update server URL
const UPDATE_SERVER_URL = 'https://update.yourdomain.com';

// Initialize auto-updater
function initAutoUpdater() {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.info('Skipping auto-updater in development mode');
      return false;
    }
    
    // Get settings
    const settings = getSettings();
    
    // Skip if auto-updates are disabled
    if (settings.autoUpdates === false) {
      logger.info('Auto-updates are disabled in settings');
      return false;
    }
    
    // Configure update server
    const platform = process.platform === 'darwin' ? 'osx' : process.platform;
    const version = app.getVersion();
    const url = `${UPDATE_SERVER_URL}/${platform}/${version}`;
    
    autoUpdater.setFeedURL({ url });
    
    // Check for updates
    checkForUpdates();
    
    // Set up event listeners
    setupUpdateEvents();
    
    // Schedule periodic update checks
    const checkInterval = settings.updateCheckInterval || 24 * 60 * 60 * 1000; // Default: once a day
    setInterval(checkForUpdates, checkInterval);
    
    logger.info('Auto-updater initialized');
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Check for updates
function checkForUpdates(silent = true) {
  try {
    logger.info('Checking for updates...');
    
    // Set silent flag
    autoUpdater.autoDownload = false;
    
    // Check for updates
    autoUpdater.checkForUpdates();
    
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Set up auto-updater event listeners
function setupUpdateEvents() {
  // Update available
  autoUpdater.on('update-available', (info) => {
    logger.info('Update available:', info);
    
    // Show update notification
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) of Whisper Dictation is available.`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        // Download the update
        autoUpdater.downloadUpdate();
      }
    });
  });
  
  // Update not available
  autoUpdater.on('update-not-available', () => {
    logger.info('No updates available');
  });
  
  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded:', info);
    
    // Show installation prompt
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded',
      detail: 'A new version has been downloaded. Restart the application to apply the updates.',
      buttons: ['Restart', 'Later'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        // Quit and install
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  // Error
  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater error:', error);
  });
}

// Toggle auto-updates
function toggleAutoUpdates(enabled) {
  try {
    const settings = getSettings();
    settings.autoUpdates = enabled;
    saveSettings(settings);
    
    logger.info(`Auto-updates ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  toggleAutoUpdates
};
```

### Entitlements File
```xml
<!-- resources/entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <key>com.apple.security.automation.apple-events</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
</dict>
</plist>
```

### First-Run Experience
```javascript
// src/main/services/firstRun.js
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');
const { getSettings, saveSettings } = require('./settings');
const { validatePythonEnvironment } = require('./pythonValidator');

// Check if this is the first run
function isFirstRun() {
  try {
    const settings = getSettings();
    return settings.firstRun !== false;
  } catch (error) {
    logger.exception(error);
    return true; // Assume first run on error
  }
}

// Show first-run window
function showFirstRunWindow() {
  try {
    // Create window
    const firstRunWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Welcome to Whisper Dictation',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload/preload.js')
      },
      resizable: false,
      fullscreenable: false,
      backgroundColor: '#FFFFFF',
      show: false
    });
    
    // Load first-run page
    firstRunWindow.loadFile(path.join(__dirname, '../../renderer/first-run.html'));
    
    // Show window when ready
    firstRunWindow.once('ready-to-show', () => {
      firstRunWindow.show();
    });
    
    // Handle external links
    firstRunWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    
    // Check Python environment
    validatePythonEnvironment().then(result => {
      firstRunWindow.webContents.send('python-environment', result);
    });
    
    // Listen for setup completion
    app.on('first-run-complete', () => {
      // Update settings
      const settings = getSettings();
      settings.firstRun = false;
      saveSettings(settings);
      
      // Close window
      if (!firstRunWindow.isDestroyed()) {
        firstRunWindow.close();
      }
      
      logger.info('First-run setup completed');
    });
    
    return firstRunWindow;
  } catch (error) {
    logger.exception(error);
    return null;
  }
}

// Complete first-run setup
function completeFirstRunSetup() {
  try {
    app.emit('first-run-complete');
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

module.exports = {
  isFirstRun,
  showFirstRunWindow,
  completeFirstRunSetup
};
```

### Build Script
```javascript
// scripts/build.js
const { build } = require('electron-builder');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Build configuration
const config = {
  config: path.join(__dirname, '../electron-builder.json'),
  publish: process.env.PUBLISH === 'true' ? 'always' : 'never'
};

// Ensure Python scripts are included
function preparePythonScripts() {
  console.log('Preparing Python scripts...');
  
  // Create requirements.txt for bundling
  const pythonDir = path.join(__dirname, '../src/python');
  const requirementsPath = path.join(pythonDir, 'requirements.txt');
  
  if (!fs.existsSync(requirementsPath)) {
    fs.writeFileSync(requirementsPath, 'whisper\ntorch\nnumpy\nffmpeg-python\n');
  }
  
  console.log('Python scripts prepared');
}

// Build the application
async function buildApp() {
  try {
    console.log('Building application...');
    
    // Prepare Python scripts
    preparePythonScripts();
    
    // Build the app
    const result = await build(config);
    
    console.log('Build completed successfully:', result);
    return result;
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildApp();
```

### Help Documentation Template
```html
<!-- src/renderer/help.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Whisper Dictation Help</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="help-container">
    <header class="help-header">
      <h1>Whisper Dictation Help</h1>
      <p>Version <span id="app-version">1.0.0</span></p>
    </header>
    
    <nav class="help-nav">
      <ul>
        <li><a href="#getting-started">Getting Started</a></li>
        <li><a href="#basic-usage">Basic Usage</a></li>
        <li><a href="#settings">Settings</a></li>
        <li><a href="#advanced-features">Advanced Features</a></li>
        <li><a href="#troubleshooting">Troubleshooting</a></li>
        <li><a href="#keyboard-shortcuts">Keyboard Shortcuts</a></li>
      </ul>
    </nav>
    
    <main class="help-content">
      <section id="getting-started">
        <h2>Getting Started</h2>
        <p>Welcome to Whisper Dictation, a lightweight, system-wide dictation tool that enables seamless voice-to-text transcription using local processing capabilities.</p>
        
        <h3>System Requirements</h3>
        <ul>
          <li>macOS 10.15 (Catalina) or newer</li>
          <li>Multi-core processor (4+ cores recommended)</li>
          <li>8GB RAM minimum (16GB recommended)</li>
          <li>2GB available storage space</li>
          <li>Microphone (built-in or external)</li>
        </ul>
        
        <h3>First-Time Setup</h3>
        <p>When you first launch Whisper Dictation, the setup wizard will guide you through:</p>
        <ol>
          <li>Checking for required dependencies</li>
          <li>Setting up Python environment</li>
          <li>Downloading the Whisper model</li>
          <li>Configuring keyboard shortcuts</li>
          <li>Setting startup preferences</li>
        </ol>
      </section>
      
      <section id="basic-usage">
        <h2>Basic Usage</h2>
        
        <h3>Starting Dictation</h3>
        <p>To start dictation, press and hold the Home key (or your configured shortcut). A small popup will appear indicating that dictation is active.</p>
        
        <h3>Dictating Text</h3>
        <p>While holding the key, speak clearly into your microphone. The audio level indicator will show your voice input level.</p>
        
        <h3>Finishing Dictation</h3>
        <p>Release the key when you're done speaking. The app will process your speech and insert the transcribed text at the current cursor position.</p>
      </section>
      
      <!-- Additional sections would be included here -->
    </main>
    
    <footer class="help-footer">
      <p>&copy; 2023 Your Name. All rights reserved.</p>
    </footer>
  </div>
  
  <script src="help.js"></script>
</body>
</html>
```

## Deliverables
- Packaged application for macOS
- User-friendly installer with first-run experience
- Auto-update implementation
- Comprehensive documentation and help resources
- Code signed and notarized application
- Distribution strategy and release notes

## Success Criteria
- Application installs and runs correctly on macOS
- First-run experience guides users through setup
- Auto-updates work reliably
- Documentation is comprehensive and accessible
- Application passes Apple's notarization process
- Users can easily install, use, and update the application

## Dependencies
- electron-builder for packaging
- electron-notarize for notarization
- Apple Developer ID certificate
- Documentation tools
- Auto-update server infrastructure

## Timeline
- Application packaging: 2 days
- Installer creation: 2 days
- Auto-update implementation: 2 days
- Documentation and help: 3 days
- Code signing and notarization: 2 days
- Testing and refinement: 2 days

**Total Duration: 13 days** 