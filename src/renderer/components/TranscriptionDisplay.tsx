import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Card } from './ui/card';

const TranscriptionDisplay: React.FC = () => {
  const { currentTranscription } = useAppContext();
  
  if (!currentTranscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
        <p className="text-muted-foreground text-center">
          No transcription available. Record and transcribe audio to see results here.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-4">
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground">
          Language: {currentTranscription.language}
        </span>
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {new Date(currentTranscription.timestamp).toLocaleString()}
        </span>
      </div>
      
      <Card className="p-4 flex-1 overflow-auto bg-muted/50 border rounded">
        <p className="whitespace-pre-wrap">
          {currentTranscription.text}
        </p>
      </Card>
    </div>
  );
};

export default TranscriptionDisplay; 