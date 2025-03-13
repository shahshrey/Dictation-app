import { IpcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Define constants for file storage
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'Dictation App');
const DEFAULT_FILENAME = 'transcription';

// Ensure save directory exists
try {
  if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create save directory:', error);
}

export const setupFileStorage = (ipcMain: IpcMain): void => {
  console.log('Setting up file storage handlers...');

  // Check if ipcMain is valid
  console.log('ipcMain object type:', typeof ipcMain);
  console.log('ipcMain.handle method available:', typeof ipcMain.handle === 'function');

  // Save transcription to a file
  console.log('Registering save-transcription handler...');
  ipcMain.handle(
    'save-transcription',
    async (_, text: string, options: { filename?: string; format?: string }) => {
      console.log('save-transcription handler called');
      try {
        const filename = options.filename ?? DEFAULT_FILENAME;
        const format = options.format ?? 'txt';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestamp}.${format}`;
        const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

        // Ensure directory exists before writing
        if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
          fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
        }

        fs.writeFileSync(filePath, text, { encoding: 'utf-8' });

        return { success: true, filePath };
      } catch (error) {
        console.error('Failed to save transcription:', error);
        return { success: false, error: String(error) };
      }
    }
  );

  // Save transcription with file dialog
  console.log('Registering save-transcription-as handler...');
  ipcMain.handle('save-transcription-as', async (_, text: string) => {
    console.log('save-transcription-as handler called');
    try {
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

      fs.writeFileSync(filePath, text, { encoding: 'utf-8' });

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

  // Add handler for get-transcriptions (alias for get-recent-transcriptions)
  console.log('Registering get-transcriptions handler...');
  try {
    ipcMain.handle('get-transcriptions', async () => {
      console.log('Main process: get-transcriptions handler called');

      try {
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

              // Extract timestamp from filename or use file creation time
              let timestamp = stats.birthtime.getTime();
              const timestampRegex = /(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/;
              const timestampMatch = timestampRegex.exec(file);
              if (timestampMatch) {
                const dateStr = timestampMatch[1].replace(/-/g, (m, i) => (i > 9 ? ':' : '-'));
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  timestamp = date.getTime();
                }
              }

              return {
                id: path.basename(file, '.txt'),
                text: content,
                timestamp,
                duration: 0, // Duration not available from saved files
                language: 'en', // Default language
              };
            } catch (fileError) {
              console.error(`Error processing file ${file}:`, fileError);
              return null;
            }
          })
          .filter(Boolean) // Remove null entries
          .sort((a, b) => {
            // TypeScript now knows a and b are not null due to filter(Boolean)
            return b!.timestamp - a!.timestamp;
          })
          .slice(0, 10); // Get only the 10 most recent files

        console.log(`Main process: Found ${files.length} transcriptions`);
        return files;
      } catch (error) {
        console.error('Error in get-transcriptions handler:', error);
        return [];
      }
    });
    console.log('get-transcriptions handler registered successfully');
  } catch (error) {
    console.error('Error registering get-transcriptions handler:', error);
  }

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
