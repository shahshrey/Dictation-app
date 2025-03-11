# Phase 4: Optimization and Advanced Features

## Overview
Phase 4 focuses on optimizing the Whisper Dictation App for performance and reliability while adding advanced features to enhance the user experience. This phase will build upon the foundation, core functionality, and UI enhancements from previous phases to create a more powerful and efficient application.

## Goals
- Optimize application performance and resource usage
- Implement advanced dictation features
- Add language and punctuation support
- Enhance error handling and recovery mechanisms
- Implement advanced text processing options

## Tasks

### 1. Performance Optimization
- [ ] Implement lazy loading of non-critical components
- [ ] Optimize Python-Node.js communication
- [ ] Add GPU acceleration detection and utilization
- [ ] Implement memory management for large models
- [ ] Optimize audio processing pipeline
- [ ] Add caching mechanisms for frequently used resources

### 2. Advanced Dictation Features
- [ ] Implement continuous dictation mode
- [ ] Add command recognition for basic text formatting
- [ ] Create context-aware text insertion
- [ ] Implement dictation history with editing capabilities
- [ ] Add noise cancellation and audio preprocessing
- [ ] Implement speaker recognition (if multiple users)

### 3. Language and Punctuation Support
- [ ] Add support for multiple languages
- [ ] Implement automatic language detection
- [ ] Create punctuation and formatting options
- [ ] Add specialized vocabulary for different domains
- [ ] Implement custom dictionary support
- [ ] Create language-specific optimizations

### 4. Error Handling and Recovery
- [ ] Implement comprehensive error detection
- [ ] Create automatic recovery mechanisms
- [ ] Add detailed logging for troubleshooting
- [ ] Implement crash reporting (optional)
- [ ] Create self-healing capabilities for common issues
- [ ] Add diagnostic tools for system compatibility

### 5. Advanced Text Processing
- [ ] Implement smart capitalization
- [ ] Add number and date formatting
- [ ] Create special character handling
- [ ] Implement context-aware corrections
- [ ] Add text expansion capabilities
- [ ] Create template support for common phrases

## Technical Specifications

### Performance Monitoring Service
```javascript
// src/main/services/performance.js
const os = require('os');
const { app } = require('electron');
const logger = require('../logger');

// Constants for performance thresholds
const PERFORMANCE_THRESHOLDS = {
  CPU_HIGH: 80, // Percentage
  MEMORY_HIGH: 80, // Percentage
  BATTERY_LOW: 20, // Percentage
  DISK_SPACE_LOW: 500 * 1024 * 1024 // 500MB in bytes
};

// Performance metrics
let metrics = {
  cpuUsage: 0,
  memoryUsage: 0,
  batteryLevel: 100,
  diskSpace: 0,
  modelLoadTime: 0,
  transcriptionTime: 0,
  audioBufferSize: 0
};

// Initialize performance monitoring
function initPerformanceMonitoring() {
  try {
    // Start periodic monitoring
    setInterval(monitorSystemResources, 60000); // Check every minute
    
    // Initial check
    monitorSystemResources();
    
    logger.info('Performance monitoring initialized');
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Monitor system resources
async function monitorSystemResources() {
  try {
    // CPU usage (average across all cores)
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idlePercentage = totalIdle / totalTick * 100;
    metrics.cpuUsage = 100 - idlePercentage;
    
    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    metrics.memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // Disk space (in app's user data directory)
    const { size, free } = await getDiskSpace(app.getPath('userData'));
    metrics.diskSpace = free;
    
    // Check for performance issues
    checkPerformanceIssues();
    
    return metrics;
  } catch (error) {
    logger.exception(error);
    return null;
  }
}

// Get disk space information
function getDiskSpace(directory) {
  return new Promise((resolve, reject) => {
    // This is a placeholder - in a real implementation, you would use
    // a platform-specific method or library to get disk space
    // For example, using 'diskusage' npm package
    
    // Mock implementation
    resolve({
      size: 1000000000, // 1GB
      free: 500000000   // 500MB
    });
  });
}

// Check for performance issues
function checkPerformanceIssues() {
  const issues = [];
  
  // CPU usage check
  if (metrics.cpuUsage > PERFORMANCE_THRESHOLDS.CPU_HIGH) {
    issues.push({
      type: 'cpu',
      message: `High CPU usage detected: ${Math.round(metrics.cpuUsage)}%`,
      severity: 'warning'
    });
  }
  
  // Memory usage check
  if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_HIGH) {
    issues.push({
      type: 'memory',
      message: `High memory usage detected: ${Math.round(metrics.memoryUsage)}%`,
      severity: 'warning'
    });
  }
  
  // Disk space check
  if (metrics.diskSpace < PERFORMANCE_THRESHOLDS.DISK_SPACE_LOW) {
    issues.push({
      type: 'disk',
      message: `Low disk space detected: ${Math.round(metrics.diskSpace / (1024 * 1024))}MB`,
      severity: 'warning'
    });
  }
  
  // Log and notify about issues
  if (issues.length > 0) {
    issues.forEach(issue => {
      logger.warn(`Performance issue: ${issue.message}`);
    });
    
    // Emit event for UI notification
    app.emit('performance-issues', issues);
  }
  
  return issues;
}

// Record model load time
function recordModelLoadTime(startTime, endTime) {
  metrics.modelLoadTime = endTime - startTime;
  logger.info(`Model load time: ${metrics.modelLoadTime}ms`);
}

// Record transcription time
function recordTranscriptionTime(startTime, endTime) {
  metrics.transcriptionTime = endTime - startTime;
  logger.info(`Transcription time: ${metrics.transcriptionTime}ms`);
}

// Record audio buffer size
function recordAudioBufferSize(sizeInBytes) {
  metrics.audioBufferSize = sizeInBytes;
}

// Get current performance metrics
function getPerformanceMetrics() {
  return metrics;
}

module.exports = {
  initPerformanceMonitoring,
  monitorSystemResources,
  recordModelLoadTime,
  recordTranscriptionTime,
  recordAudioBufferSize,
  getPerformanceMetrics,
  PERFORMANCE_THRESHOLDS
};
```

