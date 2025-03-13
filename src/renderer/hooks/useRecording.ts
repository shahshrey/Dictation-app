import { AudioDevice } from '../../shared/types';
import { useAudioRecording } from './useAudioRecording';
import { logger } from '../utils/logger';

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
      logger.info(
        `Recording complete, blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`
      );
      logger.debug(`Auto-transcribe setting: ${autoTranscribe}`);
      logger.debug(`Language setting: ${language}`);

      if (audioBlob.size === 0) {
        logger.error('Empty audio blob received', null);
        return;
      }

      // Convert blob to array buffer for sending to main process
      audioBlob
        .arrayBuffer()
        .then(async arrayBuffer => {
          logger.debug(`Array buffer size: ${arrayBuffer.byteLength} bytes`);

          if (arrayBuffer.byteLength === 0) {
            logger.error('Empty array buffer converted from blob', null);
            return;
          }

          if (window.electronAPI && typeof window.electronAPI.saveRecording === 'function') {
            logger.info('Sending recording to main process...');
            const result = await window.electronAPI.saveRecording(arrayBuffer);

            if (result.success) {
              logger.info(
                `Recording saved: ${result.filePath}, size: ${(result as { size?: number }).size ?? 'unknown'}`
              );

              // Always transcribe the recording, regardless of autoTranscribe setting
              // Add a small delay before transcribing to ensure the file is fully written
              setTimeout(() => {
                logger.info(`Forcing transcription with language: ${language}`);
                logger.debug(`Calling transcribeRecording function...`);
                transcribeRecording(language)
                  .then(() => {
                    logger.info('Transcription process initiated successfully');
                  })
                  .catch(error => {
                    logger.exception('Error during transcription process', error);
                  });
              }, 500);
            } else {
              logger.error(`Failed to save recording: ${result.error}`, null);
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
    if (selectedDevice) {
      try {
        await startAudioRecording();
      } catch (error) {
        logger.exception('Failed to start recording', error);
      }
    } else {
      logger.error('No audio device selected', null);
    }
  };

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
