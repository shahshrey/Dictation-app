import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { useHotkey } from '../../../hooks/useHotkey';

interface HotkeyInputProps {
  currentHotkey: string;
  onHotkeyChange: (hotkey: string) => void;
}

const HotkeyInput: React.FC<HotkeyInputProps> = ({ currentHotkey, onHotkeyChange }) => {
  // Use the hotkey hook
  const { listeningForHotkey, startListeningForHotkey, hotkeyInputRef } = useHotkey({
    initialHotkey: currentHotkey,
    onHotkeyChange,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="hotkey" className="text-sm font-medium">
          Dictation Hotkey
        </Label>
      </div>
      <div className="flex space-x-2">
        <Input
          id="hotkey"
          ref={hotkeyInputRef}
          value={listeningForHotkey ? 'Press any key...' : currentHotkey}
          readOnly
          placeholder="Click to set hotkey"
          className="flex-1"
          onClick={startListeningForHotkey}
        />
        <Button variant="outline" onClick={startListeningForHotkey}>
          Change
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press this key to start/stop dictation. Current key: {currentHotkey}
      </p>
    </div>
  );
};

export default HotkeyInput;
