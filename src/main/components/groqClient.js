const { Groq } = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../../shared/logger').default;

// Initialize Groq client
let groqClient = null;

const initGroqClient = (apiKey) => {
  if (!apiKey) {
    return null;
  }

  try {
    return new Groq({ apiKey });
  } catch (error) {
    logger.error('Failed to initialize Groq client:', { error: error.message });
    return null;
  }
};

// Add a function to handle transcription that doesn't rely on process
const transcribeRecording = async (language, apiKey) => {
  logger.debug('transcribeRecording function called with language: ' + language);
  logger.debug('API key available: ' + !!apiKey);
  logger.debug('API key length: ' + (apiKey ? apiKey.length : 0));

  try {
    // Use the provided API key directly without falling back to settings
    if (!apiKey) {
      logger.error('No API key provided');
      return {
        success: false,
        error: 'No API key provided',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      };
    }

    logger.debug('Initializing Groq client with API key');
    const client = initGroqClient(apiKey);
    logger.debug('Groq client initialized successfully');

    // Get the path to the most recent recording
    logger.debug('Checking for recording file at: ' + global.AUDIO_FILE_PATH);
    if (!fs.existsSync(global.AUDIO_FILE_PATH)) {
      logger.error('Recording file not found at ' + global.AUDIO_FILE_PATH);
      return {
        success: false,
        error: 'Recording file not found',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      };
    }

    // Validate the file size
    const fileStats = fs.statSync(global.AUDIO_FILE_PATH);
    logger.debug(`Audio file size: ${fileStats.size} bytes`);
    logger.debug(`Audio file created: ${fileStats.birthtime}`);
    logger.debug(`Audio file modified: ${fileStats.mtime}`);

    if (fileStats.size === 0) {
      logger.error('Audio file is empty');
      return {
        success: false,
        error: 'Audio file is empty',
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      };
    }

    // Create a read stream for the audio file
    logger.debug('Creating read stream for audio file');
    const audioFile = fs.createReadStream(global.AUDIO_FILE_PATH);
    logger.debug('Read stream created successfully');

    // Choose the appropriate model based on language
    let model =
      language === 'en'
        ? global.GROQ_MODELS.TRANSCRIPTION.ENGLISH
        : global.GROQ_MODELS.TRANSCRIPTION.MULTILINGUAL;

    logger.debug(
      `Using Groq model: ${model} for transcription with language: ${language || 'en'}`
    );

    // Transcribe the audio
    logger.debug('Calling Groq API for transcription...');
    try {
      // Create the API request parameters
      const transcriptionParams = {
        file: audioFile,
        model: model,
      };
      
      // Only add the language parameter if a specific language is provided
      // Default to 'en' if no language is specified instead of 'auto'
      if (language && language !== 'auto') {
        transcriptionParams.language = language;
      } else {
        // Default to English if no language is specified or 'auto' is provided
        transcriptionParams.language = 'en';
      }

      const transcription = await client.audio.transcriptions.create(transcriptionParams);

      logger.debug('Transcription successful, text length: ' + transcription.text.length);
      logger.debug('Transcription text: ' + transcription.text.substring(0, 100) + '...');
      logger.debug('DEBUGGING: global.pasteTextAtCursor is available: ' + !!global.pasteTextAtCursor);

      // Generate a unique ID for the transcription
      const id = `transcription-${Date.now()}`;
      const timestamp = Date.now();
      const duration = Math.floor(
        (fileStats.mtime.getTime() - fileStats.birthtime.getTime()) / 1000
      );
      
      // Save the transcription to a file
      let filePath = '';
      try {
        const filename = 'transcription';
        const format = 'json';
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestampStr}.${format}`;
        filePath = path.join(global.DEFAULT_SAVE_DIR, fullFilename);

        // Ensure the save directory exists
        if (!fs.existsSync(global.DEFAULT_SAVE_DIR)) {
          logger.debug(`Creating save directory: ${global.DEFAULT_SAVE_DIR}`);
          fs.mkdirSync(global.DEFAULT_SAVE_DIR, { recursive: true });
        }

        // Create a transcription object
        const transcriptionObject = {
          id: path.basename(fullFilename, '.json'),
          text: transcription.text,
          timestamp,
          duration,
          language: transcriptionParams.language,
          wordCount: transcription.text.split(/\s+/).length,
          source: 'recording',
          confidence: 0.95, // Default confidence value
        };

        // Write the file synchronously to ensure it's fully written before returning
        fs.writeFileSync(filePath, JSON.stringify(transcriptionObject, null, 2), { encoding: 'utf-8' });
        logger.debug(`Transcription saved to: ${filePath}`);

        // Verify the file was written correctly
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
          try {
            const parsedContent = JSON.parse(fileContent);
            if (!parsedContent || !parsedContent.text || parsedContent.text !== transcription.text) {
              logger.error('File content does not match transcription object');
            } else {
              logger.debug('File content verified successfully');
            }
          } catch (parseError) {
            logger.error('Failed to parse saved JSON file', { error: parseError.message });
          }
        } else {
          logger.error(`File not found after writing: ${filePath}`);
        }
      } catch (saveError) {
        logger.error('Failed to save transcription to file', { error: saveError.message });
        // Continue even if saving fails
      }

      // Add a small delay to ensure file system operations are complete
      await new Promise(resolve => setTimeout(resolve, 500));
    
      return {
        success: true,
        id,
        text: transcription.text,
        timestamp,
        duration,
        language: transcriptionParams.language,
        filePath, // Include the file path for debugging
        pastedAtCursor: false, // Indicate that the text was NOT pasted at the cursor by this function
      };
    } catch (transcriptionError) {
      logger.error('Error during Groq API transcription call', { error: transcriptionError.message });
      return {
        success: false,
        error: transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError),
        id: '',
        text: '',
        timestamp: 0,
        duration: 0,
      };
    }
  } catch (error) {
    logger.error('Failed to transcribe recording', { error: error.message });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      id: '',
      text: '',
      timestamp: 0,
      duration: 0,
    };
  }
};

module.exports = {
  groqClient,
  initGroqClient,
  transcribeRecording
}; 