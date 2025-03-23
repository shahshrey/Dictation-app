import { Transcription } from '../types';

/**
 * Constants for validation thresholds
 */
export const VALIDATION_THRESHOLDS = {
  MIN_DURATION: 1, // Minimum valid duration in seconds
  MAX_DURATION: 7200, // Maximum valid duration (2 hours)
  MIN_WORD_COUNT: 1, // Minimum word count
  MAX_WORD_COUNT: 50000, // Maximum word count
  MIN_WPM: 10, // Minimum realistic WPM
  MAX_WPM: 400, // Maximum realistic WPM (world record ~360 WPM)
  MIN_CONFIDENCE: 0.1, // Minimum confidence score (0.1 to 1.0)
  MAX_CONFIDENCE: 1.0, // Maximum confidence score
  MAX_FUTURE_TIMESTAMP: 60 * 1000, // Max milliseconds in future (60 seconds)
  MIN_PAST_TIMESTAMP: 10 * 365 * 24 * 60 * 60 * 1000, // ~10 years in past
};

/**
 * Validates if a transcription object has all required fields with valid values
 */
export const isValidTranscription = (transcription: Transcription): boolean => {
  if (!transcription) return false;

  // Check required fields exist
  if (!transcription.id || !transcription.text || !transcription.timestamp) {
    return false;
  }

  // Validate timestamp (not in future, not too far in past)
  const now = Date.now();
  if (
    transcription.timestamp > now + VALIDATION_THRESHOLDS.MAX_FUTURE_TIMESTAMP ||
    transcription.timestamp < now - VALIDATION_THRESHOLDS.MIN_PAST_TIMESTAMP
  ) {
    return false;
  }

  // If duration exists, validate it's within realistic bounds
  if (
    transcription.duration !== undefined &&
    (transcription.duration < VALIDATION_THRESHOLDS.MIN_DURATION ||
      transcription.duration > VALIDATION_THRESHOLDS.MAX_DURATION)
  ) {
    return false;
  }

  // If wordCount exists, validate it's within realistic bounds
  if (
    transcription.wordCount !== undefined &&
    (transcription.wordCount < VALIDATION_THRESHOLDS.MIN_WORD_COUNT ||
      transcription.wordCount > VALIDATION_THRESHOLDS.MAX_WORD_COUNT)
  ) {
    return false;
  }

  // If confidence exists, validate it's within proper range
  if (
    transcription.confidence !== undefined &&
    (transcription.confidence < VALIDATION_THRESHOLDS.MIN_CONFIDENCE ||
      transcription.confidence > VALIDATION_THRESHOLDS.MAX_CONFIDENCE)
  ) {
    return false;
  }

  // If both duration and wordCount exist, validate WPM is realistic
  if (
    transcription.duration !== undefined &&
    transcription.duration > 0 &&
    transcription.wordCount !== undefined &&
    transcription.wordCount > 0
  ) {
    const wpm = (transcription.wordCount / transcription.duration) * 60;
    if (wpm < VALIDATION_THRESHOLDS.MIN_WPM || wpm > VALIDATION_THRESHOLDS.MAX_WPM) {
      return false;
    }
  }

  return true;
};

/**
 * Normalizes transcription values to ensure they are within valid ranges
 */
export const normalizeTranscription = (transcription: Transcription): Transcription => {
  if (!transcription) return transcription;

  // Create a deep copy to avoid mutating the original
  const normalized = { ...transcription };

  // Ensure timestamp is valid
  const now = Date.now();
  if (normalized.timestamp > now) {
    normalized.timestamp = now;
  }

  // Ensure duration is within bounds
  if (normalized.duration !== undefined) {
    normalized.duration = Math.max(
      VALIDATION_THRESHOLDS.MIN_DURATION,
      Math.min(normalized.duration, VALIDATION_THRESHOLDS.MAX_DURATION)
    );
  }

  // Ensure wordCount is within bounds
  if (normalized.wordCount !== undefined) {
    normalized.wordCount = Math.max(
      VALIDATION_THRESHOLDS.MIN_WORD_COUNT,
      Math.min(normalized.wordCount, VALIDATION_THRESHOLDS.MAX_WORD_COUNT)
    );
  }

  // Ensure confidence is within proper range
  if (normalized.confidence !== undefined) {
    normalized.confidence = Math.max(
      VALIDATION_THRESHOLDS.MIN_CONFIDENCE,
      Math.min(normalized.confidence, VALIDATION_THRESHOLDS.MAX_CONFIDENCE)
    );
  }

  return normalized;
};
/**
 * Filters and normalizes a collection of transcriptions
 */
export const sanitizeTranscriptions = (transcriptions: Transcription[]): Transcription[] => {
  if (!transcriptions) return [];

  // Filter out invalid transcriptions
  const validTranscriptions = transcriptions.filter(isValidTranscription);

  // Normalize all remaining transcriptions and return them
  return validTranscriptions.map(normalizeTranscription);

  // Removed the outlier filtering step to keep all valid transcriptions
};
