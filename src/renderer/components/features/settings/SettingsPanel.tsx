import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { useAppContext } from '../../../context/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';

const SettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const [listeningForHotkey, setListeningForHotkey] = useState(false);
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
      
      // Update settings with the new hotkey
      updateSettings({ hotkey: keyName });
      setListeningForHotkey(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningForHotkey, updateSettings]);

  // Start listening for hotkey
  const startListeningForHotkey = () => {
    setListeningForHotkey(true);
    if (hotkeyInputRef.current) {
      hotkeyInputRef.current.focus();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="api-key" className="text-sm font-medium">
            Groq API Key
          </Label>
        </div>
        <div className="flex space-x-2">
          <Input
            id="api-key"
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="Enter your Groq API key"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              // Open Groq website to get API key
              window.open('https://console.groq.com/keys', '_blank');
            }}
          >
            Get Key
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="language" className="text-sm font-medium">
          Default Language
        </Label>
        <Select
          value={settings.language}
          onValueChange={(value) => updateSettings({ language: value })}
        >
          <SelectTrigger id="language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
            <SelectItem value="ja">Japanese</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            value={listeningForHotkey ? "Press any key..." : settings.hotkey}
            readOnly
            placeholder="Click to set hotkey"
            className="flex-1"
            onClick={startListeningForHotkey}
          />
          <Button
            variant="outline"
            onClick={startListeningForHotkey}
          >
            Change
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Press this key to start/stop dictation. Current key: {settings.hotkey}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="save-path" className="text-sm font-medium">
            Save Transcriptions Path
          </Label>
        </div>
        <div className="flex space-x-2">
          <Input
            id="save-path"
            value={settings.transcriptionSavePath}
            onChange={(e) => updateSettings({ transcriptionSavePath: e.target.value })}
            placeholder="Default path"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              // This would be handled by the main process
              // to show a directory picker
              console.log('Browse button clicked - would open directory picker in production');
              // In a real implementation, we would call the main process
              // to show a directory picker dialog
            }}
          >
            Browse
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-transcribe" className="text-sm font-medium">
            Auto-Transcribe
          </Label>
          <p className="text-xs text-muted-foreground">
            Automatically transcribe recordings when stopped
          </p>
        </div>
        <Switch
          id="auto-transcribe"
          checked={settings.autoTranscribe}
          onCheckedChange={(checked) => updateSettings({ autoTranscribe: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="save-transcriptions" className="text-sm font-medium">
            Save Transcriptions
          </Label>
          <p className="text-xs text-muted-foreground">
            Automatically save transcriptions to disk
          </p>
        </div>
        <Switch
          id="save-transcriptions"
          checked={settings.saveTranscriptions}
          onCheckedChange={(checked) => updateSettings({ saveTranscriptions: checked })}
        />
      </div>
    </div>
  );
};

export default SettingsPanel; 