import { dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getSaveDir, getTempDir } from '../path-constants';
import logger from '../../../shared/logger';
import { Transcription } from '../../../shared/types';
import {
  SaveTranscriptionOptions,
  SaveTranscriptionResult,
  GetTranscriptionsResult,
  GetTranscriptionResult,
  DeleteTranscriptionResult,
  OpenFileResult,
} from '../../../shared/storage';

interface TranscriptionWithStats {
  transcription: Transcription;
  stats: {
    createdAt: Date;
    modifiedAt: Date;
  };
}

/**
 * Save transcription to a file
 */
export const saveTranscription = async (
  transcription: Transcription,
  options: SaveTranscriptionOptions = {}
): Promise<SaveTranscriptionResult> => {
  try {
    // Check if a file with this ID already exists in the save directory
    const saveDir = getSaveDir();

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Look for existing files with the same ID
    if (transcription.id) {
      const files = fs
        .readdirSync(saveDir)
        .filter(file => file.endsWith('.json') && file !== 'transcriptions.json');

      for (const file of files) {
        try {
          const filePath = path.join(saveDir, file);
          const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
          const existingTranscription = JSON.parse(content) as Transcription;

          // If a file with this ID already exists, don't create a duplicate
          if (existingTranscription.id === transcription.id) {
            logger.debug(`Transcription with ID ${transcription.id} already exists, skipping save`);
            return { success: true, filePath };
          }
        } catch (error) {
          logger.error(`Error checking file ${file}:`, { error: (error as Error).message });
        }
      }
    }

    // If we get here, no duplicate was found, proceed with normal save operation
    const filename = options?.filename || 'transcription';
    const format = 'json';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}_${timestamp}.${format}`;

    const filePath = path.join(saveDir, fullFilename);

    fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

    return { success: true, filePath };
  } catch (error) {
    logger.error('Failed to save transcription:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Save transcription with file dialog
 */
export const saveTranscriptionAs = async (
  transcription: Transcription
): Promise<SaveTranscriptionResult> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();
    const defaultPath = path.join(saveDir, `transcription_${timestamp}.json`);

    // Ensure the directory exists
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
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

    fs.writeFileSync(filePath, JSON.stringify(transcription, null, 2), { encoding: 'utf-8' });

    return { success: true, filePath };
  } catch (error) {
    logger.error('Failed to save transcription:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Get recent transcriptions
 */
export const getRecentTranscriptions = async (): Promise<GetTranscriptionsResult> => {
  try {
    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();

    if (!fs.existsSync(saveDir)) {
      return { success: true, transcriptions: [] };
    }

    const files = fs
      .readdirSync(saveDir)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json')
      .map(file => {
        try {
          const filePath = path.join(saveDir, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
          return {
            transcription: JSON.parse(content) as Transcription,
            stats: {
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
            },
          };
        } catch (error) {
          logger.error(`Error processing file ${file}:`, { error: (error as Error).message });
          return null;
        }
      })
      .filter((item): item is TranscriptionWithStats => item !== null)
      .sort((a, b) => b.stats.modifiedAt.getTime() - a.stats.modifiedAt.getTime())
      .slice(0, 10);

    return {
      success: true,
      transcriptions: files.map(f => f.transcription),
    };
  } catch (error) {
    logger.error('Failed to get recent transcriptions:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Get all transcriptions
 */
export const getTranscriptions = async (): Promise<Transcription[]> => {
  try {
    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();

    if (!fs.existsSync(saveDir)) {
      logger.debug('Main process: Save directory does not exist');
      return [];
    }

    // Force a directory read to get the latest files
    const files = fs
      .readdirSync(saveDir, { withFileTypes: true })
      .filter(
        dirent =>
          dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'transcriptions.json'
      )
      .map(dirent => {
        const filePath = path.join(saveDir, dirent.name);

        try {
          // Read file content
          let transcription = null;
          try {
            const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
            transcription = JSON.parse(content) as Transcription;
          } catch (readError) {
            logger.error(`Failed to read or parse file ${filePath}:`, {
              error: (readError as Error).message,
            });
            return null; // Skip this file if we can't read or parse it
          }

          // Return the parsed transcription
          return transcription;
        } catch (error) {
          logger.error(`Failed to process file ${dirent.name}:`, {
            error: (error as Error).message,
          });
          return null;
        }
      })
      .filter((item): item is Transcription => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    return files;
  } catch (error) {
    logger.error('Failed to get transcriptions:', { error: (error as Error).message });
    return [];
  }
};

/**
 * Get a specific transcription by ID
 */
export const getTranscription = async (id: string): Promise<GetTranscriptionResult> => {
  try {
    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();

    if (!fs.existsSync(saveDir)) {
      return { success: false, error: 'Save directory does not exist' };
    }

    const files = fs
      .readdirSync(saveDir)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json');

    for (const file of files) {
      try {
        const filePath = path.join(saveDir, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const transcription = JSON.parse(content) as Transcription;

        if (transcription.id === id) {
          return { success: true, transcription };
        }
      } catch (error) {
        logger.error(`Error processing file ${file}:`, { error: (error as Error).message });
      }
    }

    return { success: false, error: 'Transcription not found' };
  } catch (error) {
    logger.error('Failed to get transcription:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Delete a transcription by ID
 */
export const deleteTranscription = async (id: string): Promise<DeleteTranscriptionResult> => {
  try {
    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();

    if (!fs.existsSync(saveDir)) {
      return { success: false, error: 'Save directory does not exist' };
    }

    const files = fs
      .readdirSync(saveDir)
      .filter(file => file.endsWith('.json') && file !== 'transcriptions.json');

    for (const file of files) {
      try {
        const filePath = path.join(saveDir, file);
        const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const transcription = JSON.parse(content) as Transcription;

        if (transcription.id === id) {
          fs.unlinkSync(filePath);
          return { success: true };
        }
      } catch (error) {
        logger.error(`Error processing file ${file}:`, { error: (error as Error).message });
      }
    }

    return { success: false, error: 'Transcription not found or could not be deleted' };
  } catch (error) {
    logger.error('Failed to delete transcription:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Open a file with the default application
 */
export const openFile = (filePath: string): OpenFileResult => {
  try {
    shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    logger.error('Failed to open file:', { error: (error as Error).message });
    return { success: false, error: String(error) };
  }
};

/**
 * Ensure directories exist
 */
export const ensureStorageDirectories = (): void => {
  // Get directories from settings
  const tempDir = getTempDir();
  const saveDir = getSaveDir();

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', { error: (error as Error).message });
    }
  }

  // Ensure save directory exists
  if (!fs.existsSync(saveDir)) {
    try {
      fs.mkdirSync(saveDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create save directory:', { error: (error as Error).message });
    }
  }
};
