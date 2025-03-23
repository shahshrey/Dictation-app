import { Transcription } from '../../shared/types';
import { sanitizeTranscriptions } from '../../shared/utils/validation';

/**
 * Calculate the weekly streak of transcriptions
 * @param transcriptions Array of transcriptions
 * @returns Number of consecutive weeks with transcriptions
 */
export const calculateWeeklyStreak = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions
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

  // Sanitize and get valid transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Filter transcriptions that have both duration and word count
  const transcriptionsWithWPM = validTranscriptions.filter(
    t => t.duration && t.duration > 0 && t.wordCount && t.wordCount > 0
  );

  if (!transcriptionsWithWPM.length) return 0;

  // Calculate WPM for each transcription - removed outlier filtering
  const wpmValues = transcriptionsWithWPM.map(t => {
    const minutes = t.duration! / 60; // Convert seconds to minutes
    return t.wordCount! / minutes; // Words per minute
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  return validTranscriptions.reduce((total, t) => total + (t.wordCount || 0), 0);
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  return Math.max(...validTranscriptions.map(t => t.duration || 0));
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return { day: 'N/A', count: 0 };

  // Initialize counts for each day (0 = Sunday, 1 = Monday, etc.)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Count sessions per day
  validTranscriptions.forEach(t => {
    const day = new Date(t.timestamp).getDay();
    dayCounts[day]++;
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

  return { day: dayNames[maxDay], count: maxCount };
};

/**
 * Calculate average session duration
 * @param transcriptions Array of transcriptions
 * @returns Average session duration in seconds, rounded to nearest whole number
 */
export const calculateAverageSessionDuration = (transcriptions: Transcription[]): number => {
  if (!transcriptions || !transcriptions.length) return 0;

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  // Filter out transcriptions with invalid duration
  const transcriptionsWithDuration = validTranscriptions.filter(t => t.duration && t.duration > 0);
  if (!transcriptionsWithDuration.length) return 0;

  // Calculate average without removing outliers
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  const transcriptionsWithConfidence = validTranscriptions.filter(t => t.confidence !== undefined);

  if (!transcriptionsWithConfidence.length) return 0;

  // Calculate average without removing outliers
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (!validTranscriptions.length) return 0;

  return validTranscriptions.reduce((total, t) => total + (t.duration || 0), 0);
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

  // Sanitize transcriptions
  const validTranscriptions = sanitizeTranscriptions(transcriptions);
  if (validTranscriptions.length < timeWindow * 2) return 0;

  const sortedTranscriptions = [...validTranscriptions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(t => t.duration && t.duration > 0 && t.wordCount && t.wordCount > 0);

  if (sortedTranscriptions.length < timeWindow * 2) return 0;

  // Get recent and older sets of transcriptions
  const recentTranscriptions = sortedTranscriptions.slice(0, timeWindow);
  const olderTranscriptions = sortedTranscriptions.slice(timeWindow, timeWindow * 2);

  // Calculate average WPM for each set
  const calcAvgWpm = (items: Transcription[]): number => {
    if (!items.length) return 0;

    const wpmValues = items.map(t => {
      const minutes = t.duration! / 60;
      return t.wordCount! / minutes;
    });

    return wpmValues.reduce((sum, wpm) => sum + wpm, 0) / wpmValues.length;
  };

  const recentAvgWpm = calcAvgWpm(recentTranscriptions);
  const olderAvgWpm = calcAvgWpm(olderTranscriptions);

  if (olderAvgWpm === 0) return 0;

  return Math.round(((recentAvgWpm - olderAvgWpm) / olderAvgWpm) * 100);
};
