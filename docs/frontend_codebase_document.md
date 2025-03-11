# Frontend Codebase Document - Whisper Dictation App

This document outlines the frontend architecture, component structure, and design principles used in the Whisper Dictation App. As an Electron application, the frontend plays a critical role in providing visual feedback during dictation, while maintaining a minimalist approach.

## Architecture Overview

The Whisper Dictation App follows a minimal frontend architecture, primarily focused on the dictation popup and settings interface. The frontend is built using standard web technologies (HTML, CSS, JavaScript) within the Electron framework.

### Key Architectural Principles

1. **Minimalist Design**: The UI is intentionally simple and unobtrusive, focusing on providing essential feedback during dictation
2. **Material Design Inspired**: Visual elements follow Material Design principles for a clean, modern appearance
3. **Responsive Feedback**: Real-time visual indicators for audio levels and processing status
4. **Performant Rendering**: Optimized for minimal CPU usage, especially during dictation
5. **Process Separation**: Clear separation between main process (core functionality) and renderer process (UI)

## Component Structure

### Core Components

#### 1. DictationPopup

The main UI component that appears during dictation.

**Features**:
- Appears when dictation is active
- Shows audio level visualization
- Indicates processing status
- Displays transcription results briefly
- Transitions smoothly between states

**File**: `src/renderer/components/DictationPopup.js`

```javascript
// Component structure example
class DictationPopup {
  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('dictation-popup');
    this.statusElement = document.createElement('div');
    this.statusElement.classList.add('status');
    this.volumeIndicator = document.createElement('div');
    this.volumeIndicator.classList.add('volume-indicator');
    
    this.element.appendChild(this.statusElement);
    this.element.appendChild(this.volumeIndicator);
    
    document.body.appendChild(this.element);
    
    this.hide(); // Initially hidden
  }
  
  show() {
    this.element.classList.add('visible');
  }
  
  hide() {
    this.element.classList.remove('visible');
  }
  
  updateStatus(status) {
    this.statusElement.textContent = status;
  }
  
  updateVolumeLevel(level) {
    this.volumeIndicator.style.width = `${level * 100}%`;
  }
}
```

#### 2. SettingsPanel

The settings interface accessible from the system tray.

**Features**:
- Provides access to all configurable options
- Organizes settings into logical categories
- Provides real-time feedback for changes
- Saves settings to persistent storage

**File**: `src/renderer/components/Settings.js`

#### 3. StatusIndicator

Visual indicator for the current application state.

**Features**:
- Shows the current dictation state (idle, listening, processing)
- Uses color and animation to indicate state
- Provides subtle but clear feedback

**File**: `src/renderer/components/StatusIndicator.js`

## Frontend Technologies

### Core Libraries and Frameworks

| Technology | Purpose | Implementation |
|------------|---------|----------------|
| HTML5 | Structure | Standard semantic markup |
| CSS3 | Styling | Custom styles with CSS variables for theming |
| JavaScript (ES6+) | Logic | Vanilla JS with modern features |
| Electron | Framework | Provides window management and system integration |

### Design System

The application uses a custom lightweight design system inspired by Material Design principles:

**Colors**:
```css
:root {
  /* Theme colors */
  --theme-primary: #4285F4;
  --theme-secondary: #34A853;
  --theme-error: #EA4335;
  --theme-background: #FFFFFF;
  --theme-surface: #F8F9FA;
  --theme-on-primary: #FFFFFF;
  --theme-on-secondary: #FFFFFF;
  --theme-on-background: #202124;
  --theme-on-surface: #5F6368;
  
  /* Dark theme variants */
  --theme-dark-background: #202124;
  --theme-dark-surface: #303134;
  --theme-dark-on-background: #E8EAED;
  --theme-dark-on-surface: #9AA0A6;
}

/* Applying theme based on system preference */
@media (prefers-color-scheme: dark) {
  :root {
    --theme-background: var(--theme-dark-background);
    --theme-surface: var(--theme-dark-surface);
    --theme-on-background: var(--theme-dark-on-background);
    --theme-on-surface: var(--theme-dark-on-surface);
  }
}
```

**Typography**:
```css
:root {
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  --font-size-small: 12px;
  --font-size-regular: 14px;
  --font-size-large: 16px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}
```

