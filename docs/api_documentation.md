# API Documentation

This document provides detailed information about the API integrations used in the macOS Dictation App, focusing primarily on the Groq API for speech-to-text processing and any local endpoints implemented within the application.

## Groq API Integration

The application uses the `groq-sdk` npm package to interact with Groq's cloud-based AI services for speech-to-text processing.

### Authentication

```typescript
// Initialize the Groq client with API key
const GROQ_API_KEY = settings.get('apiKey');
const groq = new Groq({ apiKey: GROQ_API_KEY });
```

### Transcription Endpoint

#### Request

The transcription endpoint converts spoken audio to text.

```typescript
/**
 * Sends audio data to Groq API for transcription
 * @param audioBuffer - Buffer containing audio data
 * @param options - Configuration options for transcription
 * @returns Promise with transcription result
 */
async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    model?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
  } = {}
): Promise<TranscriptionResult> {
  try {
    // Create a temporary file from the buffer
    const tempFilePath = await createTempAudioFile(audioBuffer);

    // Set default options if not provided
    const model = options.model || 'whisper-large-v3-turbo';
    const language = options.language || 'en';
    const temperature = options.temperature || 0.0;

    // Create a transcription job
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: model,
      language: language,
      prompt: options.prompt,
      response_format: 'verbose_json',
      temperature: temperature,
    });

    // Clean up temporary file
    await fs.promises.unlink(tempFilePath);

    return {
      text: transcription.text,
      metadata: {
        avgLogprob: transcription.avg_logprob,
        noSpeechProb: transcription.no_speech_prob,
        compressionRatio: transcription.compression_ratio,
      },
    };
  } catch (error) {
    logger.exception('Error during transcription:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}
```

#### Response

The response from the transcription endpoint includes the transcribed text and quality metadata:

```typescript
interface TranscriptionResult {
  text: string;
  metadata?: {
    avgLogprob: number;
    noSpeechProb: number;
    compressionRatio: number;
  };
}
```

Example response:

```json
{
  "text": "This is a sample transcription of spoken audio.",
  "metadata": {
    "avgLogprob": -0.097569615,
    "noSpeechProb": 0.012814695,
    "compressionRatio": 1.6637554
  }
}
```

### Translation Endpoint

#### Request

The translation endpoint converts spoken audio in any language to English text.

```typescript
/**
 * Sends audio data to Groq API for translation to English
 * @param audioBuffer - Buffer containing audio data
 * @param options - Configuration options for translation
 * @returns Promise with translation result
 */
async function translateAudio(
  audioBuffer: Buffer,
  options: {
    model?: string;
    prompt?: string;
    temperature?: number;
  } = {}
): Promise<TranslationResult> {
  try {
    // Create a temporary file from the buffer
    const tempFilePath = await createTempAudioFile(audioBuffer);

    // Set default options if not provided
    const model = options.model || 'whisper-large-v3';
    const temperature = options.temperature || 0.0;

    // Create a translation job
    const translation = await groq.audio.translations.create({
      file: fs.createReadStream(tempFilePath),
      model: model,
      prompt: options.prompt,
      response_format: 'verbose_json',
      temperature: temperature,
    });

    // Clean up temporary file
    await fs.promises.unlink(tempFilePath);

    return {
      text: translation.text,
      metadata: {
        avgLogprob: translation.avg_logprob,
        noSpeechProb: translation.no_speech_prob,
        compressionRatio: translation.compression_ratio,
      },
    };
  } catch (error) {
    logger.exception('Error during translation:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}
```

#### Response

The response from the translation endpoint is similar to the transcription endpoint:

```typescript
interface TranslationResult {
  text: string;
  metadata?: {
    avgLogprob: number;
    noSpeechProb: number;
    compressionRatio: number;
  };
}
```

## Local API Endpoints

The application implements several local endpoints for communication between the main and renderer processes using Electron's IPC (Inter-Process Communication) system.

