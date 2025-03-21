import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const Dictionary: React.FC = () => {
  return (
    <Card className="flex-1 overflow-hidden">
      <CardHeader>
        <CardTitle>Dictionary</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-2xl font-semibold mb-2">Custom Dictionary</h2>
          <p className="text-muted-foreground max-w-md">
            Add custom words and phrases to your personal dictionary to improve transcription
            accuracy. This feature is coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dictionary;
