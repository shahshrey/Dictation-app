import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { useAppContext } from '../../../context/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { LANGUAGES } from '../../../../shared/constants';
import { rendererLogger } from '../../../../shared/preload-logger';
import GroqAPITest from './GroqAPITest';

interface SettingsPanelProps {
  onSave?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave }) => {
  const { settings, updateSettings, audioDevices, selectedDevice, setSelectedDevice } = useAppContext();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [listeningForHotkey, setListeningForHotkey] = useState(false);
  const hotkeyInputRef = useRef<HTMLInputElement>(null);
  const [hotkeyDisplay, setHotkeyDisplay] = useState(settings.hotkey || 'Home');
  const [isSaving, setIsSaving] = useState(false);

  // Update local settings when app settings change
  useEffect(() => {
    setLocalSettings({ ...settings });
    setHotkeyDisplay(settings.hotkey || 'Home');
  }, [settings]);

  // Handle hotkey recording
  useEffect(() => {
    if (!listeningForHotkey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      // Get the key name
      let keyName = e.key;
      
      // Handle special keys
      if (e.key === ' ') keyName = 'Space';
      if (e.key === 'Control') keyName = 'Ctrl';
      if (e.key === 'Meta') keyName = 'Command';
      
      // Update local settings with the new hotkey
      setHotkeyDisplay(keyName);
      setLocalSettings(prev => ({ ...prev, hotkey: keyName }));
      setListeningForHotkey(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningForHotkey]);

  // Start listening for hotkey
  const startListeningForHotkey = () => {
    setListeningForHotkey(true);
    setHotkeyDisplay('Press any key...');
    if (hotkeyInputRef.current) {
      hotkeyInputRef.current.focus();
    }
  };

  // Handle local settings changes
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // Save settings to store
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateSettings(localSettings);
      rendererLogger.info('Settings saved successfully');
      if (onSave) onSave();
    } catch (error) {
      rendererLogger.exception(error as Error, 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Configure your dictation preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-transcribe" className="flex flex-col">
                  <span>Auto-transcribe recordings</span>
                  <span className="text-sm text-muted-foreground">
                    Automatically transcribe recordings when they finish
                  </span>
                </Label>
                <Switch
                  id="auto-transcribe"
                  checked={localSettings.autoTranscribe}
                  onCheckedChange={(checked) => handleSettingChange('autoTranscribe', checked)}
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="hotkey">Toggle recording hotkey</Label>
                <div className="flex gap-2">
                  <Input
                    id="hotkey"
                    ref={hotkeyInputRef}
                    value={hotkeyDisplay}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={startListeningForHotkey}>
                    {listeningForHotkey ? 'Listening...' : 'Change'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="audio">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="audio-device">Microphone</Label>
                <Select
                  value={selectedDevice?.id || ''}
                  onValueChange={(value) => {
                    const device = audioDevices.find(d => d.id === value);
                    if (device) setSelectedDevice(device);
                  }}
                >
                  <SelectTrigger id="audio-device">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="transcription">
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="api-key">Groq API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={localSettings.apiKey || ''}
                  onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                  placeholder="Enter your Groq API key"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={localSettings.language}
                  onValueChange={(value) => handleSettingChange('language', value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {String(name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="save-path">Save transcriptions to</Label>
                <div className="flex gap-2">
                  <Input
                    id="save-path"
                    value={localSettings.transcriptionSavePath}
                    onChange={(e) => handleSettingChange('transcriptionSavePath', e.target.value)}
                    placeholder="Default path"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      // This would be handled by the main process
                      // to show a directory picker
                      rendererLogger.debug('Browse button clicked - would open directory picker in production');
                      // In a real implementation, we would call the main process
                      // to show a directory picker dialog
                    }}
                  >
                    Browse
                  </Button>
                </div>
              </div>
              
              <div className="mt-6">
                <GroqAPITest />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveSettings} 
            disabled={isSaving}
            className="w-24"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel; 