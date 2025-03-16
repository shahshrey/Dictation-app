import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

const RecentTranscriptions: React.FC = () => {
  const { recentTranscriptions, setCurrentTranscription } = useAppContext();

  if (recentTranscriptions.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <p>No recent transcriptions found.</p>
      </div>
    );
  }

  // Format date to a readable format
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Format duration in seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
      {recentTranscriptions.map(transcription => (
        <Card key={transcription.id} className="p-3 hover:bg-accent/50 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div className="text-sm font-medium truncate flex-1">
              {transcription.title || transcription.text.substring(0, 50)}
              {!transcription.title && transcription.text.length > 50 ? '...' : ''}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentTranscription(transcription)}
              className="ml-2 shrink-0"
            >
              View
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            {transcription.tags &&
              transcription.tags.length > 0 &&
              transcription.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            {transcription.tags && transcription.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{transcription.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDate(transcription.timestamp)}</span>
            <div className="flex gap-2">
              {transcription.wordCount && <span>{transcription.wordCount} words</span>}
              <span>{formatDuration(transcription.duration)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default RecentTranscriptions;
