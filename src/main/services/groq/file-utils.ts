import * as fs from 'fs';
import * as path from 'path';
import logger from '../../../shared/logger';
import { TranscriptionObject } from './types';
import { getSaveDir } from '../path-constants';

/**
 * Save transcription to a file
 */
export const saveTranscriptionToFile = (
  transcriptionObj: TranscriptionObject
): { filePath: string; fileId: string } => {
  try {
    // Extract the ID from the transcription object
    const fileId = transcriptionObj.id;
    const fullFilename = `${fileId}.json`;

    // Use dynamic path getter to get the save directory from settings
    const saveDir = getSaveDir();
    const filePath = path.join(saveDir, fullFilename);

    // Ensure save directory exists
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, JSON.stringify(transcriptionObj, null, 2), { encoding: 'utf-8' });

    return { filePath, fileId };
  } catch (error) {
    logger.error('Failed to save transcription to file', { error: (error as Error).message });
    return { filePath: '', fileId: '' };
  }
};

/**
 * Validate audio file
 */
export const validateAudioFile = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) {
    logger.error('Recording file not found');
    return false;
  }

  const fileStats = fs.statSync(filePath);
  if (fileStats.size === 0) {
    logger.error('Audio file is empty');
    return false;
  }

  return true;
};

/**
 * Get file stats for duration calculation
 */
export const getFileStats = (filePath: string): fs.Stats | null => {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    logger.error('Failed to get file stats:', { error: (error as Error).message });
    return null;
  }
};
