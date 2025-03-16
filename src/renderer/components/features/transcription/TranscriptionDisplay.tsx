import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';

const TranscriptionDisplay: React.FC = () => {
  const { currentTranscription } = useAppContext();

  if (!currentTranscription) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No transcription available. Record and transcribe audio to see results here.</p>
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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          {/* Header with title and timestamp */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              {currentTranscription.title || 'Untitled Transcription'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {formatDate(currentTranscription.timestamp)}
            </span>
          </div>

          {/* Metadata section */}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Language:</span>
              <Badge variant="outline">{currentTranscription.language || 'auto'}</Badge>
            </div>

            {currentTranscription.duration > 0 && (
              <div className="flex items-center gap-1">
                <span>Duration:</span>
                <Badge variant="outline">{formatDuration(currentTranscription.duration)}</Badge>
              </div>
            )}

            {currentTranscription.wordCount && (
              <div className="flex items-center gap-1">
                <span>Words:</span>
                <Badge variant="outline">{currentTranscription.wordCount}</Badge>
              </div>
            )}

            {currentTranscription.confidence !== undefined && (
              <div className="flex items-center gap-1">
                <span>Confidence:</span>
                <Badge variant="outline">
                  {Math.round(currentTranscription.confidence * 100)}%
                </Badge>
              </div>
            )}

            {currentTranscription.source && (
              <div className="flex items-center gap-1">
                <span>Source:</span>
                <Badge variant="outline">{currentTranscription.source}</Badge>
              </div>
            )}
          </div>

          {/* Tags */}
          {currentTranscription.tags && currentTranscription.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentTranscription.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Transcription text */}
          <div className="whitespace-pre-wrap">{currentTranscription.text}</div>

          {/* Speaker segments */}
          {currentTranscription.segments && currentTranscription.segments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Segments</h4>
              <div className="space-y-2">
                {currentTranscription.segments.map(segment => {
                  const speaker = currentTranscription.speakers?.find(
                    s => s.id === segment.speakerId
                  );
                  return (
                    <div key={segment.id} className="p-2 bg-accent/30 rounded-md">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{speaker?.name || `Speaker ${segment.speakerId || 'Unknown'}`}</span>
                        <span>
                          {formatDuration(segment.startTime)} - {formatDuration(segment.endTime)}
                        </span>
                      </div>
                      <p>{segment.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TranscriptionDisplay;
