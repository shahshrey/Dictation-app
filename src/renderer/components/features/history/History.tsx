import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { LoadingSpinner } from '../../ui/loading-spinner';
import TranscriptionHistory from '../home/TranscriptionHistory';

const History: React.FC = () => {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-auto pb-6">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <TranscriptionHistory />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default History;
