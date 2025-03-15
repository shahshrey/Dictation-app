import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import { Mic, MicOff } from 'lucide-react';

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
        .catch(error => console.error('Error in setIgnoreMouseEvents on mount:', error));
    }

    // Track recording state changes to refresh transcriptions when recording stops
    if (wasRecording && !isRecording) {
      console.log('Recording stopped, refreshing transcriptions after delay');
      // Add a delay to ensure the transcription is saved before refreshing
      const timeoutId = setTimeout(() => {
        refreshRecentTranscriptions();
        console.log('Transcriptions refreshed after recording stopped');
      }, 2000); // 2 second delay to ensure transcription is processed

      return () => clearTimeout(timeoutId);
    }

    setWasRecording(isRecording);

    return () => {
      console.log('DictationPopup unmounting');
    };
  }, [isRecording, wasRecording, refreshRecentTranscriptions]);

  const handleToggleRecording = () => {
    console.log('Toggle recording clicked');
    console.log('Current recording state:', isRecording);

    try {
      if (isRecording) {
        console.log('Stopping recording');
        stopRecording();
        // We'll refresh transcriptions after a delay in the useEffect
      } else {
        console.log('Starting recording');
        startRecording();
      }
      console.log('Toggle recording action completed');
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  };

  // Handle mouse events for dragging
  const handleMouseEnter = () => {
    console.log('Mouse entered popup');
    setIsHovering(true);

    try {
      if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
        window.electronAPI
          .setIgnoreMouseEvents(false)
          .then(result => console.log('setIgnoreMouseEvents result:', result))
          .catch(error => console.error('Error in setIgnoreMouseEvents:', error));
      } else {
        console.warn('setIgnoreMouseEvents not available');
      }
    } catch (error) {
      console.error('Error in handleMouseEnter:', error);
    }
  };

  const handleMouseLeave = () => {
    console.log('Mouse left popup');
    console.log('isDragging:', isDragging);
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
        .catch(error => console.error('Error in setIgnoreMouseEvents on mouse leave:', error));
    }
  };

  // Ensure we can click on the pill
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('Mouse down on popup');
    // Make sure we can interact with the popup when clicking
    if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI
        .setIgnoreMouseEvents(false)
        .catch(error => console.error('Error in setIgnoreMouseEvents on mouse down:', error));
    }

    // Start dragging if not clicking on the pill itself
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    console.log('Mouse up on popup');
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
          console.log('Pill clicked');
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
