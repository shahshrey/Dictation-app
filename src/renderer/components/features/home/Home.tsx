import React, { Suspense, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { LoadingSpinner } from '../../ui/loading-spinner';
import StatsCard from '../../ui/stats-card';
import { useAppContext } from '../../../context/AppContext';
import { Zap, Gauge, Flame } from 'lucide-react';
import {
  calculateWeeklyStreak,
  calculateAverageWPM,
  calculateTotalWords,
  getWPMPercentile,
} from '../../../utils/stats-utils';

const Home: React.FC = () => {
  const { recentTranscriptions } = useAppContext();

  // Calculate stats with memoization to avoid unnecessary recalculations
  const stats = useMemo(() => {
    const weeklyStreak = calculateWeeklyStreak(recentTranscriptions);
    const averageWPM = calculateAverageWPM(recentTranscriptions);
    const totalWords = calculateTotalWords(recentTranscriptions);
    const wpmPercentile = getWPMPercentile(averageWPM);

    return {
      weeklyStreak,
      averageWPM,
      totalWords,
      wpmPercentile,
    };
  }, [recentTranscriptions]);

  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>Home</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Good afternoon, Shrey</h2>
          <p className="text-muted-foreground">
            Hold down <kbd className="px-2 py-1 bg-muted rounded text-xs">fn</kbd> and speak into
            any textbox
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Suspense fallback={<LoadingSpinner />}>
              <StatsCard
                title="Weekly streak"
                value={`${stats.weeklyStreak} weeks`}
                icon={<Zap className="h-6 w-6" />}
                description={`${stats.weeklyStreak > 0 ? 'Keep it up!' : 'Start dictating to build your streak'}`}
                iconClassName="text-yellow-500 dark:text-yellow-400"
              />

              <StatsCard
                title="Average Flowing speed"
                value={`${stats.averageWPM} WPM`}
                icon={<Gauge className="h-6 w-6" />}
                description={stats.wpmPercentile}
                iconClassName="text-blue-500 dark:text-blue-400"
              />

              <StatsCard
                title="Total words dictated"
                value={stats.totalWords.toLocaleString()}
                icon={<Flame className="h-6 w-6" />}
                description={
                  stats.totalWords > 0
                    ? "You've written 1 instruction manual!"
                    : 'Start dictating to see your total'
                }
                iconClassName="text-orange-500 dark:text-orange-400"
              />
            </Suspense>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Home;
