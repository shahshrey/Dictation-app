import React, { useMemo, Suspense, useCallback } from 'react';
import { LoadingSpinner } from '../../ui/loading-spinner';
import { useAppContext } from '../../../context/AppContext';
import {
  Zap,
  Gauge,
  Flame,
  TrendingUp,
  Clock,
  Calendar,
  Timer,
  BarChart,
  Timer as TimerIcon,
  Percent,
} from 'lucide-react';
import {
  calculateWeeklyStreak,
  calculateAverageWPM,
  calculateTotalWords,
  getWPMPercentile,
  calculateLongestSession,
  calculateMostActiveDay,
  calculateAverageSessionDuration,
  calculateAverageConfidence,
  calculateTotalDictationTime,
  calculateWPMImprovement,
} from '../../../utils/stats-utils';
import { motion } from 'framer-motion';

// Enhanced stat card with animation
interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  iconClassName?: string;
  index: number;
}

const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon,
  description,
  iconClassName,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-all p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
        <div className={`${iconClassName} w-12 h-12`}>{icon}</div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>

        <div className="flex items-baseline">
          <span className="text-3xl md:text-4xl font-bold tracking-tight">{value}</span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground pt-1">
          <TrendingUp className="h-3 w-3" />
          <span>{description}</span>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * StatsSection component displays user statistics in card format
 */
const StatsSection: React.FC = () => {
  const { recentTranscriptions } = useAppContext();

  // Helper function to format time in minutes and seconds
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || seconds <= 0) return '0s';

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }, []);

  // Calculate stats with memoization to avoid unnecessary recalculations
  // and wrap in try-catch to handle potential calculation errors
  const stats = useMemo(() => {
    try {
      const weeklyStreak = calculateWeeklyStreak(recentTranscriptions);
      const averageWPM = calculateAverageWPM(recentTranscriptions);
      const totalWords = calculateTotalWords(recentTranscriptions);
      const wpmPercentile = getWPMPercentile(averageWPM);

      // New stats
      const longestSession = calculateLongestSession(recentTranscriptions);
      const mostActiveDay = calculateMostActiveDay(recentTranscriptions);
      const averageSessionDuration = calculateAverageSessionDuration(recentTranscriptions);
      const averageConfidence = calculateAverageConfidence(recentTranscriptions);
      const totalDictationTime = calculateTotalDictationTime(recentTranscriptions);
      const wpmImprovement = calculateWPMImprovement(recentTranscriptions);

      return {
        weeklyStreak,
        averageWPM,
        totalWords,
        wpmPercentile,
        longestSession,
        mostActiveDay,
        averageSessionDuration,
        averageConfidence,
        totalDictationTime,
        wpmImprovement,
        error: null,
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      // Return default values in case of error
      return {
        weeklyStreak: 0,
        averageWPM: 0,
        totalWords: 0,
        wpmPercentile: 'Data unavailable',
        longestSession: 0,
        mostActiveDay: { day: 'N/A', count: 0 },
        averageSessionDuration: 0,
        averageConfidence: 0,
        totalDictationTime: 0,
        wpmImprovement: 0,
        error: error instanceof Error ? error.message : 'Unknown error calculating stats',
      };
    }
  }, [recentTranscriptions]);

  // Get emoji status for weekly streak
  const weeklyStreakEmoji = useMemo(() => {
    if (stats.weeklyStreak >= 4) return '🔥';
    if (stats.weeklyStreak >= 2) return '⚡';
    return stats.weeklyStreak > 0 ? '👍' : '🏁';
  }, [stats.weeklyStreak]);

  // Get emoji for WPM improvement
  const improvementEmoji = useMemo(() => {
    if (stats.wpmImprovement > 10) return '🚀';
    if (stats.wpmImprovement > 0) return '📈';
    if (stats.wpmImprovement < 0) return '📉';
    return '➡️';
  }, [stats.wpmImprovement]);

  // If we encountered an error in stats calculation, throw it to be caught by error boundary
  if (stats.error) {
    throw new Error(`Failed to load statistics: ${stats.error}`);
  }

  // If no transcriptions exist yet, show a welcome message instead of empty stats
  if (!recentTranscriptions || recentTranscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-medium mb-2">No Dictation Data Yet</h3>
          <p className="text-muted-foreground">
            Start dictating to see your statistics. Press the hotkey in any text field to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Suspense
        fallback={
          <div className="col-span-3 flex justify-center py-10">
            <LoadingSpinner />
          </div>
        }
      >
        {/* Original stats */}
        <EnhancedStatCard
          index={0}
          title="WEEKLY STREAK"
          value={`${stats.weeklyStreak} ${weeklyStreakEmoji}`}
          icon={<Zap className="h-full w-full" />}
          description={`${stats.weeklyStreak > 0 ? 'Keep it up!' : 'Start dictating to build your streak'}`}
          iconClassName="text-yellow-500 dark:text-yellow-400"
        />

        <EnhancedStatCard
          index={1}
          title="AVERAGE SPEAKING PACE"
          value={`${stats.averageWPM} WPM`}
          icon={<Gauge className="h-full w-full" />}
          description={stats.wpmPercentile}
          iconClassName="text-blue-500 dark:text-blue-400"
        />

        <EnhancedStatCard
          index={2}
          title="TOTAL WORDS DICTATED"
          value={stats.totalWords.toLocaleString()}
          icon={<Flame className="h-full w-full" />}
          description={
            stats.totalWords > 0
              ? "That's equivalent to a short novel!"
              : 'Start dictating to see your total'
          }
          iconClassName="text-orange-500 dark:text-orange-400"
        />

        {/* New stats */}
        <EnhancedStatCard
          index={3}
          title="LONGEST SESSION"
          value={formatTime(stats.longestSession)}
          icon={<Clock className="h-full w-full" />}
          description="Your most focused dictation session"
          iconClassName="text-indigo-500 dark:text-indigo-400"
        />

        <EnhancedStatCard
          index={4}
          title="MOST ACTIVE DAY"
          value={stats.mostActiveDay.day}
          icon={<Calendar className="h-full w-full" />}
          description={`${stats.mostActiveDay.count} sessions`}
          iconClassName="text-green-500 dark:text-green-400"
        />

        <EnhancedStatCard
          index={5}
          title="AVG SESSION LENGTH"
          value={formatTime(stats.averageSessionDuration)}
          icon={<Timer className="h-full w-full" />}
          description="Your typical dictation session"
          iconClassName="text-pink-500 dark:text-pink-400"
        />

        <EnhancedStatCard
          index={6}
          title="ACCURACY LEVEL"
          value={`${stats.averageConfidence}%`}
          icon={<BarChart className="h-full w-full" />}
          description="Average confidence score of transcriptions"
          iconClassName="text-cyan-500 dark:text-cyan-400"
        />

        <EnhancedStatCard
          index={7}
          title="TOTAL DICTATION TIME"
          value={formatTime(stats.totalDictationTime)}
          icon={<TimerIcon className="h-full w-full" />}
          description="Time spent dictating"
          iconClassName="text-amber-500 dark:text-amber-400"
        />

        <EnhancedStatCard
          index={8}
          title="SPEAKING IMPROVEMENT"
          value={`${stats.wpmImprovement > 0 ? '+' : ''}${stats.wpmImprovement}% ${improvementEmoji}`}
          icon={<Percent className="h-full w-full" />}
          description="Change in WPM over recent sessions"
          iconClassName="text-purple-500 dark:text-purple-400"
        />
      </Suspense>
    </div>
  );
};

export default StatsSection;
