import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { Search } from 'lucide-react';
import AudioPlayer from '../audio/AudioPlayer';

const TranscriptionHistory: React.FC = () => {
  const { recentTranscriptions, currentTranscription, setCurrentTranscription } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter transcriptions based on search query
  const filteredTranscriptions = recentTranscriptions.filter(transcription => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (transcription.title && transcription.title.toLowerCase().includes(query)) ||
      transcription.text.toLowerCase().includes(query) ||
      (transcription.tags && transcription.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* Left panel - Transcription list */}
      <div className="md:col-span-1 space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search transcriptions..."
            className="w-full pl-8 pr-4 py-2 rounded-md border border-input bg-background text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3 overflow-auto pr-1 max-h-[calc(100vh-250px)]">
          {filteredTranscriptions.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              <p>No transcriptions found.</p>
            </div>
          ) : (
            filteredTranscriptions.map(transcription => (
              <Card
                key={transcription.id}
                className={`p-3 hover:bg-accent/50 transition-colors cursor-pointer ${
                  currentTranscription?.id === transcription.id ? 'bg-accent/50 border-primary' : ''
                }`}
                onClick={() => setCurrentTranscription(transcription)}
              >
                <div className="text-sm font-medium truncate mb-2">
                  {transcription.title || transcription.text.substring(0, 50)}
                  {!transcription.title && transcription.text.length > 50 ? '...' : ''}
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
            ))
          )}
        </div>
      </div>

      {/* Right panel - Transcription details */}
      <div className="md:col-span-2 overflow-auto max-h-[calc(100vh-250px)]">
        {!currentTranscription ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a transcription to view details</p>
          </div>
        ) : (
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
                      <Badge variant="outline">
                        {formatDuration(currentTranscription.duration)}
                      </Badge>
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

                {/* Audio Player */}
                {currentTranscription.audioFilePath && (
                  <div className="mt-2">
                    <AudioPlayer audioFilePath={currentTranscription.audioFilePath} />
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
                              <span>
                                {speaker?.name || `Speaker ${segment.speakerId || 'Unknown'}`}
                              </span>
                              <span>
                                {formatDuration(segment.startTime)} -{' '}
                                {formatDuration(segment.endTime)}
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
        )}
      </div>
    </div>
  );
};

export default TranscriptionHistory;
