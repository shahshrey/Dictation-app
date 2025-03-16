import { IpcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Transcription } from '../../shared/types';

// Define constants for file storage
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Dictation App');
const DEFAULT_FILENAME = 'transcription';
const TRANSCRIPTIONS_JSON = path.join(DEFAULT_SAVE_DIR, 'transcriptions.json');

// Ensure save directory exists
try {
  if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create save directory:', error);
}

// Helper function to read transcriptions from JSON file
const readTranscriptionsFromJson = (): Transcription[] => {
  try {
    if (!fs.existsSync(TRANSCRIPTIONS_JSON)) {
      // Create empty transcriptions file if it doesn't exist
      fs.writeFileSync(TRANSCRIPTIONS_JSON, JSON.stringify([], null, 2), { encoding: 'utf-8' });
      return [];
    }

    const data = fs.readFileSync(TRANSCRIPTIONS_JSON, { encoding: 'utf-8' });
    return JSON.parse(data) as Transcription[];
  } catch (error) {
    console.error('Failed to read transcriptions from JSON:', error);
    return [];
  }
};

// Helper function to write transcriptions to JSON file
const writeTranscriptionsToJson = (transcriptions: Transcription[]): boolean => {
  try {
    fs.writeFileSync(TRANSCRIPTIONS_JSON, JSON.stringify(transcriptions, null, 2), {
      encoding: 'utf-8',
    });
    return true;
  } catch (error) {
    console.error('Failed to write transcriptions to JSON:', error);
    return false;
  }
};

// Helper function to add or update a transcription in the JSON file
const saveTranscriptionToJson = (transcription: Transcription): boolean => {
  try {
    const transcriptions = readTranscriptionsFromJson();
    const existingIndex = transcriptions.findIndex(t => t.id === transcription.id);

    if (existingIndex >= 0) {
      // Update existing transcription
      transcriptions[existingIndex] = transcription;
    } else {
      // Add new transcription
      transcriptions.push(transcription);
    }

    return writeTranscriptionsToJson(transcriptions);
  } catch (error) {
    console.error('Failed to save transcription to JSON:', error);
    return false;
  }
};

