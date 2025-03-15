import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { AudioDevice } from '../../../../shared/types';
import { logger } from '../../../utils/logger';
import { cn } from '../../../lib/utils';

const RecordingControls: React.FC = () => {
  const {
    isRecording,
    recordingTime,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    refreshAudioDevices,
    startRecording,
    stopRecording,
    transcribeRecording,
    currentTranscription,
    saveTranscription,
  } = useAppContext();

  // Format recording time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle device selection
  const handleDeviceChange = (deviceId: string): void => {
    const device = audioDevices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
    }
  };

  // Handle manual transcription
  const handleTranscribe = async (): Promise<void> => {
    logger.info('Manual transcription requested');
    try {
      await transcribeRecording();
    } catch (error) {
      logger.exception('Error during manual transcription', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="microphone-select">Select Microphone</Label>
        <Select value={selectedDevice?.id ?? ''} onValueChange={handleDeviceChange}>
          <SelectTrigger id="microphone-select" className="w-full">
            <SelectValue placeholder="Select a microphone" />
          </SelectTrigger>
          <SelectContent>
            {audioDevices.map((device: AudioDevice) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name} {device.isDefault ? '(Default)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshAudioDevices()}
          className="self-end mt-1"
        >
          Refresh Devices
        </Button>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex space-x-2">
          <Button
            variant={isRecording ? 'destructive' : 'default'}
            className="flex-1"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!selectedDevice}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>

          <Button
            variant="outline"
            className="flex-1"
            onClick={handleTranscribe}
            disabled={isRecording}
          >
            Transcribe
          </Button>
        </div>

        {isRecording && (
          <Card
            className={cn(
              'p-4 border',
              'bg-destructive/5 border-destructive/20',
              'dark:bg-destructive/10 dark:border-destructive/30'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="font-medium">Recording</span>
              </div>
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          </Card>
        )}

        {currentTranscription && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => currentTranscription && saveTranscription(currentTranscription.id)}
              disabled={!currentTranscription}
            >
              Save Transcription
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingControls;