### Continuous Dictation Mode
```javascript
// src/main/services/continuousDictation.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { Microphone } = require('node-microphone');
const logger = require('../logger');
const { TEMP_AUDIO_DIR } = require('../constants');
const { transcribeAudio } = require('./transcribe');
const { insertText } = require('./text');
const { emitStatusUpdate } = require('./status');

// Constants
const CONTINUOUS_MODE = {
  CHUNK_DURATION: 5000, // 5 seconds per chunk
  MAX_SILENCE_DURATION: 2000, // 2 seconds of silence to consider end of speech
  SILENCE_THRESHOLD: 5 // Audio level threshold to consider silence
};

// State variables
let isContinuousModeActive = false;
let microphone = null;
let audioStream = null;
let audioChunks = [];
let currentChunkStartTime = 0;
let lastAudioLevel = 0;
let lastAudioTime = 0;
let silenceTimer = null;
let processingChunk = false;

// Start continuous dictation
function startContinuousDictation() {
  try {
    if (isContinuousModeActive) {
      return true; // Already active
    }
    
    // Initialize microphone
    microphone = new Microphone();
    
    // Start recording
    audioStream = microphone.startRecording();
    audioChunks = [];
    currentChunkStartTime = Date.now();
    isContinuousModeActive = true;
    
    // Update status
    emitStatusUpdate('continuous-listening', 'Continuous dictation active...');
    
    // Collect audio data
    audioStream.on('data', (data) => {
      audioChunks.push(data);
      
      // Calculate audio level (simplified)
      const audioLevel = calculateAudioLevel(data);
      lastAudioLevel = audioLevel;
      lastAudioTime = Date.now();
      
      // Reset silence timer if audio level is above threshold
      if (audioLevel > CONTINUOUS_MODE.SILENCE_THRESHOLD) {
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (!silenceTimer) {
        // Start silence timer if audio level is below threshold
        silenceTimer = setTimeout(() => {
          // Process current chunk if we have enough audio and not already processing
          if (audioChunks.length > 0 && !processingChunk) {
            processCurrentChunk();
          }
        }, CONTINUOUS_MODE.MAX_SILENCE_DURATION);
      }
      
      // Process chunk if duration exceeds maximum
      const chunkDuration = Date.now() - currentChunkStartTime;
      if (chunkDuration >= CONTINUOUS_MODE.CHUNK_DURATION && !processingChunk) {
        processCurrentChunk();
      }
    });
    
    audioStream.on('error', (error) => {
      logger.exception(error);
      stopContinuousDictation();
      emitStatusUpdate('error', 'Failed to record audio');
    });
    
    logger.info('Started continuous dictation');
    return true;
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Failed to start continuous dictation');
    return false;
  }
}

// Stop continuous dictation
function stopContinuousDictation() {
  try {
    if (!isContinuousModeActive) {
      return true; // Already inactive
    }
    
    // Clear silence timer
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    
    // Process any remaining audio
    if (audioChunks.length > 0 && !processingChunk) {
      processCurrentChunk();
    }
    
    // Stop recording
    if (microphone) {
      microphone.stopRecording();
      microphone = null;
    }
    
    audioStream = null;
    isContinuousModeActive = false;
    
    // Update status
    emitStatusUpdate('idle', 'Continuous dictation stopped');
    
    logger.info('Stopped continuous dictation');
    return true;
  } catch (error) {
    logger.exception(error);
    emitStatusUpdate('error', 'Failed to stop continuous dictation');
    return false;
  }
}

// Process current audio chunk
async function processCurrentChunk() {
  try {
    processingChunk = true;
    
    // Save current chunks and reset
    const chunksToProcess = [...audioChunks];
    audioChunks = [];
    currentChunkStartTime = Date.now();
    
    // Update status
    emitStatusUpdate('processing', 'Processing speech...');
    
    // Save audio to temp file
    const tempFilePath = path.join(TEMP_AUDIO_DIR, `continuous-${Date.now()}.wav`);
    
    fs.writeFile(tempFilePath, Buffer.concat(chunksToProcess), async (err) => {
      if (err) {
        logger.exception(err);
        emitStatusUpdate('error', 'Failed to save audio');
        processingChunk = false;
        return;
      }
      
      try {
        // Process the audio with Whisper
        const transcribedText = await transcribeAudio(tempFilePath, true); // true = continuous mode
        
        // Insert text if transcription was successful
        if (transcribedText && transcribedText.trim()) {
          insertText(transcribedText + ' '); // Add space after each chunk
        }
        
        // Update status if still in continuous mode
        if (isContinuousModeActive) {
          emitStatusUpdate('continuous-listening', 'Continuous dictation active...');
        }
      } catch (error) {
        logger.exception(error);
        emitStatusUpdate('error', 'Transcription failed');
      } finally {
        processingChunk = false;
      }
    });
  } catch (error) {
    logger.exception(error);
    processingChunk = false;
  }
}

// Calculate audio level from buffer (simplified)
function calculateAudioLevel(buffer) {
  // This is a simplified implementation
  // In a real app, you would analyze the audio data more accurately
  
  let sum = 0;
  const samples = buffer.length / 2; // Assuming 16-bit audio
  
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i);
    sum += Math.abs(sample);
  }
  
  return sum / samples;
}

// Check if continuous mode is active
function isContinuousMode() {
  return isContinuousModeActive;
}

module.exports = {
  startContinuousDictation,
  stopContinuousDictation,
  isContinuousMode,
  CONTINUOUS_MODE
};
```

