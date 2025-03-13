import { useState } from 'react';
import { AudioDevice } from '../../shared/types';
import { logger } from '../utils/logger';

export const useAudioDevices = () => {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<AudioDevice | null>(null);

  // Refresh audio devices
  const refreshAudioDevices = async (): Promise<void> => {
    try {
      logger.info('Refreshing audio devices...');

      // Use the Web Audio API to enumerate devices directly in the renderer
      const mappedDevices: AudioDevice[] = [];

      // Get all media devices
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();

      // Filter for audio input devices (microphones)
      const audioInputDevices = mediaDevices.filter(device => device.kind === 'audioinput');

      // Map to our AudioDevice type
      for (let i = 0; i < audioInputDevices.length; i++) {
        const device = audioInputDevices[i];
        mappedDevices.push({
          id: device.deviceId,
          name: device.label ?? `Microphone ${i + 1}`,
          isDefault: device.deviceId === 'default' || device.deviceId === '',
        });
      }

      // If no devices have labels, we need to request permission first
      if (
        mappedDevices.length > 0 &&
        mappedDevices.every(d => !d.name || d.name.startsWith('Microphone '))
      ) {
        try {
          // Request microphone access to get device labels
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately after getting labels
          stream.getTracks().forEach(track => track.stop());

          // Try enumerating again to get labels
          const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
          const audioInputDevicesWithLabels = devicesWithLabels.filter(
            device => device.kind === 'audioinput'
          );

          // Clear and refill the devices array
          mappedDevices.length = 0;
          let deviceCounter = 0;
          for (const device of audioInputDevicesWithLabels) {
            deviceCounter++;
            mappedDevices.push({
              id: device.deviceId,
              name: device.label ?? `Microphone ${deviceCounter}`,
              isDefault: device.deviceId === 'default' || device.deviceId === '',
            });
          }
        } catch (err) {
          logger.exception('Failed to get microphone permission', err);
        }
      }

      // Update state with the devices
      setAudioDevices(mappedDevices);

      // Select the default device if none is selected
      const defaultDevice = mappedDevices.find(d => d.isDefault) ?? mappedDevices[0];
      setSelectedDevice(defaultDevice);

      // Send the devices back to the main process
      if (window.electronAPI && typeof window.electronAPI.sendAudioDevicesResult === 'function') {
        window.electronAPI.sendAudioDevicesResult(mappedDevices);
      }
    } catch (error) {
      logger.exception('Failed to get audio devices', error);
    }
  };

  return {
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    refreshAudioDevices,
  };
};