export const setupFileStorage = (ipcMain: IpcMain): void => {
  console.log('Setting up file storage handlers...');

  // Check if ipcMain is valid
  console.log('ipcMain object type:', typeof ipcMain);
  console.log('ipcMain.handle method available:', typeof ipcMain.handle === 'function');

  // Save transcription to a file
  console.log('Registering save-transcription handler...');
  ipcMain.handle(
    'save-transcription',
    async (_, transcription: Transcription, options: { filename?: string; format?: string }) => {
      console.log('save-transcription handler called');
      try {
        // Save to JSON database
        const jsonSaved = saveTranscriptionToJson(transcription);

        // Also save as text file if requested
        const filename = options.filename ?? DEFAULT_FILENAME;
        const format = options.format ?? 'txt';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestamp}.${format}`;
        const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

        // Ensure directory exists before writing
        if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
          fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
        }

        fs.writeFileSync(filePath, transcription.text, { encoding: 'utf-8' });

        return { success: true, filePath, jsonSaved };
      } catch (error) {
        console.error('Failed to save transcription:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Save transcription with file dialog
  console.log('Registering save-transcription-as handler...');
  ipcMain.handle('save-transcription-as', async (_, transcription: Transcription) => {
    console.log('save-transcription-as handler called');
    try {
      // Save to JSON database first
      saveTranscriptionToJson(transcription);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = path.join(DEFAULT_SAVE_DIR, `${DEFAULT_FILENAME}_${timestamp}.txt`);

      // Ensure directory exists before showing dialog
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
      }

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Transcription',
        defaultPath,
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      // Ensure parent directory exists
      const dirName = path.dirname(filePath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Determine if we should save as JSON or text based on file extension
      if (filePath.endsWith('.json')) {
        fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });
      } else {
        fs.writeFileSync(filePath, transcription.text, { encoding: 'utf-8' });
      }

      return { success: true, filePath };
    } catch (error) {
      console.error('Failed to save transcription:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get recent transcriptions
  console.log('Registering get-recent-transcriptions handler...');
  ipcMain.handle('get-recent-transcriptions', async () => {
    console.log('get-recent-transcriptions handler called');
    try {
      // First try to get transcriptions from JSON
      const jsonTranscriptions = readTranscriptionsFromJson();
      if (jsonTranscriptions.length > 0) {
        return {
          success: true,
          transcriptions: jsonTranscriptions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
        };
      }

      // Fallback to reading from text files
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        return { success: true, files: [] };
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter(file => file.endsWith('.txt'))
        .map(file => {
          try {
            const filePath = path.join(DEFAULT_SAVE_DIR, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              path: filePath,
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
            };
          } catch (fileError) {
            console.error(`Error processing file ${file}:`, fileError);
            return null;
          }
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => {
          // TypeScript now knows a and b are not null due to filter(Boolean)
          return b!.modifiedAt.getTime() - a!.modifiedAt.getTime();
        })
        .slice(0, 10); // Get only the 10 most recent files

      return { success: true, files };
    } catch (error) {
      console.error('Failed to get recent transcriptions:', error);
      return { success: false, error: String(error) };
    }
  });

  // Add handler for get-transcriptions
  console.log('Registering get-transcriptions handler...');
  try {
    ipcMain.handle('get-transcriptions', async () => {
      try {
        // Get transcriptions from JSON
        const jsonTranscriptions = readTranscriptionsFromJson();
        if (jsonTranscriptions.length > 0) {
          return jsonTranscriptions.sort((a, b) => b.timestamp - a.timestamp);
        }

        // Fallback to reading from text files
        if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
          return [];
        }

        const files = fs
          .readdirSync(DEFAULT_SAVE_DIR)
          .filter(file => file.endsWith('.txt'))
          .map(file => {
            try {
              const filePath = path.join(DEFAULT_SAVE_DIR, file);
              const stats = fs.statSync(filePath);
              const content = fs.readFileSync(filePath, { encoding: 'utf-8' });

              // Create a transcription object from the file
              const transcription: Transcription = {
                id: file.replace(/\.txt$/, ''),
                text: content,
                timestamp: stats.mtime.getTime(),
                duration: 0, // We don't have this information from text files
                language: 'en', // Default language
                wordCount: content.split(/\s+/).length,
              };

              return transcription;
            } catch (fileError) {
              console.error(`Error processing file ${file}:`, fileError);
              return null;
            }
          })
          .filter(Boolean) // Remove null entries
          .sort((a, b) => b!.timestamp - a!.timestamp);

        return files;
      } catch (error) {
        console.error('Failed to get transcriptions:', error);
        return [];
      }
    });
  } catch (error) {
    console.error('Failed to register get-transcriptions handler:', error);
  }

  // Get a single transcription by ID
  console.log('Registering get-transcription handler...');
  ipcMain.handle('get-transcription', async (_, id: string) => {
    console.log(`get-transcription handler called for ID: ${id}`);
    try {
      // Try to find in JSON database first
      const transcriptions = readTranscriptionsFromJson();
      const transcription = transcriptions.find(t => t.id === id);

      if (transcription) {
        return { success: true, transcription };
      }

      // Try to find as a text file
      const filePath = path.join(DEFAULT_SAVE_DIR, `${id}.txt`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' });

        // Create a transcription object from the file
        const fileTranscription: Transcription = {
          id,
          text: content,
          timestamp: stats.mtime.getTime(),
          duration: 0,
          language: 'en',
          wordCount: content.split(/\s+/).length,
        };

        return { success: true, transcription: fileTranscription };
      }

      return { success: false, error: 'Transcription not found' };
    } catch (error) {
      console.error('Failed to get transcription:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete a transcription by ID
  console.log('Registering delete-transcription handler...');
  ipcMain.handle('delete-transcription', async (_, id: string) => {
    console.log(`delete-transcription handler called for ID: ${id}`);
    try {
      let deleted = false;

      // Remove from JSON database
      const transcriptions = readTranscriptionsFromJson();
      const filteredTranscriptions = transcriptions.filter(t => t.id !== id);

      if (filteredTranscriptions.length < transcriptions.length) {
        writeTranscriptionsToJson(filteredTranscriptions);
        deleted = true;
      }

      // Also try to delete text file if it exists
      const filePath = path.join(DEFAULT_SAVE_DIR, `${id}.txt`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }

      return { success: deleted };
    } catch (error) {
      console.error('Failed to delete transcription:', error);
      return { success: false, error: String(error) };
    }
  });

  // Log all registered IPC handlers for debugging
  console.log('File storage handlers registered. Current IPC handlers:');
  try {
    const events = (ipcMain as { _events?: Record<string, unknown> })._events;
    const registeredChannels = events ? Object.keys(events) : [];
    console.log(registeredChannels);
  } catch (error) {
    console.error('Error getting registered IPC handlers:', error);
    console.log([]);
  }
};
