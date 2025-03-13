import { IPC_CHANNELS } from '../../../src/shared/types';

describe('Shared Types', () => {
  describe('IPC_CHANNELS', () => {
    it('should be defined', () => {
      expect(IPC_CHANNELS).toBeDefined();
      expect(typeof IPC_CHANNELS).toBe('object');
    });

    it('should have the required channel constants', () => {
      expect(IPC_CHANNELS).toHaveProperty('TOGGLE_RECORDING');
      expect(IPC_CHANNELS).toHaveProperty('START_RECORDING');
      expect(IPC_CHANNELS).toHaveProperty('STOP_RECORDING');
      expect(IPC_CHANNELS).toHaveProperty('TRANSCRIPTION_RESULT');
      expect(IPC_CHANNELS).toHaveProperty('GET_AUDIO_DEVICES');
      expect(IPC_CHANNELS).toHaveProperty('AUDIO_DEVICES_REQUEST');
      expect(IPC_CHANNELS).toHaveProperty('AUDIO_DEVICES_RESULT');
      expect(IPC_CHANNELS).toHaveProperty('SAVE_SETTINGS');
      expect(IPC_CHANNELS).toHaveProperty('GET_SETTINGS');
      expect(IPC_CHANNELS).toHaveProperty('SETTINGS_RESULT');
      expect(IPC_CHANNELS).toHaveProperty('GET_TRANSCRIPTIONS');
      expect(IPC_CHANNELS).toHaveProperty('TRANSCRIPTIONS_RESULT');
      expect(IPC_CHANNELS).toHaveProperty('ERROR');
    });

    it('should have string values for all channel constants', () => {
      Object.values(IPC_CHANNELS).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have unique values for all channel constants', () => {
      const values = Object.values(IPC_CHANNELS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  // Note: We're not testing the interfaces directly since TypeScript interfaces
  // are compile-time constructs and don't exist at runtime. Instead, we're testing
  // the constants that are exported from the types module.
});
