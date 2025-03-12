import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Card } from '../../ui/card';

const TranscriptionDisplay: React.FC = () => {
  const { currentTranscription } = useAppContext();
  
  if (!currentTranscription) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No transcription available. Record and transcribe audio to see results here.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {new Date(currentTranscription.timestamp).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              Language: {currentTranscription.language || 'auto'}
            </span>
          </div>
          <div className="whitespace-pre-wrap">{currentTranscription.text}</div>
        </div>
      </Card>
    </div>
  );
};

export default TranscriptionDisplay; 