### Language Support Service
```javascript
// src/main/services/languageSupport.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('../logger');
const { getSettings, saveSettings } = require('./settings');

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', default: true },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' }
];

// Custom dictionaries directory
const DICTIONARIES_DIR = path.join(app.getPath('userData'), 'dictionaries');

// Ensure dictionaries directory exists
if (!fs.existsSync(DICTIONARIES_DIR)) {
  try {
    fs.mkdirSync(DICTIONARIES_DIR, { recursive: true });
  } catch (error) {
    logger.exception(error);
  }
}

// Get supported languages
function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

// Get current language
function getCurrentLanguage() {
  const settings = getSettings();
  const languageCode = settings.language || 'en';
  
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
  return language || SUPPORTED_LANGUAGES.find(lang => lang.default);
}

// Set current language
function setCurrentLanguage(languageCode) {
  try {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
    
    if (!language) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }
    
    const settings = getSettings();
    settings.language = languageCode;
    saveSettings(settings);
    
    logger.info(`Language set to: ${language.name} (${language.code})`);
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Get custom dictionary for current language
function getCustomDictionary() {
  try {
    const language = getCurrentLanguage();
    const dictionaryPath = path.join(DICTIONARIES_DIR, `${language.code}.json`);
    
    if (!fs.existsSync(dictionaryPath)) {
      // Create empty dictionary if it doesn't exist
      const emptyDictionary = {
        words: [],
        phrases: []
      };
      
      fs.writeFileSync(dictionaryPath, JSON.stringify(emptyDictionary, null, 2), { encoding: 'utf-8' });
      return emptyDictionary;
    }
    
    const dictionaryContent = fs.readFileSync(dictionaryPath, { encoding: 'utf-8' });
    return JSON.parse(dictionaryContent);
  } catch (error) {
    logger.exception(error);
    return { words: [], phrases: [] };
  }
}

// Add word to custom dictionary
function addWordToDictionary(word, replacement = null) {
  try {
    const language = getCurrentLanguage();
    const dictionary = getCustomDictionary();
    
    // Check if word already exists
    const existingIndex = dictionary.words.findIndex(item => 
      item.word.toLowerCase() === word.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing word
      dictionary.words[existingIndex] = {
        word,
        replacement: replacement || word
      };
    } else {
      // Add new word
      dictionary.words.push({
        word,
        replacement: replacement || word
      });
    }
    
    // Save dictionary
    const dictionaryPath = path.join(DICTIONARIES_DIR, `${language.code}.json`);
    fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), { encoding: 'utf-8' });
    
    logger.info(`Added word to dictionary: ${word}`);
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Add phrase to custom dictionary
function addPhraseToDictionary(phrase, replacement = null) {
  try {
    const language = getCurrentLanguage();
    const dictionary = getCustomDictionary();
    
    // Check if phrase already exists
    const existingIndex = dictionary.phrases.findIndex(item => 
      item.phrase.toLowerCase() === phrase.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing phrase
      dictionary.phrases[existingIndex] = {
        phrase,
        replacement: replacement || phrase
      };
    } else {
      // Add new phrase
      dictionary.phrases.push({
        phrase,
        replacement: replacement || phrase
      });
    }
    
    // Save dictionary
    const dictionaryPath = path.join(DICTIONARIES_DIR, `${language.code}.json`);
    fs.writeFileSync(dictionaryPath, JSON.stringify(dictionary, null, 2), { encoding: 'utf-8' });
    
    logger.info(`Added phrase to dictionary: ${phrase}`);
    return true;
  } catch (error) {
    logger.exception(error);
    return false;
  }
}

// Process text with custom dictionary
function processTextWithDictionary(text) {
  try {
    const dictionary = getCustomDictionary();
    let processedText = text;
    
    // Apply phrase replacements
    dictionary.phrases.forEach(item => {
      const regex = new RegExp(`\\b${escapeRegExp(item.phrase)}\\b`, 'gi');
      processedText = processedText.replace(regex, item.replacement);
    });
    
    // Apply word replacements
    dictionary.words.forEach(item => {
      const regex = new RegExp(`\\b${escapeRegExp(item.word)}\\b`, 'gi');
      processedText = processedText.replace(regex, item.replacement);
    });
    
    return processedText;
  } catch (error) {
    logger.exception(error);
    return text; // Return original text on error
  }
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  getSupportedLanguages,
  getCurrentLanguage,
  setCurrentLanguage,
  getCustomDictionary,
  addWordToDictionary,
  addPhraseToDictionary,
  processTextWithDictionary
};
```

