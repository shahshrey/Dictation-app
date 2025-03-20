import { Transcription } from '../../shared/types';

/**
 * Calculate the weekly streak of transcriptions
 * @param transcriptions Array of transcriptions
 * @returns Number of consecutive weeks with transcriptions
 */
export const calculateWeeklyStreak = (transcriptions: Transcription[]): number => {
  if (!transcriptions.length) return 0;

  // Sort transcriptions by timestamp (newest first)
  const sortedTranscriptions = [...transcriptions].sort((a, b) => b.timestamp - a.timestamp);

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
  if (!transcriptions.length) return 0;

  // Filter transcriptions that have both duration and word count
  const validTranscriptions = transcriptions.filter(
    t => t.duration && t.duration > 0 && t.wordCount && t.wordCount > 0
  );

  if (!validTranscriptions.length) return 0;

  // Calculate WPM for each transcription
  const wpmValues = validTranscriptions.map(t => {
    const minutes = t.duration / 60; // Convert seconds to minutes
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
  return transcriptions.reduce((total, t) => total + (t.wordCount || 0), 0);
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
