const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { TEMP_DIR, DEFAULT_SAVE_DIR } = require('./constants');
const logger = require('../../shared/logger').default;

// Save transcription to a file
const saveTranscription = async (transcription, options = {}) => {
  try {
    const filename = options?.filename || 'transcription';
    const format = 'json';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}_${timestamp}.${format}`;
    const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

    fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

    return { success: true, filePath };
  } catch (error) {
    logger.error('Failed to save transcription:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Save transcription with file dialog
const saveTranscriptionAs = async (transcription) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultPath = path.join(DEFAULT_SAVE_DIR, `transcription_${timestamp}.json`);

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Transcription',
      defaultPath,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

    return { success: true, filePath };
  } catch (error) {
    logger.error('Failed to save transcription:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Get recent transcriptions
const getRecentTranscriptions = async () => {
  try {
    if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
      return { success: true, transcriptions: [] };
    }

    const files = fs
      .readdirSync(DEFAULT_SAVE_DIR)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json')
      .map(file => {
        try {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
          return {
            transcription: JSON.parse(content),
            stats: {
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
            }
          };
        } catch (error) {
          logger.error(`Error processing file ${file}:`, { error: error.message });
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.stats.modifiedAt.getTime() - a.stats.modifiedAt.getTime())
      .slice(0, 10);

    return { 
      success: true, 
      transcriptions: files.map(f => f.transcription)
    };
  } catch (error) {
    logger.error('Failed to get recent transcriptions:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Get all transcriptions
const getTranscriptions = async () => {
  try {
    if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
      logger.debug('Main process: Save directory does not exist');
      return [];
    }

    // Force a directory read to get the latest files
    const files = fs
      .readdirSync(DEFAULT_SAVE_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'transcriptions.json')
      .map(dirent => {
        const filePath = path.join(DEFAULT_SAVE_DIR, dirent.name);

        try {
          // Read file content
          let transcription = null;
          try {
            const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
            transcription = JSON.parse(content);
          } catch (readError) {
            logger.error(`Failed to read or parse file ${filePath}:`, { error: readError.message });
            return null; // Skip this file if we can't read or parse it
          }

          // Return the parsed transcription
          return transcription;
        } catch (error) {
          logger.error(`Failed to process file ${dirent.name}:`, { error: error.message });
          return null;
        }
      })
      .filter(Boolean) // Remove any null entries from errors
      .sort((a, b) => b.timestamp - a.timestamp);
    return files;
  } catch (error) {
    logger.error('Failed to get transcriptions:', { error: error.message });
    return [];
  }
};

// Get a specific transcription by ID
const getTranscription = async (id) => {
  try {
    if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
      return { success: false, error: 'Save directory does not exist' };
    }

    const files = fs.readdirSync(DEFAULT_SAVE_DIR)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json');

    for (const file of files) {
      try {
        const filePath = path.join(DEFAULT_SAVE_DIR, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const transcription = JSON.parse(content);
        
        if (transcription.id === id) {
          return { success: true, transcription };
        }
      } catch (error) {
        logger.error(`Error processing file ${file}:`, { error: error.message });
      }
    }

    return { success: false, error: 'Transcription not found' };
  } catch (error) {
    logger.error('Failed to get transcription:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Delete a transcription by ID
const deleteTranscription = async (id) => {
  try {
    if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
      return { success: false, error: 'Save directory does not exist' };
    }

    const files = fs.readdirSync(DEFAULT_SAVE_DIR)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json');

    for (const file of files) {
      try {
        const filePath = path.join(DEFAULT_SAVE_DIR, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const transcription = JSON.parse(content);
        
        if (transcription.id === id) {
          fs.unlinkSync(filePath);
          return { success: true };
        }
      } catch (error) {
        logger.error(`Error processing file ${file}:`, { error: error.message });
      }
    }

    return { success: false, error: 'Transcription not found' };
  } catch (error) {
    logger.error('Failed to delete transcription:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Open a file
const openFile = (filePath) => {
  try {
    const { shell } = require('electron');
    shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    logger.error('Failed to open file:', { error: error.message });
    return { success: false, error: String(error) };
  }
};

// Ensure directories exist
const ensureStorageDirectories = () => {
  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    try {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', { error: error.message });
    }
  }

  // Ensure save directory exists
  if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
    try {
      fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create save directory:', { error: error.message });
    }
  }
};

module.exports = {
  saveTranscription,
  saveTranscriptionAs,
  getRecentTranscriptions,
  getTranscriptions,
  getTranscription,
  deleteTranscription,
  openFile,
  ensureStorageDirectories
}; 