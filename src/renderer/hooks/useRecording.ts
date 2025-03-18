import { AudioDevice } from '../../shared/types';
import { useAudioRecording } from './useAudioRecording';
import { logger } from '../shared/logger';

interface UseRecordingProps {
  selectedDevice: AudioDevice | null;
  autoTranscribe: boolean;
  language: string;
  transcribeRecording: (language?: string) => Promise<void>;
}

export const useRecording = ({
  selectedDevice,
  autoTranscribe,
  language,
  transcribeRecording,
}: UseRecordingProps) => {
  // Use our custom hook for audio recording
  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    recordingTime,
  } = useAudioRecording({
    selectedDevice: selectedDevice || undefined,
    onRecordingComplete: handleRecordingComplete,
  });

  // Handle recording complete
  function handleRecordingComplete(audioBlob: Blob): void {
    try {
      logger.debug(
        `Recording complete, blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`
      );
      logger.debug(`Auto-transcribe setting: ${autoTranscribe}`);
      logger.debug(`Language setting: ${language}`);

      if (audioBlob.size === 0) {
        logger.error('Empty audio blob received', {});
        return;
      }

      // Convert blob to array buffer for sending to main process
      audioBlob
        .arrayBuffer()
        .then(async arrayBuffer => {
          logger.debug(`Array buffer size: ${arrayBuffer.byteLength} bytes`);

          if (arrayBuffer.byteLength === 0) {
            logger.error('Empty array buffer converted from blob', {});
            return;
          }

          if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
            logger.debug('Sending recording to main process...');
            const result = await window.electronAPI.saveRecording(arrayBuffer);

            if (result.success) {
              logger.debug(
                `Recording saved: ${result.filePath}, size: ${(result as { size?: number }).size ?? 'unknown'}`
              );

              // Always transcribe the recording, regardless of autoTranscribe setting
              // Add a small delay before transcribing to ensure the file is fully written
              setTimeout(() => {
                logger.debug(`Forcing transcription with language: ${language}`);
                logger.debug(`Calling transcribeRecording function...`);
                transcribeRecording(language)
                  .then(() => {
                    logger.debug('Transcription process initiated successfully');
                  })
                  .catch(error => {
                    logger.exception('Error during transcription process', error);
                  });
              }, 500);
            } else {
              logger.error(`Failed to save recording: ${result.error}`, {});
            }
          } else {
            logger.warn('saveRecording API not available');
          }
        })
        .catch(error => {
          logger.exception('Failed to convert blob to array buffer', error);
        });
    } catch (error) {
      logger.exception('Failed to handle recording complete', error);
    }
  }

  // Start recording
  const startRecording = async (): Promise<void> => {
    try {
      logger.debug('Starting recording...');

      if (selectedDevice) {
        logger.debug('Using selected device:', {
          id: selectedDevice.id,
          name: selectedDevice.name,
        });

        // Use the selected device to start recording
        try {
          logger.debug('Calling startAudioRecording with selected device');
          await startAudioRecording();
          logger.debug('Recording started successfully with selected device');
        } catch (error) {
          logger.exception('Failed to start recording with selected device', error);

          // If we can't use the selected device, try to fall back to default
          logger.debug('Falling back to system default microphone');
          await requestMicrophoneAccess();
        }
      } else {
        logger.debug('No audio device selected, requesting microphone access');
        await requestMicrophoneAccess();
      }
    } catch (error) {
      logger.exception('Failed to start recording', error);
      throw error; // Re-throw to allow the caller to handle it
    }
  };

  // Helper function to request microphone access and initiate recording
  async function requestMicrophoneAccess(): Promise<void> {
    try {
      logger.debug('Requesting microphone access to initialize devices');

      // Request microphone access to get device labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      logger.debug('Microphone access granted, got audio stream');

      // Stop the stream immediately after getting access
      stream.getTracks().forEach(track => track.stop());
      logger.debug('Audio stream tracks stopped');

      // Get devices after permission is granted
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = mediaDevices.filter(device => device.kind === 'audioinput');
      logger.debug('Found audio input devices:', { count: audioInputDevices.length });

      if (audioInputDevices.length > 0) {
        // Map to our AudioDevice type
        const mappedDevices = audioInputDevices.map((device, i) => ({
          id: device.deviceId,
          name: device.label || `Microphone ${i + 1}`,
          isDefault: device.deviceId === 'default' || device.deviceId === '',
        }));
        logger.debug('Mapped audio devices:', {
          devices: mappedDevices.map(d => ({ id: d.id, name: d.name })),
        });

        // Send devices to main process to update context
        if (window.electronAPI && typeof window.electronAPI.sendAudioDevicesResult === 'function') {
          logger.debug('Sending audio devices to main process');
          window.electronAPI.sendAudioDevicesResult(mappedDevices);
        }

        // Wait a short time for the context to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try recording again
        logger.debug('Starting audio recording after device initialization');
        await startAudioRecording();
        logger.debug('Recording started successfully after device initialization');
      } else {
        logger.error('No audio input devices found', {});
        throw new Error('No audio input devices found');
      }
    } catch (error) {
      logger.exception('Failed to access microphone', error);
      throw error;
    }
  }

  // Stop recording
  const stopRecording = (): void => {
    stopAudioRecording();
  };

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  };
};