### Audio Recording Endpoints

```typescript
// IPC handlers in main process
ipcMain.handle('audio:get-devices', async () => {
  return await getAudioDevices();
});

ipcMain.handle('audio:start-recording', async (event, deviceId) => {
  return await startRecording(deviceId);
});

ipcMain.handle('audio:stop-recording', async () => {
  return await stopRecording();
});

// IPC invocations in renderer process
export const getAudioDevices = async (): Promise<AudioDevice[]> => {
  return await ipcRenderer.invoke('audio:get-devices');
};

export const startRecording = async (deviceId: string): Promise<boolean> => {
  return await ipcRenderer.invoke('audio:start-recording', deviceId);
};

export const stopRecording = async (): Promise<Buffer> => {
  return await ipcRenderer.invoke('audio:stop-recording');
};
```

### Transcription Endpoints

```typescript
// IPC handlers in main process
ipcMain.handle('transcription:process', async (event, audioBuffer, options) => {
  return await transcribeAudio(audioBuffer, options);
});

ipcMain.handle('translation:process', async (event, audioBuffer, options) => {
  return await translateAudio(audioBuffer, options);
});

// IPC invocations in renderer process
export const processTranscription = async (
  audioBuffer: Buffer,
  options?: TranscriptionOptions
): Promise<TranscriptionResult> => {
  return await ipcRenderer.invoke('transcription:process', audioBuffer, options);
};

export const processTranslation = async (
  audioBuffer: Buffer,
  options?: TranslationOptions
): Promise<TranslationResult> => {
  return await ipcRenderer.invoke('translation:process', audioBuffer, options);
};
```

### Text Insertion Endpoints

```typescript
// IPC handlers in main process
ipcMain.handle('text:insert', async (event, text) => {
  return await insertTextIntoActiveApplication(text);
});

// IPC invocations in renderer process
export const insertText = async (text: string): Promise<boolean> => {
  return await ipcRenderer.invoke('text:insert', text);
};
```

## Understanding Metadata Fields

The Groq API provides valuable metadata that helps assess the quality of transcriptions:

### Average Log Probability (`avgLogprob`)

This value indicates the model's confidence in the transcription:

- Values closer to 0 indicate higher confidence
- Values below -0.5 may indicate potential issues with transcription quality
- Typical good values range from -0.1 to -0.3

### No Speech Probability (`noSpeechProb`)

This value indicates the probability that the audio contains no speech:

- Values close to 0 indicate high confidence that speech is present
- Values close to 1 indicate high confidence that no speech is present
- Values above 0.5 may indicate sections of silence or non-speech audio

### Compression Ratio (`compressionRatio`)

This value relates to the information density of the transcription:

- Typical values range from 1.0 to 2.0 for normal speech
- Unusually high values may indicate repetitive speech or stuttering
- Unusually low values may indicate very dense information or fast speech

## Error Handling

All API calls include comprehensive error handling:

```typescript
try {
  // API call
} catch (error) {
  logger.exception('Error description:', error);

  // Categorize errors
  if (error.status === 401) {
    return { error: 'Authentication failed. Please check your API key.' };
  } else if (error.status === 429) {
    return { error: 'Rate limit exceeded. Please try again later.' };
  } else if (error.status >= 500) {
    return { error: 'Server error. Please try again later.' };
  } else {
    return { error: `Unexpected error: ${error.message}` };
  }
}
```

## Rate Limiting and Quotas

The application implements basic rate limiting to prevent excessive API usage:

```typescript
const API_CALLS = {
  count: 0,
  resetTime: Date.now() + 60000,
  limit: 10, // 10 calls per minute
};

function checkRateLimit() {
  const now = Date.now();
  if (now > API_CALLS.resetTime) {
    API_CALLS.count = 0;
    API_CALLS.resetTime = now + 60000;
  }

  if (API_CALLS.count >= API_CALLS.limit) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  API_CALLS.count++;
}
```
