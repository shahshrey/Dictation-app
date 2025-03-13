import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { rendererLogger } from '../../../../../shared/preload-logger';

const DictationPopup: React.FC = () => {
  const { isRecording, startRecording, stopRecording, refreshRecentTranscriptions } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [wasRecording, setWasRecording] = useState(false);
  
  // Ensure the popup is always interactive when mounted
  useEffect(() => {
    rendererLogger.debug('DictationPopup mounted or updated', { isRecording });
    
    // Make sure the popup is interactive when it first appears
    if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI.setIgnoreMouseEvents(false)
        .catch(error => rendererLogger.exception(error, 'Error in setIgnoreMouseEvents on mount'));
    }
    
    // Track recording state changes to refresh transcriptions when recording stops
    if (wasRecording && !isRecording) {
      rendererLogger.debug('Recording stopped, refreshing transcriptions after delay');
      // Add a delay to ensure the transcription is saved before refreshing
      const timeoutId = setTimeout(() => {
        refreshRecentTranscriptions();
      }, 2000); // 2 second delay to ensure transcription is processed
      
      return () => clearTimeout(timeoutId);
    }
    
    setWasRecording(isRecording);
    
    return () => {
      rendererLogger.debug('DictationPopup unmounting');
    };
  }, [isRecording, wasRecording, refreshRecentTranscriptions]);
  
  const handleToggleRecording = () => {
    try {
      if (isRecording) {
        rendererLogger.debug('Stopping recording');
        stopRecording();
        // We'll refresh transcriptions after a delay in the useEffect
      } else {
        rendererLogger.debug('Starting recording');
        startRecording();
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Error toggling recording');
    }
  };
  
  // Handle mouse events for dragging
  const handleMouseEnter = () => {
    setIsHovering(true);
    
    try {
      if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
        window.electronAPI.setIgnoreMouseEvents(false)
          .catch(error => rendererLogger.exception(error as Error, 'Error in setIgnoreMouseEvents'));
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Error in handleMouseEnter');
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // Set ignore mouse events to true with forward=true when leaving
    // This allows clicks to pass through but still shows the overlay
    if (!isDragging && window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true })
        .catch(error => rendererLogger.exception(error as Error, 'Error in setIgnoreMouseEvents on mouse leave'));
    }
  };
  
  // Ensure we can click on the pill
  const handleMouseDown = (e: React.MouseEvent) => {
    // Make sure we can interact with the popup when clicking
    if (window.electronAPI && typeof window.electronAPI.setIgnoreMouseEvents === 'function') {
      window.electronAPI.setIgnoreMouseEvents(false)
        .catch(error => rendererLogger.exception(error as Error, 'Error in setIgnoreMouseEvents on mouse down'));
    }
    
    // Start dragging if not clicking on the pill itself
    if ((e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
    }
  };
  
  const handleMouseUp = () => {
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
        boxShadow: 'none'
      }}
    >
      {/* Pill container - make it draggable */}
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 ${
          isRecording 
            ? 'bg-primary/90 text-white' 
            : 'bg-black/50 text-white hover:bg-black/70'
        }`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          handleToggleRecording();
        }}
        // Make only the non-interactive parts draggable
        style={{ WebkitAppRegion: isDragging ? 'drag' : 'no-drag' } as React.CSSProperties}
      >
        {/* Drag handle area */}
        <div className="absolute inset-0 drag-handle" 
             style={{ pointerEvents: 'none' }}></div>
             
        {/* Mic icon */}
        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
          isRecording ? 'animate-pulse' : ''
        }`}>
          <svg 
            className="w-4 h-4" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
        </div>
        
        {/* Status text */}
        <span className="font-medium text-xs whitespace-nowrap">
          {isRecording ? 'Recording...' : 'Dictate'}
        </span>
        
        {/* Recording animation */}
        {isRecording && (
          <div className="relative w-3 h-3 ml-1">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DictationPopup; 