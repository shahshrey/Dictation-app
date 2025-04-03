import { Transcription } from '../../shared/types';
import { sanitizeTranscriptions, VALIDATION_THRESHOLDS } from '../../shared/utils/validation';

/**
 * Calculate the weekly streak of transcriptions
 * @param transcriptions Array of transcriptions
 * @returns Number of consecutive weeks with transcriptions
 */
export const calculateWeeklyStreak = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Sort transcriptions by timestamp (newest first)
  const sortedTranscriptions = [...validTranscriptions].sort((a, b) => b.timestamp - a.timestamp);

  // Get the current week (based on the newest transcription)
  const latestTimestamp = sortedTranscriptions[0].timestamp;
  const currentWeekStart = getWeekStart(latestTimestamp);

  // Check if there is at least one transcription in the current week
  const hasCurrentWeek = sortedTranscriptions.some(t => t.timestamp >= currentWeekStart);

  if (!hasCurrentWeek) return 0;

  // Count consecutive weeks with transcriptions
  let streak = 1; // Start with 1 for the current week
  let weekStart = currentWeekStart;
  let previousWeekStart = getPreviousWeekStart(weekStart);

  while (
    sortedTranscriptions.some(t => t.timestamp < weekStart && t.timestamp >= previousWeekStart)
  ) {
    streak++;
    weekStart = previousWeekStart;
    previousWeekStart = getPreviousWeekStart(weekStart);
  }

  return streak;
};

/**
 * Calculate the average words per minute (WPM) across all transcriptions
 * @param transcriptions Array of transcriptions
 * @returns Average WPM rounded to nearest whole number, or 0 if no data
 */
export const calculateAverageWPM = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize and get valid transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Filter transcriptions that have both duration and word count
  // The sanitization process should have filled in missing values where possible
  const transcriptionsWithWPM = validTranscriptions.filter(
    t => t.duration && t.duration > 0 && t.wordCount && t.wordCount > 0
  );

  if (!transcriptionsWithWPM.length) return 0;

  // Calculate WPM for each transcription
  const wpmValues = transcriptionsWithWPM.map(t => {
    const minutes = t.duration! / 60; // Convert seconds to minutes
    const wpm = t.wordCount! / minutes; // Words per minute

    // Apply reasonable bounds to WPM values to prevent extreme outliers
    // from skewing the average, but don't discard the data entirely
    return Math.max(VALIDATION_THRESHOLDS.MIN_WPM, Math.min(wpm, VALIDATION_THRESHOLDS.MAX_WPM));
  });

  // Calculate average WPM
  const totalWPM = wpmValues.reduce((sum, wpm) => sum + wpm, 0);
  return Math.round(totalWPM / wpmValues.length);
};

/**
 * Calculate total words across all transcriptions
 * @param transcriptions Array of transcriptions
 * @returns Total word count
 */
export const calculateTotalWords = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Calculate word count for transcriptions that don't have it
  const processedTranscriptions = validTranscriptions.map(t => {
    if (t.wordCount === undefined && t.text) {
      return {
        ...t,
        wordCount: t.text.split(/\s+/).filter(Boolean).length,
      };
    }
    return t;
  });

  return processedTranscriptions.reduce((total, t) => total + (t.wordCount || 0), 0);
};

/**
 * Get percentage rank relative to other users (placeholder function)
 * @param wpm Words per minute value
 * @returns String representing the percentile
 */
export const getWPMPercentile = (wpm: number): string => {
  // This is a placeholder function
  // In a real app, this would compare to actual user data from a backend
  if (wpm > 130) return 'Top 2% of all users';
  if (wpm > 100) return 'Top 10% of all users';
  if (wpm > 80) return 'Top 25% of all users';
  return 'Top 50% of all users';
};

/**
 * Get the start timestamp of the week containing the given timestamp
 * @param timestamp Millisecond timestamp
 * @returns Timestamp for the start of the week (Sunday)
 */
const getWeekStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Go back to the start of the week (Sunday)
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);

  return date.getTime();
};

