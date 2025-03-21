import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import StatsSection from './StatsSection';
import { useAppContext } from '../../../context/AppContext';

const Home: React.FC = () => {
  const { settings } = useAppContext();

  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>Home</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Good afternoon, Shrey</h2>
          <p className="text-muted-foreground">
            Hold down <kbd className="px-2 py-1 bg-muted rounded text-xs">{settings.hotkey}</kbd>{' '}
            and speak into any textbox
          </p>

          <StatsSection />
        </div>
      </CardContent>
    </Card>
  );
};

export default Home;