### Advanced Text Processing
```javascript
// src/main/services/textProcessing.js
const logger = require('../logger');
const { getSettings } = require('./settings');
const { processTextWithDictionary } = require('./languageSupport');

// Process transcribed text with various enhancements
function processText(text) {
  try {
    const settings = getSettings();
    let processedText = text;
    
    // Apply custom dictionary replacements
    processedText = processTextWithDictionary(processedText);
    
    // Apply smart capitalization if enabled
    if (settings.smartCapitalization !== false) {
      processedText = applySmartCapitalization(processedText);
    }
    
    // Apply number formatting if enabled
    if (settings.numberFormatting !== false) {
      processedText = formatNumbers(processedText);
    }
    
    // Apply punctuation if enabled
    if (settings.autoPunctuation !== false) {
      processedText = enhancePunctuation(processedText);
    }
    
    // Apply command processing if enabled
    if (settings.commandRecognition !== false) {
      processedText = processCommands(processedText);
    }
    
    return processedText;
  } catch (error) {
    logger.exception(error);
    return text; // Return original text on error
  }
}

// Apply smart capitalization
function applySmartCapitalization(text) {
  try {
    // Capitalize first letter of sentences
    let processed = text.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });
    
    // Capitalize common proper nouns (simplified example)
    const properNouns = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    properNouns.forEach(noun => {
      const regex = new RegExp(`\\b${noun}\\b`, 'gi');
      processed = processed.replace(regex, noun.charAt(0).toUpperCase() + noun.slice(1));
    });
    
    // Capitalize "I" pronoun
    processed = processed.replace(/\bi\b/g, 'I');
    
    return processed;
  } catch (error) {
    logger.exception(error);
    return text;
  }
}

// Format numbers
function formatNumbers(text) {
  try {
    // Convert spelled-out numbers to digits for common cases
    const numberWords = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14',
      'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19',
      'twenty': '20', 'thirty': '30', 'forty': '40', 'fifty': '50',
      'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90'
    };
    
    let processed = text;
    
    // Replace number words with digits
    Object.keys(numberWords).forEach(word => {
      // Only replace when it's a standalone number, not part of a word
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processed = processed.replace(regex, numberWords[word]);
    });
    
    // Format phone numbers (simplified example)
    processed = processed.replace(/(\d{3})\s+(\d{3})\s+(\d{4})/g, '($1) $2-$3');
    
    return processed;
  } catch (error) {
    logger.exception(error);
    return text;
  }
}

// Enhance punctuation
function enhancePunctuation(text) {
  try {
    let processed = text;
    
    // Add periods at the end of sentences if missing
    processed = processed.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
    
    // Ensure space after commas
    processed = processed.replace(/,([^\s])/g, ', $1');
    
    // Ensure space after periods
    processed = processed.replace(/\.([^\s])/g, '. $1');
    
    // Add period at the end if missing
    if (!/[.!?]$/.test(processed.trim())) {
      processed = processed.trim() + '.';
    }
    
    return processed;
  } catch (error) {
    logger.exception(error);
    return text;
  }
}

// Process commands in text
function processCommands(text) {
  try {
    // Define command patterns
    const commands = {
      'new line': '\n',
      'new paragraph': '\n\n',
      'period': '.',
      'comma': ',',
      'question mark': '?',
      'exclamation point': '!',
      'colon': ':',
      'semicolon': ';',
      'open parenthesis': '(',
      'close parenthesis': ')',
      'open quote': '"',
      'close quote': '"',
      'hyphen': '-',
      'dash': '—',
      'underscore': '_'
    };
    
    let processed = text;
    
    // Replace command patterns
    Object.keys(commands).forEach(command => {
      const regex = new RegExp(`\\b${command}\\b`, 'gi');
      processed = processed.replace(regex, commands[command]);
    });
    
    return processed;
  } catch (error) {
    logger.exception(error);
    return text;
  }
}

module.exports = {
  processText,
  applySmartCapitalization,
  formatNumbers,
  enhancePunctuation,
  processCommands
};
```

## Deliverables
- Performance optimization implementation
- Continuous dictation mode
- Language and punctuation support
- Enhanced error handling and recovery mechanisms
- Advanced text processing features
- Performance monitoring tools

## Success Criteria
- Application runs efficiently with minimal resource usage
- Continuous dictation mode works reliably
- Multiple languages are supported with proper punctuation
- Application recovers gracefully from errors
- Advanced text processing improves transcription quality
- Performance monitoring provides useful insights

## Dependencies
- Performance monitoring libraries
- Advanced audio processing tools
- Language detection libraries
- Text processing utilities
- Error reporting and analytics tools (optional)

## Timeline
- Performance optimization: 3 days
- Advanced dictation features: 4 days
- Language and punctuation support: 3 days
- Error handling and recovery: 2 days
- Advanced text processing: 3 days
- Testing and refinement: 3 days

**Total Duration: 18 days** 