import { useState, useEffect, useCallback } from 'react';
import { AudioDevice } from '../../shared/types';

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
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

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
      setAudioChunks([]);
      
      // Get user media with audio
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice.id } } : true,
        video: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const recorder = new MediaRecorder(stream);
      
      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
        }
      };
      
      recorder.onstop = () => {
        // Combine chunks into a single blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
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
      
      // Start recording
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start timer
      const intervalId = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setTimer(intervalId);
    } catch (err) {
      setError(`Failed to start recording: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Recording error:', err);
    }
  }, [selectedDevice, onRecordingComplete, audioChunks, timer]);

  // Stop recording function
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
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