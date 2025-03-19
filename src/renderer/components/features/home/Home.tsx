import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { LoadingSpinner } from '../../ui/loading-spinner';
import TranscriptionHistory from './TranscriptionHistory';

const Home: React.FC = () => {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>Home</CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-auto pb-6">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="h-full">
            <Suspense
              fallback={
                <div className="flex justify-center">
                  <LoadingSpinner />
                </div>
              }
            >
              <TranscriptionHistory />
            </Suspense>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Home;