/**
 * Get the start timestamp of the week before the given week start
 * @param weekStart Timestamp for the start of a week
 * @returns Timestamp for the start of the previous week
 */
const getPreviousWeekStart = (weekStart: number): number => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() - 7);
  return date.getTime();
};

/**
 * Calculate longest dictation session duration
 * @param transcriptions Array of transcriptions
 * @returns Longest session duration in seconds
 */
export const calculateLongestSession = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Filter out transcriptions with invalid duration and apply a minimum duration
  const durationsWithMinimum = validTranscriptions.map(t => {
    // If duration is missing or invalid, try to estimate it from word count
    if (!t.duration || t.duration <= 0) {
      if (t.wordCount && t.wordCount > 0) {
        // Estimate duration based on average speaking rate of 150 WPM
        return Math.max(VALIDATION_THRESHOLDS.MIN_DURATION, Math.round((t.wordCount / 150) * 60));
      }
      return 0;
    }
    return t.duration;
  });

  return Math.max(...durationsWithMinimum);
};

/**
 * Calculate the most active day of the week
 * @param transcriptions Array of transcriptions
 * @returns The most active day of week and session count
 */
export const calculateMostActiveDay = (
  transcriptions: Transcription[]
): { day: string; count: number } => {
  if (!transcriptions || !transcriptions.length) return { day: 'N/A', count: 0 };

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return { day: 'N/A', count: 0 };

  // Initialize counts for each day (0 = Sunday, 1 = Monday, etc.)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Count sessions per day
  validTranscriptions.forEach(t => {
    // Ensure timestamp is valid
    if (t.timestamp) {
      const day = new Date(t.timestamp).getDay();
      dayCounts[day]++;
    }
  });

  // Find max count and corresponding day
  let maxCount = 0;
  let maxDay = 0;

  dayCounts.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  });

  // If no data was found, return N/A
  if (maxCount === 0) {
    return { day: 'N/A', count: 0 };
  }

  return { day: dayNames[maxDay], count: maxCount };
};

/**
 * Calculate average session duration
 * @param transcriptions Array of transcriptions
 * @returns Average session duration in seconds, rounded to nearest whole number
 */
export const calculateAverageSessionDuration = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Process transcriptions to ensure they have valid durations
  const processedTranscriptions = validTranscriptions.map(t => {
    // If duration is missing or invalid, try to estimate it from word count
    if (!t.duration || t.duration <= 0) {
      if (t.wordCount && t.wordCount > 0) {
        // Estimate duration based on average speaking rate of 150 WPM
        return {
          ...t,
          duration: Math.max(
            VALIDATION_THRESHOLDS.MIN_DURATION,
            Math.round((t.wordCount / 150) * 60)
          ),
        };
      }
      return t;
    }
    return t;
  });

  // Filter out any remaining transcriptions with invalid duration
  const transcriptionsWithDuration = processedTranscriptions.filter(
    t => t.duration && t.duration > 0
  );
  if (!transcriptionsWithDuration.length) return 0;

  // Calculate average
  const totalDuration = transcriptionsWithDuration.reduce((sum, t) => sum + (t.duration || 0), 0);
  return Math.round(totalDuration / transcriptionsWithDuration.length);
};

/**
 * Calculate average confidence score
 * @param transcriptions Array of transcriptions
 * @returns Average confidence percentage (0-100)
 */
export const calculateAverageConfidence = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Process transcriptions to ensure they have confidence values
  const processedTranscriptions = validTranscriptions.map(t => {
    // If confidence is missing, use a default value
    if (t.confidence === undefined) {
      return {
        ...t,
        confidence: VALIDATION_THRESHOLDS.MIN_CONFIDENCE, // Use minimum valid confidence as default
      };
    }
    return t;
  });

  // Filter out any transcriptions that still don't have confidence values
  const transcriptionsWithConfidence = processedTranscriptions.filter(
    t => t.confidence !== undefined
  );
  if (!transcriptionsWithConfidence.length) return 0;

  // Calculate average
  const totalConfidence = transcriptionsWithConfidence.reduce(
    (sum, t) => sum + (t.confidence || 0),
    0
  );
  return Math.round((totalConfidence / transcriptionsWithConfidence.length) * 100);
};

