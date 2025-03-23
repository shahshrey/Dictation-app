import React, { useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import StatsSection from './StatsSection';
import { useAppContext } from '../../../context/AppContext';
import { Keyboard } from 'lucide-react';
import { StatsErrorBoundary } from './StatsErrorBoundary';

const Home: React.FC = () => {
  const { settings } = useAppContext();

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <Card className="flex-1 overflow-hidden border-none shadow-none bg-transparent">
      <CardContent className="p-8">
        <div className="space-y-8">
          {/* Welcome section with gradient text */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {greeting}, Shrey
            </h1>
            <p className="text-muted-foreground text-lg">
              Ready to turn your thoughts into text? Let's get started.
            </p>
          </div>

          {/* Hotkey instruction card */}
          <Card className="p-4 border border-primary/20 bg-primary/5 flex items-center space-x-4 rounded-lg shadow-sm">
            <div className="bg-primary/10 p-3 rounded-full">
              <Keyboard className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Quick Dictation</h3>
              <p className="text-sm text-muted-foreground">
                Press{' '}
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">
                  {settings.hotkey}
                </kbd>{' '}
                in any text field to start dictating
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-primary-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <span>Always ready</span>
            </div>
          </Card>

          {/* Stats section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Dictation Stats</h2>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </div>
            <StatsErrorBoundary>
              <StatsSection />
            </StatsErrorBoundary>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Home;
