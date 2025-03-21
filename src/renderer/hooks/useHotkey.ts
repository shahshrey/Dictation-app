import { useState, useEffect, useRef, useCallback } from 'react';

interface UseHotkeyProps {
  initialHotkey: string;
  onHotkeyChange: (hotkey: string) => void;
}

interface UseHotkeyReturn {
  hotkey: string;
  listeningForHotkey: boolean;
  startListeningForHotkey: () => void;
  hotkeyInputRef: React.RefObject<HTMLInputElement>;
}

export const useHotkey = ({ initialHotkey, onHotkeyChange }: UseHotkeyProps): UseHotkeyReturn => {
  const [listeningForHotkey, setListeningForHotkey] = useState(false);
  const [hotkey, setHotkey] = useState(initialHotkey);
  const hotkeyInputRef = useRef<HTMLInputElement>(null);

  // Handle hotkey recording
  useEffect(() => {
    if (!listeningForHotkey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      // Get the key name
      let keyName = e.key;

      // Handle special keys
      if (e.key === ' ') keyName = 'Space';

      // Update hotkey
      setHotkey(keyName);
      onHotkeyChange(keyName);
      setListeningForHotkey(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningForHotkey, onHotkeyChange]);

  // Start listening for hotkey
  const startListeningForHotkey = useCallback(() => {
    setListeningForHotkey(true);
    if (hotkeyInputRef.current) {
      hotkeyInputRef.current.focus();
    }
  }, []);

  return {
    hotkey,
    listeningForHotkey,
    startListeningForHotkey,
    hotkeyInputRef,
  } as UseHotkeyReturn;
};