**Animation**:
```css
:root {
  --animation-standard: 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  --animation-fast: 0.1s cubic-bezier(0.4, 0.0, 0.2, 1);
  --animation-slow: 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

## UI States and Transitions

The frontend handles the following state transitions with appropriate visual feedback:

1. **Idle → Listening**:
   - Popup appears with fade-in animation
   - Status changes to "Listening"
   - Volume indicator becomes active

2. **Listening → Processing**:
   - Status changes to "Processing"
   - Volume indicator is replaced with progress indicator
   - Color shift to indicate processing state

3. **Processing → Result**:
   - Brief display of transcribed text
   - Success indicator animation
   - Automatic transition to idle state after feedback

4. **Error States**:
   - Visual error indication
   - Error message display
   - Option to retry or dismiss

## IPC Communication

The frontend communicates with the main process through Electron's IPC (Inter-Process Communication) channels:

```javascript
// Listening for events from main process
window.electronAPI.onDictationStart(() => {
  dictationPopup.show();
  dictationPopup.updateStatus('Listening...');
});

window.electronAPI.onDictationStatus((event, data) => {
  dictationPopup.updateVolumeLevel(data.volumeLevel);
});

window.electronAPI.onDictationResult((event, data) => {
  dictationPopup.updateStatus('Transcribed: ' + data.text.substring(0, 30) + '...');
  setTimeout(() => {
    dictationPopup.hide();
  }, 2000);
});

// Processing state updates
window.electronAPI.onProcessingStatus((event, data) => {
  if (data.status === 'loading-model') {
    dictationPopup.updateStatus('Loading Whisper model...');
  } else if (data.status === 'transcribing') {
    dictationPopup.updateStatus('Transcribing audio...');
  } else if (data.status === 'error') {
    dictationPopup.updateStatus('Error: ' + data.message);
    dictationPopup.showError();
  }
});

// Sending events to main process
document.getElementById('settingsForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const settings = Object.fromEntries(formData.entries());
  window.electronAPI.saveSettings(settings);
});
```

## Settings Interface

The settings interface includes additional options for the Python Whisper integration:

```html
<div class="settings-section">
  <h3>Speech Recognition</h3>
  
  <div class="setting-item">
    <label for="whisperModel">Whisper Model:</label>
    <select id="whisperModel" name="speech.whisperModel">
      <option value="tiny">Tiny (fast, less accurate)</option>
      <option value="base">Base</option>
      <option value="small">Small</option>
      <option value="medium" selected>Medium (recommended)</option>
      <option value="large">Large (slow, most accurate)</option>
    </select>
  </div>
  
  <div class="setting-item">
    <label for="language">Language:</label>
    <select id="language" name="speech.language">
      <option value="auto" selected>Auto-detect</option>
      <option value="en">English</option>
      <!-- Additional languages -->
    </select>
  </div>
  
  <div class="setting-item">
    <label for="useGPU">
      <input type="checkbox" id="useGPU" name="speech.useGPU" checked>
      Use GPU acceleration (if available)
    </label>
  </div>
</div>

<div class="settings-section">
  <h3>Advanced Settings</h3>
  
  <div class="setting-item">
    <label for="pythonPath">Python Path (optional):</label>
    <input type="text" id="pythonPath" name="advanced.pythonPath" placeholder="Leave empty for auto-detection">
  </div>
  
  <!-- Additional advanced settings -->
</div>
```

## Feedback Indicators

The application includes feedback indicators for model and processing state:

1. **Model Loading Indicator**:
   - Shows when Whisper model is being loaded
   - Progress indicator for larger models
   - Device indication (CPU/GPU)

2. **Processing Progress**:
   - Shows transcription progress
   - For longer recordings, estimates remaining time

3. **Memory Usage Indicator** (Advanced Mode):
   - Shows memory usage during model loading and processing
   - Helps users understand resource requirements

## Accessibility Considerations

The frontend implements the following accessibility features:

1. **Color Contrast**: All text meets WCAG AA standards for contrast
2. **Keyboard Navigation**: Settings interface fully navigable by keyboard
3. **Screen Reader Support**: Proper aria labels and roles
4. **System Preferences**: Respects system theme (light/dark) and font size settings

## Performance Optimizations

To ensure minimal resource usage, especially during dictation, the frontend implements:

1. **Efficient DOM Updates**: Minimal DOM manipulation
2. **Throttled Animations**: Volume indicator updates are throttled
3. **Hardware Acceleration**: CSS transforms and opacity for smooth animations
4. **Lazy Loading**: Settings panel is loaded only when needed

## Testing Strategy

The frontend components are tested using:

1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interactions and IPC communication
3. **Visual Regression Tests**: UI appearance across states

## Development Guidelines

When modifying or extending the frontend:

1. Follow the established design system
2. Maintain the minimalist approach
3. Prioritize performance and low resource usage
4. Ensure all states have appropriate visual feedback
5. Test across both light and dark themes 