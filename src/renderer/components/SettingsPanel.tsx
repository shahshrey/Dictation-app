import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';

// Language options for transcription
const LANGUAGE_OPTIONS = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

const SettingsPanel: React.FC = () => {
  // Settings state
  const [defaultLanguage, setDefaultLanguage] = useState<string>('auto');
  const [apiKey, setApiKey] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(true);
  const [saveTranscriptionsAutomatically, setSaveTranscriptionsAutomatically] = useState<boolean>(false);
  
  // Save settings
  const saveSettings = (): void => {
    // This would be implemented to save settings to electron-store
    console.log('Saving settings:', {
      defaultLanguage,
      apiKey,
      showNotifications,
      saveTranscriptionsAutomatically,
    });
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="space-y-2">
        <Label htmlFor="language">Default Language</Label>
        <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
          <SelectTrigger id="language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="api-key">Groq API Key</Label>
        <Input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Enter your Groq API key for transcription services
        </p>
      </div>
      
      <div className="h-px bg-border my-4" />
      
      <h3 className="text-sm font-medium">Application Settings</h3>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="notifications"
          checked={showNotifications}
          onCheckedChange={setShowNotifications}
        />
        <Label htmlFor="notifications">Show Notifications</Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="auto-save"
          checked={saveTranscriptionsAutomatically}
          onCheckedChange={setSaveTranscriptionsAutomatically}
        />
        <Label htmlFor="auto-save">Save Transcriptions Automatically</Label>
      </div>
      
      <div className="flex justify-end mt-4">
        <Button onClick={saveSettings}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel; 