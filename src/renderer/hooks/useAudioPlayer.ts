import { useState, useRef, useEffect, useCallback } from 'react';
import logger from '../../shared/logger';

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
}

interface UseAudioPlayerReturn extends AudioPlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  togglePlayPause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  audioExists: boolean;
  loadAudio: (filePath: string) => Promise<boolean>;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  // Create an audio element directly instead of waiting for a ref
  const [audioElement] = useState(() => {
    logger.debug('AudioPlayer: Creating new Audio element');
    return new Audio();
  });

  // Keep a ref that always points to our audio element
  const audioRef = useRef<HTMLAudioElement>(audioElement);

  // Ensure the ref is always synced with our audio element
  useEffect(() => {
    logger.debug('AudioPlayer: Syncing audioRef with audio element');
    audioRef.current = audioElement;
  }, [audioElement]);

  const [audioExists, setAudioExists] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    duration: 0,
    currentTime: 0,
    error: null,
  });

  const loadAudio = useCallback(
    async (filePath: string): Promise<boolean> => {
      // Skip if already loaded the same file
      if (filePath === currentFilePath) {
        logger.debug('AudioPlayer: Skipping load - same file already loaded', { filePath });
        return audioExists;
      }

      if (!filePath) {
        logger.error('AudioPlayer: No audio file path provided');
        setState(prev => ({ ...prev, error: 'No audio file path provided' }));
        return false;
      }

      try {
        logger.debug('AudioPlayer: Starting to load audio file', { filePath });
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Verify that we have our audio element
        if (!audioRef.current) {
          logger.error(
            'AudioPlayer: Audio element reference is still null despite direct creation'
          );
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Audio element initialization failed',
          }));
          return false;
        }

        // Check if the audio file exists
        if (window.electronAPI?.getAudioFileStatus) {
          logger.debug('AudioPlayer: Calling getAudioFileStatus IPC for', { filePath });
          const status = await window.electronAPI.getAudioFileStatus(filePath);

          logger.debug('AudioPlayer: File status received', { status, filePath });

          if (!status.exists) {
            const errorMsg = status.error || 'Audio file does not exist';
            logger.error('AudioPlayer: Audio file does not exist', { error: errorMsg, filePath });
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: errorMsg,
            }));
            setAudioExists(false);
            setCurrentFilePath(null);
            return false;
          }

          // File exists, update state
          logger.debug('AudioPlayer: Audio file exists', { size: status.size, filePath });
          setAudioExists(true);
          setCurrentFilePath(filePath);

          // Convert the file path to a URL that the audio element can use
          // For Electron, we can use the file:// protocol
          // But we need to properly encode it for the HTML audio element
          const filePrefix = 'file://';
          const audioUrl = filePrefix + encodeURI(filePath.replace(/\\/g, '/'));
          logger.debug('AudioPlayer: Setting audio source URL', {
            originalPath: filePath,
            audioUrl,
          });

          // Set audio element properties
          audioRef.current.src = audioUrl;
          audioRef.current.currentTime = 0;

          // Reset playback state
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            currentTime: 0,
            error: null,
          }));

          return true;
        } else {
          logger.error('AudioPlayer: getAudioFileStatus IPC method not available');
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Unable to load audio file',
        }));
        return false;
      } catch (error) {
        logger.error('AudioPlayer: Failed to load audio:', {
          error: (error as Error).message,
          filePath,
        });
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: (error as Error).message,
        }));
        return false;
      }
    },
    [currentFilePath, audioExists, audioRef, audioElement]
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      logger.debug('AudioPlayer: Pausing audio');
      audioRef.current.pause();
    } else {
      logger.debug('AudioPlayer: Playing audio');
      audioRef.current.play().catch(error => {
        logger.error('AudioPlayer: Failed to play audio:', { error: error.message });
        setState(prev => ({ ...prev, error: error.message }));
      });
    }
  }, [state.isPlaying]);

  // Stop playback
  const stop = useCallback(() => {
    if (!audioRef.current) return;

    logger.debug('AudioPlayer: Stopping audio');
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Set current time
  const setCurrentTime = useCallback(
    (time: number) => {
      if (!audioRef.current) return;

      if (time >= 0 && time <= state.duration) {
        logger.debug('AudioPlayer: Setting current time', { time });
        audioRef.current.currentTime = time;
      }
    },
    [state.duration]
  );

  // Set up event listeners for the audio element
  useEffect(() => {
    if (!audioRef.current) {
      logger.error('AudioPlayer: Cannot set up event listeners - audioRef is null');
      return;
    }

    const audio = audioRef.current;

    const handlePlay = () => {
      logger.debug('AudioPlayer: Play event fired');
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      logger.debug('AudioPlayer: Pause event fired');
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleTimeUpdate = () => setState(prev => ({ ...prev, currentTime: audio.currentTime }));

    const handleDurationChange = () => {
      logger.debug('AudioPlayer: Duration changed', { duration: audio.duration });
      setState(prev => ({ ...prev, duration: audio.duration }));
    };

    const handleEnded = () => {
      logger.debug('AudioPlayer: Playback ended');
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      audio.currentTime = 0;
    };

    const handleError = (e: ErrorEvent) => {
      logger.error('AudioPlayer: Audio element error event:', {
        code: audio.error?.code,
        message: audio.error?.message || e.message,
        src: audio.src,
      });
      setState(prev => ({ ...prev, error: 'Error playing audio file', isPlaying: false }));
    };

    // Add event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as EventListener);

    // Clean up event listeners when component unmounts
    return () => {
      logger.debug('AudioPlayer: Removing event listeners');
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as EventListener);

      // Also clean up the audio element
      audio.pause();
      audio.src = '';
    };
  }, [audioElement]);

  return {
    ...state,
    audioRef,
    togglePlayPause,
    stop,
    setCurrentTime,
    audioExists,
    loadAudio,
  };
};