/**
 * Calculate total dictation time across all sessions
 * @param transcriptions Array of transcriptions
 * @returns Total time in seconds
 */
export const calculateTotalDictationTime = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Process transcriptions to ensure they have valid durations
  const processedTranscriptions = validTranscriptions.map(t => {
    // If duration is missing or invalid, try to estimate it from word count
    if (!t.duration || t.duration <= 0) {
      if (t.wordCount && t.wordCount > 0) {
        // Estimate duration based on average speaking rate of 150 WPM
        return {
          ...t,
          duration: Math.max(
            VALIDATION_THRESHOLDS.MIN_DURATION,
            Math.round((t.wordCount / 150) * 60)
          ),
        };
      }
      return t;
    }
    return t;
  });

  return processedTranscriptions.reduce((total, t) => total + (t.duration || 0), 0);
};

/**
 * Calculate WPM improvement over time
 * @param transcriptions Array of transcriptions
 * @param timeWindow Number of recent transcriptions to compare
 * @returns Percentage improvement (positive or negative)
 */
export const calculateWPMImprovement = (
  transcriptions: Transcription[],
  timeWindow: number = 5
): number => {
  if (!transcriptions || transcriptions.length < timeWindow * 2) return 0;

  // Sanitize transcriptions with improved data recovery
  const validTranscriptions = sanitizeTranscriptions(transcriptions);

  // Process transcriptions to ensure they have valid durations and word counts
  const processedTranscriptions = validTranscriptions.map(t => {
    const processed = {
      ...t,
      // Calculate word count if missing
      wordCount:
        t.wordCount === undefined && t.text
          ? t.text.split(/\s+/).filter(Boolean).length
          : t.wordCount,
      // Estimate duration if missing
      duration:
        (!t.duration || t.duration <= 0) && t.wordCount && t.wordCount > 0
          ? Math.max(VALIDATION_THRESHOLDS.MIN_DURATION, Math.round((t.wordCount / 150) * 60))
          : t.duration,
    };

    return processed;
  });

  // Sort and filter transcriptions that have both duration and word count
  const sortedTranscriptions = [...processedTranscriptions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(t => t.duration && t.duration > 0 && t.wordCount && t.wordCount > 0);

  // If we don't have enough data after processing, return 0
  if (sortedTranscriptions.length < timeWindow * 2) {
    // If we have at least some data, use what we have
    if (sortedTranscriptions.length >= 2) {
      // Adjust the window size based on available data
      const adjustedWindow = Math.floor(sortedTranscriptions.length / 2);
      timeWindow = adjustedWindow;
    } else {
      return 0;
    }
  }

  // Get recent and older sets of transcriptions
  const recentTranscriptions = sortedTranscriptions.slice(0, timeWindow);
  const olderTranscriptions = sortedTranscriptions.slice(timeWindow, timeWindow * 2);

  // Calculate average WPM for each set with bounds checking
  const calcAvgWpm = (items: Transcription[]): number => {
    if (!items.length) return 0;

    const wpmValues = items.map(t => {
      const minutes = t.duration! / 60;
      const wpm = t.wordCount! / minutes;

      // Apply reasonable bounds to WPM values
      return Math.max(VALIDATION_THRESHOLDS.MIN_WPM, Math.min(wpm, VALIDATION_THRESHOLDS.MAX_WPM));
    });

    return wpmValues.reduce((sum, wpm) => sum + wpm, 0) / wpmValues.length;
  };

  const recentAvgWpm = calcAvgWpm(recentTranscriptions);
  const olderAvgWpm = calcAvgWpm(olderTranscriptions);

  if (olderAvgWpm === 0) return 0;

  return Math.round(((recentAvgWpm - olderAvgWpm) / olderAvgWpm) * 100);
};
