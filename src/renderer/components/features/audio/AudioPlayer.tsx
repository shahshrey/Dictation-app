import React, { useEffect } from 'react';
import { useAudioPlayer } from '../../../hooks/useAudioPlayer';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Card } from '../../ui/card';
import { PlayIcon, PauseIcon, StopIcon } from '@radix-ui/react-icons';
import logger from '../../../../shared/logger';

interface AudioPlayerProps {
  audioFilePath: string;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioFilePath, className = '' }) => {
  logger.debug('AudioPlayer component rendering with path:', { audioFilePath });

  const {
    audioRef,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    error,
    audioExists,
    togglePlayPause,
    stop,
    setCurrentTime,
    loadAudio,
  } = useAudioPlayer();

  // Use a separate effect with a more targeted dependency array
  useEffect(() => {
    if (!audioFilePath) {
      logger.debug('AudioPlayer: No audio file path provided in component');
      return;
    }

    const loadAudioFile = async () => {
      try {
        logger.debug('AudioPlayer: Component attempting to load audio', {
          audioFilePath,
          refAvailable: !!audioRef.current,
        });

        const success = await loadAudio(audioFilePath);
        logger.debug('AudioPlayer: Load audio result', { success, audioFilePath });
      } catch (err) {
        logger.error('AudioPlayer: Failed to load audio in component:', {
          error: (err as Error).message,
          audioFilePath,
        });
      }
    };

    loadAudioFile();

    return () => {
      // Clean up handled by the useAudioPlayer hook now
      logger.debug('AudioPlayer: Component unmounting, cleaning up');
    };
  }, [audioFilePath, loadAudio, audioRef]);

  if (!audioFilePath) {
    logger.debug('AudioPlayer: Rendering null due to missing audioFilePath');
    return null;
  }

  if (error) {
    logger.debug('AudioPlayer: Rendering error state', { error });
    return (
      <Card className={`p-3 text-sm text-destructive ${className}`}>
        <p>Error playing audio: {error}</p>
      </Card>
    );
  }

  if (isLoading) {
    logger.debug('AudioPlayer: Rendering loading state');
    return (
      <Card className={`p-3 flex justify-center items-center ${className}`}>
        <p className="text-sm text-muted-foreground">Loading audio...</p>
      </Card>
    );
  }

  if (!audioExists) {
    logger.debug('AudioPlayer: Rendering file not found state');
    return (
      <Card className={`p-3 ${className}`}>
        <p className="text-sm text-muted-foreground">Audio file not found</p>
      </Card>
    );
  }

  logger.debug('AudioPlayer: Rendering player controls', {
    isPlaying,
    currentTime,
    duration,
    audioFilePath,
  });

  return (
    <Card className={`p-3 ${className}`}>
      {/* We don't need to render the audio element here anymore as we're creating it in the hook */}
      <div className="flex flex-col gap-2">
        {/* Player controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={stop}
            aria-label="Stop"
            title="Stop"
          >
            <StopIcon className="h-4 w-4" />
          </Button>

          <div className="flex-1 ml-2">
            <Slider
              min={0}
              max={duration || 100}
              step={0.1}
              value={[currentTime]}
              onValueChange={(value: number[]) => setCurrentTime(value[0])}
              aria-label="Playback progress"
              className="cursor-pointer"
            />
          </div>

          <div className="ml-2 text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration || 0)}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AudioPlayer;
