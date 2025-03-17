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

  // Save transcription to JSON
  console.log('Registering save-transcription handler...');
  ipcMain.handle(
    'save-transcription',
    async (_, transcription: Transcription, _options: { filename?: string; format?: string }) => {
      console.log('save-transcription handler called');
      try {
        // Save to JSON database
        const jsonSaved = saveTranscriptionToJson(transcription);

        return { success: true, jsonSaved };
      } catch (error) {
        console.error('Failed to save transcription:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Save transcription with file dialog (JSON only)
  console.log('Registering save-transcription-as handler...');
  ipcMain.handle('save-transcription-as', async (_, transcription: Transcription) => {
    console.log('save-transcription-as handler called');
    try {
      // Save to JSON database first
      saveTranscriptionToJson(transcription);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = path.join(DEFAULT_SAVE_DIR, `${DEFAULT_FILENAME}_${timestamp}.json`);

      // Ensure directory exists before showing dialog
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
      }

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

      // Ensure parent directory exists
      const dirName = path.dirname(filePath);
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Save as JSON
      fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

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
      // Get transcriptions from JSON
      const jsonTranscriptions = readTranscriptionsFromJson();

      return {
        success: true,
        transcriptions: jsonTranscriptions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
      };
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
        return jsonTranscriptions.sort((a, b) => b.timestamp - a.timestamp);
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
      // Find in JSON database
      const transcriptions = readTranscriptionsFromJson();
      const transcription = transcriptions.find(t => t.id === id);

      if (transcription) {
        return { success: true, transcription };
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
      // Remove from JSON database
      const transcriptions = readTranscriptionsFromJson();
      const filteredTranscriptions = transcriptions.filter(t => t.id !== id);

      if (filteredTranscriptions.length < transcriptions.length) {
        writeTranscriptionsToJson(filteredTranscriptions);
        return { success: true };
      }

      return { success: false, error: 'Transcription not found' };
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
