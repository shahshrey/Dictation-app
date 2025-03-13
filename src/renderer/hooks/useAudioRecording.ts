import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioDevice } from '../../shared/types';
import { rendererLogger } from '../../shared/preload-logger';

interface UseAudioRecordingProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  selectedDevice?: AudioDevice;
}

interface UseAudioRecordingResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recordingTime: number;
  error: string | null;
}

/**
 * Custom hook for managing audio recording functionality
 */
export const useAudioRecording = ({
  onRecordingComplete,
  selectedDevice
}: UseAudioRecordingProps = {}): UseAudioRecordingResult => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Use a ref to store audio chunks to avoid closure issues
  const audioChunksRef = useRef<Blob[]>([]);

  // Log when hook is initialized
  useEffect(() => {
    rendererLogger.info('Audio recording hook initialized', { 
      selectedDevice: selectedDevice ? { id: selectedDevice.id, name: selectedDevice.name } : 'none'
    });
    
    // Clean up on unmount
    return () => {
      rendererLogger.info('Audio recording hook cleanup');
      if (timer) {
        clearInterval(timer);
        rendererLogger.debug('Timer cleared during cleanup');
      }
      if (mediaRecorder && isRecording) {
        rendererLogger.info('Stopping recording during cleanup');
        mediaRecorder.stop();
      }
    };
  }, [timer, mediaRecorder, isRecording, selectedDevice]);

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      rendererLogger.info('Starting recording process', { 
        device: selectedDevice ? { id: selectedDevice.id, name: selectedDevice.name } : 'default'
      });
      
      setError(null);
      // Reset audio chunks
      audioChunksRef.current = [];
      rendererLogger.debug('Audio chunks reset');
      
      // Get user media with audio
      rendererLogger.debug('Requesting user media with constraints', { 
        audio: selectedDevice ? { deviceId: { exact: selectedDevice.id } } : true,
        video: false
      });
      
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice.id } } : true,
        video: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      rendererLogger.info('Media stream obtained successfully', {
        tracks: stream.getAudioTracks().length,
        trackLabels: stream.getAudioTracks().map(track => track.label)
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Explicitly set the MIME type
      });
      
      rendererLogger.debug('MediaRecorder created', { 
        state: recorder.state,
        mimeType: recorder.mimeType
      });
      
      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          rendererLogger.debug('Received audio chunk', { size: event.data.size });
          audioChunksRef.current.push(event.data);
        } else {
          rendererLogger.warn('Received empty audio chunk');
        }
      };
      
      recorder.onerror = (event) => {
        rendererLogger.error('MediaRecorder error', { error: event.error });
        setError(`Recording error: ${event.error}`);
      };
      
      recorder.onstop = () => {
        rendererLogger.info('Recording stopped', { 
          chunks: audioChunksRef.current.length,
          totalSize: audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
        });
        
        // Combine chunks into a single blob
        if (audioChunksRef.current.length === 0) {
          rendererLogger.error('No audio chunks collected during recording');
          setError('No audio data was captured during recording');
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        rendererLogger.info('Created audio blob', { size: audioBlob.size });
        
        // Call the callback with the audio blob
        if (onRecordingComplete) {
          rendererLogger.debug('Calling onRecordingComplete callback');
          onRecordingComplete(audioBlob);
        } else {
          rendererLogger.warn('No onRecordingComplete callback provided');
        }
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => {
          track.stop();
          rendererLogger.debug('Stopped audio track', { label: track.label });
        });
        
        // Reset recording time
        setRecordingTime(0);
        setIsRecording(false);
        
        if (timer) {
          clearInterval(timer);
          setTimer(null);
          rendererLogger.debug('Timer cleared');
        }
      };
      
      // Request data every second to ensure we get chunks even for short recordings
      recorder.start(1000);
      rendererLogger.info('MediaRecorder started', { timeSlice: 1000 });
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start timer
      const intervalId = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime % 5 === 0) { // Log every 5 seconds to avoid excessive logging
            rendererLogger.debug('Recording in progress', { elapsedSeconds: newTime });
          }
          return newTime;
        });
      }, 1000);
      
      setTimer(intervalId);
      rendererLogger.debug('Recording timer started');
    } catch (err) {
      const errorMessage = `Failed to start recording: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      rendererLogger.exception(err as Error, 'Recording error', {
        device: selectedDevice ? { id: selectedDevice.id, name: selectedDevice.name } : 'default'
      });
    }
  }, [selectedDevice, onRecordingComplete, timer]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    rendererLogger.info('Stop recording requested', { 
      isRecording, 
      hasMediaRecorder: !!mediaRecorder,
      recorderState: mediaRecorder?.state
    });
    
    if (mediaRecorder && isRecording) {
      try {
        // Request final data chunk before stopping
        mediaRecorder.requestData();
        rendererLogger.debug('Final data chunk requested');
        
        mediaRecorder.stop();
        rendererLogger.info('MediaRecorder stopped');
      } catch (error) {
        rendererLogger.exception(error as Error, 'Error stopping media recorder');
      }
    } else {
      rendererLogger.warn('Attempted to stop recording, but no active recorder found', {
        mediaRecorder: !!mediaRecorder,
        isRecording
      });
    }
  }, [mediaRecorder, isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
    error
  };
}; 