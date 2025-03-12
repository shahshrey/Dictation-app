import { IpcMain, dialog, app } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getLogger } from "../../shared/logger";

// Get the logger instance
const logger = getLogger('main');

// Define constants for file storage
const DEFAULT_SAVE_DIR = path.join(os.homedir(), "Documents", "Dictation App");
const DEFAULT_FILENAME = "transcription";

// Ensure save directory exists
if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
  try {
    fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, "Failed to create save directory");
    } else {
      logger.error("Failed to create save directory", { error: String(error) });
    }
  }
}

export const setupFileStorage = (ipcMain: IpcMain): void => {
  logger.info('Setting up file storage handlers');
  
  // Check if ipcMain is valid
  logger.debug('ipcMain validation', {
    objectType: typeof ipcMain,
    handleMethodAvailable: typeof ipcMain.handle === 'function'
  });
  
  // Save transcription to a file
  logger.debug('Registering save-transcription handler');
  ipcMain.handle(
    "save-transcription",
    async (
      _,
      text: string,
      options: { filename?: string; format?: string }
    ) => {
      logger.debug('save-transcription handler called', { options });
      try {
        const filename = options.filename || DEFAULT_FILENAME;
        const format = options.format || "txt";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fullFilename = `${filename}_${timestamp}.${format}`;
        const filePath = path.join(DEFAULT_SAVE_DIR, fullFilename);

        fs.writeFileSync(filePath, text, { encoding: "utf-8" });
        
        logger.info('Transcription saved successfully', { filePath });
        return { success: true, filePath };
      } catch (error) {
        if (error instanceof Error) {
          logger.exception(error, "Failed to save transcription");
        } else {
          logger.error("Failed to save transcription", { error: String(error) });
        }
        return { success: false, error: String(error) };
      }
    }
  );

  // Save transcription with file dialog
  logger.debug('Registering save-transcription-as handler');
  ipcMain.handle("save-transcription-as", async (_, text: string) => {
    logger.debug('save-transcription-as handler called');
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const defaultPath = path.join(
        DEFAULT_SAVE_DIR,
        `${DEFAULT_FILENAME}_${timestamp}.txt`
      );

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Save Transcription",
        defaultPath,
        filters: [
          { name: "Text Files", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (canceled || !filePath) {
        logger.debug('Save dialog canceled by user');
        return { success: false, canceled: true };
      }

      fs.writeFileSync(filePath, text, { encoding: "utf-8" });
      
      logger.info('Transcription saved with dialog', { filePath });
      return { success: true, filePath };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, "Failed to save transcription");
      } else {
        logger.error("Failed to save transcription", { error: String(error) });
      }
      return { success: false, error: String(error) };
    }
  });

  // Get recent transcriptions
  logger.debug('Registering get-recent-transcriptions handler');
  ipcMain.handle("get-recent-transcriptions", async () => {
    logger.debug('get-recent-transcriptions handler called');
    try {
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        logger.debug('Save directory does not exist');
        return { success: true, files: [] };
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter((file) => file.endsWith(".txt"))
        .map((file) => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
          };
        })
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        .slice(0, 10); // Get only the 10 most recent files

      logger.debug('Found recent transcriptions', { count: files.length });
      return { success: true, files };
    } catch (error) {
      if (error instanceof Error) {
        logger.exception(error, "Failed to get recent transcriptions");
      } else {
        logger.error("Failed to get recent transcriptions", { error: String(error) });
      }
      return { success: false, error: String(error) };
    }
  });
  
  // Add handler for get-transcriptions (alias for get-recent-transcriptions)
  logger.debug('Registering get-transcriptions handler');
  try {
    ipcMain.handle("get-transcriptions", async () => {
      logger.debug('get-transcriptions handler called');
      
      if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
        logger.debug('Save directory does not exist');
        return [];
      }

      const files = fs
        .readdirSync(DEFAULT_SAVE_DIR)
        .filter((file) => file.endsWith(".txt"))
        .map((file) => {
          const filePath = path.join(DEFAULT_SAVE_DIR, file);
          const stats = fs.statSync(filePath);
          let content = '';
          
          try {
            content = fs.readFileSync(filePath, { encoding: "utf-8" });
          } catch (readError) {
            if (readError instanceof Error) {
              logger.exception(readError, `Failed to read file ${filePath}`);
            } else {
              logger.error(`Failed to read file ${filePath}`, { error: String(readError) });
            }
            content = ''; // Default to empty string if read fails
          }
          
          // Extract timestamp from filename or use file creation time
          let timestamp = stats.birthtime.getTime();
          const timestampMatch = file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (timestampMatch) {
            const dateStr = timestampMatch[1].replace(/-/g, (m, i) => i > 9 ? ':' : '-');
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
            language: 'en' // Default language
          };
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Get only the 10 most recent files

      logger.debug('Found transcriptions', { count: files.length });
      return files;
    });
    logger.info('get-transcriptions handler registered successfully');
  } catch (error) {
    if (error instanceof Error) {
      logger.exception(error, 'Error registering get-transcriptions handler');
    } else {
      logger.error('Error registering get-transcriptions handler', { error: String(error) });
    }
  }
  
  // Log all registered IPC handlers for debugging
  const registeredChannels = (ipcMain as any)._events ? Object.keys((ipcMain as any)._events) : [];
  logger.debug('File storage handlers registered', { registeredChannels });
};
