/**
 * Utility for playing audio feedback sounds
 */

import logger from '../../shared/logger';

// Play a natural "start recording" sound
export const playStartSound = (): void => {
  try {
    const audioContext = new AudioContext();

    // Create audio nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Configure filter for a more pleasing tone
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 1;

    // Connect nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure oscillator for a "ready" sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // Up to A5

    // Configure volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Gentle decay

    // Start and stop
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);

    logger.debug('Playing start recording sound');
  } catch (error) {
    logger.error('Error playing start sound:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Play a natural "stop recording" sound
export const playStopSound = (): void => {
  try {
    const audioContext = new AudioContext();

    // Create audio nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Configure filter for a more pleasing tone
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1;

    // Connect nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure oscillator for a "completion" sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.2); // Down to A4

    // Configure volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.03); // Quick attack
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1); // Hold
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4); // Longer decay

    // Start and stop
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);

    logger.debug('Playing stop recording sound');
  } catch (error) {
    logger.error('Error playing stop sound:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
