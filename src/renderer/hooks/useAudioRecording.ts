import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioDevice } from '../../shared/types';
import logger from '../../shared/logger';

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
  selectedDevice,
}: UseAudioRecordingProps = {}): UseAudioRecordingResult => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Use a ref to store audio chunks to avoid closure issues
  const audioChunksRef = useRef<Blob[]>([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [timer, mediaRecorder, isRecording]);

  // Start recording function
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      // Reset audio chunks
      audioChunksRef.current = [];

      logger.debug('Starting recording with device:', {
        device: selectedDevice?.name ?? 'default',
      });

      // Get user media with audio
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice.id } } : true,
        video: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm', // Explicitly set the MIME type
        });

        // Set up event handlers
        recorder.ondataavailable = event => {
          if (event.data.size > 0) {
            logger.debug('Received audio chunk of size:', { size: event.data.size });
            audioChunksRef.current.push(event.data);
          } else {
            logger.warn('Received empty audio chunk');
          }
        };

        recorder.onstop = () => {
          logger.debug(`Recording stopped, collected ${audioChunksRef.current.length} chunks`);

          // Combine chunks into a single blob
          if (audioChunksRef.current.length === 0) {
            logger.error('No audio chunks collected during recording');
            setError('No audio data was captured during recording');
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          logger.debug('Created audio blob of size:', { size: audioBlob.size });

          // Call the callback with the audio blob
          if (onRecordingComplete) {
            onRecordingComplete(audioBlob);
          }

          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());

          // Reset recording time
          setRecordingTime(0);
          setIsRecording(false);

          if (timer) {
            clearInterval(timer);
            setTimer(null);
          }
        };

        // Request data every second to ensure we get chunks even for short recordings
        recorder.start(1000);
        logger.debug('MediaRecorder started');
        setMediaRecorder(recorder);
        setIsRecording(true);

        // Start timer
        const intervalId = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        setTimer(intervalId);
      } catch (mediaError) {
        // Handle specific permission errors
        if (mediaError instanceof DOMException) {
          if (mediaError.name === 'NotAllowedError') {
            logger.error('Microphone permission denied:', { error: mediaError.message });
            setError(
              'Microphone permission denied. Please allow microphone access in your system settings.'
            );

            // Notify the main process about permission issues
            if (
              window.electronAPI &&
              typeof window.electronAPI.notifyPermissionIssue === 'function'
            ) {
              window.electronAPI.notifyPermissionIssue('microphone');
            }
          } else if (mediaError.name === 'NotFoundError') {
            logger.error('No microphone found:', { error: mediaError.message });
            setError('No microphone found. Please connect a microphone and try again.');
          } else {
            logger.error('Media error:', { error: mediaError.message, name: mediaError.name });
            setError(`Media error: ${mediaError.message}`);
          }
        } else {
          throw mediaError; // Re-throw non-DOMException errors to be caught by the outer catch
        }
      }
    } catch (err) {
      setError(`Failed to start recording: ${err instanceof Error ? err.message : String(err)}`);
      logger.error('Recording error:', { error: err instanceof Error ? err.message : String(err) });
    }
  }, [selectedDevice, onRecordingComplete, timer]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      logger.debug('Stopping recording...');
      // Request final data chunk before stopping
      mediaRecorder.requestData();
      mediaRecorder.stop();
    } else {
      logger.warn('Attempted to stop recording, but no active recorder found');
    }
  }, [mediaRecorder, isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
    error,
  };
};
