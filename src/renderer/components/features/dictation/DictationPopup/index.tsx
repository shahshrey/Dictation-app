import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import { Mic, MicOff } from 'lucide-react';
import logger from '../../../../../shared/logger';

const DictationPopup: React.FC = () => {
  const { isRecording, startRecording, stopRecording, refreshRecentTranscriptions } =
    useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsHovering] = useState(false);
  const [wasRecording, setWasRecording] = useState(false);

  // Ensure the popup is always interactive when mounted
  useEffect(() => {
    // Make sure the popup is interactive when it first appears
    if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI
        .setIgnoreMouseEvents(false)
        .catch(error =>
          logger.error('Error in setIgnoreMouseEvents on mount:', { error: error.message })
        );
    }

    // Track recording state changes to refresh transcriptions when recording stops
    if (wasRecording && !isRecording) {
      logger.debug('Recording stopped, refreshing transcriptions after delay');
      // Add a delay to ensure the transcription is saved before refreshing
      const timeoutId = setTimeout(() => {
        refreshRecentTranscriptions();
        logger.debug('Transcriptions refreshed after recording stopped');
      }, 2000); // 2 second delay to ensure transcription is processed

      return () => clearTimeout(timeoutId);
    }

    setWasRecording(isRecording);

    return () => {
      logger.debug('DictationPopup unmounting');
    };
  }, [isRecording, wasRecording, refreshRecentTranscriptions]);

  const handleToggleRecording = () => {
    logger.debug('Toggle recording clicked');
    logger.debug('Current recording state:', { isRecording });

    try {
      if (isRecording) {
        logger.debug('Stopping recording');
        stopRecording();
        // We'll refresh transcriptions after a delay in the useEffect
      } else {
        logger.debug('Starting recording');
        startRecording();
      }
      logger.debug('Toggle recording action completed');
    } catch (error) {
      logger.error('Error toggling recording:', { error: (error as Error).message });
    }
  };

  // Handle mouse events for dragging
  const handleMouseEnter = () => {
    logger.debug('Mouse entered popup');
    setIsHovering(true);

    try {
      if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
        window.electronAPI
          .setIgnoreMouseEvents(false)
          .then(() => logger.debug('setIgnoreMouseEvents set to false'))
          .catch(error => logger.error('Error in setIgnoreMouseEvents:', { error: error.message }));
      } else {
        logger.warn('setIgnoreMouseEvents not available');
      }
    } catch (error) {
      logger.error('Error in handleMouseEnter:', { error: (error as Error).message });
    }
  };

  const handleMouseLeave = () => {
    logger.debug('Mouse left popup');
    logger.debug('isDragging:', { isDragging });
    setIsHovering(false);

    // Set ignore mouse events to true with forward=true when leaving
    // This allows clicks to pass through but still shows the overlay
    if (
      !isDragging &&
      window.electronAPI &&
      typeof window.electronAPI.setIgnoreMouseEvents === 'function'
    ) {
      window.electronAPI
        .setIgnoreMouseEvents(true, { forward: true })
        .catch(error =>
          logger.error('Error in setIgnoreMouseEvents on mouse leave:', { error: error.message })
        );
    }
  };

  // Ensure we can click on the pill
  const handleMouseDown = (e: React.MouseEvent) => {
    logger.debug('Mouse down on popup');
    // Make sure we can interact with the popup when clicking
    if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI
        .setIgnoreMouseEvents(false)
        .catch(error =>
          logger.error('Error in setIgnoreMouseEvents on mouse down:', { error: error.message })
        );
    }

    // Start dragging if not clicking on the pill itself
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    logger.debug('Mouse up on popup');
    setIsDragging(false);
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      // Remove any default styling that might cause a white border
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
      }}
      role="application"
      aria-label="Dictation popup"
    >
      {/* Pill container - make it draggable */}
      <button
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105',
          isRecording
            ? 'bg-primary/90 text-primary-foreground'
            : 'bg-gradient-to-r from-primary/80 to-primary-foreground/20 text-primary-foreground hover:from-primary hover:to-primary/70'
        )}
        onClick={e => {
          logger.debug('Pill clicked');
          e.stopPropagation(); // Prevent event bubbling
          handleToggleRecording();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleRecording();
          }
        }}
        // Make only the non-interactive parts draggable
        style={{ WebkitAppRegion: isDragging ? 'drag' : 'no-drag' } as React.CSSProperties}
        aria-pressed={isRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        tabIndex={0}
      >
        {/* Drag handle area - hidden from screen readers */}
        <div
          className="absolute inset-0 drag-handle"
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        ></div>

        {/* Mic icon */}
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full',
            isRecording ? 'animate-pulse' : ''
          )}
        >
          {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </div>

        {/* Status text */}
        <span
          className={cn(
            'font-medium text-xs whitespace-nowrap',
            !isRecording ? 'font-bold tracking-tight animate-pulse' : ''
          )}
        >
          {isRecording ? 'Recording...' : 'Voice Vibe'}
        </span>

        {/* Recording animation */}
        {isRecording && (
          <div className="relative w-3 h-3 ml-1">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-destructive animate-ping opacity-75"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-destructive"></div>
          </div>
        )}
      </button>
    </div>
  );
};

export default DictationPopup;
