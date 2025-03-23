import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import logger from '../../../../../shared/logger';

const DictationPopup: React.FC = () => {
  const { isRecording, startRecording, stopRecording, refreshRecentTranscriptions } =
    useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsHovering] = useState(false);
  const [wasRecording, setWasRecording] = useState(false);

  // Ref to track if we're handling an external state change to prevent loops
  const isHandlingExternalStateChangeRef = useRef(false);

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

  // Listen for events from main process
  useEffect(() => {
    let unsubscribeToggleRequested: (() => void) | undefined;
    let unsubscribeUpdateState: (() => void) | undefined;

    if (window.electronAPI) {
      // Listen for recording-toggle-requested events (from hotkey)
      if (typeof window.electronAPI.onRecordingToggleRequested === 'function') {
        unsubscribeToggleRequested = window.electronAPI.onRecordingToggleRequested(() => {
          logger.debug('Recording toggle requested via hotkey');
          handleToggleRecording();
        });
      }

      // Listen for update-recording-state events
      if (typeof window.electronAPI.onUpdateRecordingState === 'function') {
        unsubscribeUpdateState = window.electronAPI.onUpdateRecordingState((newState: boolean) => {
          logger.debug('Recording state update received from main process:', { newState });

          // Only update if the state actually differs to avoid loops
          if (newState !== isRecording) {
            // Set flag to prevent redundant notifications back to main process
            isHandlingExternalStateChangeRef.current = true;

            try {
              if (newState) {
                logger.debug('Starting recording from main process state update');
                startRecording().finally(() => {
                  // Reset flag after async operation completes
                  isHandlingExternalStateChangeRef.current = false;
                });
              } else {
                logger.debug('Stopping recording from main process state update');
                stopRecording();
                // Reset flag after sync operation
                isHandlingExternalStateChangeRef.current = false;
              }
            } catch (error) {
              logger.error('Error handling recording state update from main process:', {
                error: (error as Error).message,
              });
              isHandlingExternalStateChangeRef.current = false;
            }
          }
        });
      }
    }

    return () => {
      // Clean up event listeners
      if (unsubscribeToggleRequested) unsubscribeToggleRequested();
      if (unsubscribeUpdateState) unsubscribeUpdateState();
    };
  }, [isRecording, startRecording, stopRecording]);

  const handleToggleRecording = () => {
    logger.debug('Toggle recording clicked');
    logger.debug('Current recording state:', { isRecording });

    try {
      if (isRecording) {
        logger.debug('Stopping recording');
        stopRecording();

        // Only notify main process if not already handling an external state change
        if (
          window.electronAPI &&
          typeof window.electronAPI.notifyRecordingStateChange === 'function' &&
          !isHandlingExternalStateChangeRef.current
        ) {
          logger.debug('Notifying main process of recording stopped');
          window.electronAPI.notifyRecordingStateChange(false).catch(error =>
            logger.error('Error notifying main process of recording state change:', {
              error: error.message,
            })
          );
        }

        // We'll refresh transcriptions after a delay in the useEffect
      } else {
        logger.debug('Starting recording');
        startRecording()
          .then(() => {
            // Only notify main process if not already handling an external state change
            if (
              window.electronAPI &&
              typeof window.electronAPI.notifyRecordingStateChange === 'function' &&
              !isHandlingExternalStateChangeRef.current
            ) {
              logger.debug('Notifying main process of recording started');
              window.electronAPI.notifyRecordingStateChange(true).catch(error =>
                logger.error('Error notifying main process of recording state change:', {
                  error: error.message,
                })
              );
            }
          })
          .catch(error => {
            logger.error('Failed to start recording:', { error: (error as Error).message });
          });
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
      aria-label="Voice Vibe popup"
    >
      {/* Simple pill container - make it draggable */}
      <button
        className={cn(
          'rounded-full shadow-sm transition-all duration-200 hover:scale-105 w-12 h-4',
          isRecording ? 'bg-black animate-pulse' : 'bg-black'
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
        style={
          {
            WebkitAppRegion: isDragging ? 'drag' : 'no-drag',
            opacity: 0.8,
            borderRadius: '100px',
          } as React.CSSProperties
        }
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
      </button>
    </div>
  );
};

export default DictationPopup;
