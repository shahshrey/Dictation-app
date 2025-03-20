import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { useAppContext } from '../../../context/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { AudioDevice, AppSettings } from '../../../../shared/types';
import HotkeyInput from './HotkeyInput';
import { logger } from '../../../shared/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertCircle, Loader2, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../components/layout/ThemeProvider';

// Available languages for transcription
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
];

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const {
    settings,
    updateSettings,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    refreshAudioDevices,
  } = useAppContext();
  const { theme, setTheme } = useTheme();

  // Form state
  const [formValues, setFormValues] = useState<AppSettings>(settings);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AppSettings, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingDevices, setRefreshingDevices] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // Update form values when settings change
  useEffect(() => {
    setFormValues(settings);
  }, [settings]);

  // Handle device selection
  const handleDeviceChange = (deviceId: string): void => {
    const device = audioDevices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
    }
  };

  // Handle form input changes
  const handleInputChange = (key: keyof AppSettings, value: string | boolean): void => {
    setFormValues(prev => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field
    if (formErrors[key]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AppSettings, string>> = {};

    // Validate API key if auto-transcribe is enabled
    if (formValues.autoTranscribe && !formValues.apiKey.trim()) {
      errors.apiKey = 'API key is required when auto-transcribe is enabled';
    }

    // Validate save path if save transcriptions is enabled
    if (formValues.saveTranscriptions && !formValues.transcriptionSavePath.trim()) {
      errors.transcriptionSavePath = 'Save path is required when saving transcriptions is enabled';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await updateSettings(formValues);
      onOpenChange(false);
    } catch (error) {
      logger.exception('Failed to save settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refreshing audio devices
  const handleRefreshDevices = async (): Promise<void> => {
    setRefreshingDevices(true);
    try {
      await refreshAudioDevices();
    } catch (error) {
      logger.exception('Failed to refresh audio devices', error);
    } finally {
      setRefreshingDevices(false);
    }
  };

  // Handle opening file browser for selecting save path
  const handleBrowseForPath = async (): Promise<void> => {
    try {
      if (window.electronAPI && typeof window.electronAPI.showDirectoryPicker === 'function') {
        const selectedPath = await window.electronAPI.showDirectoryPicker();
        if (selectedPath) {
          handleInputChange('transcriptionSavePath', selectedPath);
        }
      } else {
        logger.warn('Directory picker not available');
      }
    } catch (error) {
      logger.exception('Failed to open directory picker', error);
    }
  };

  // Test API key validity
  const testApiKey = async (): Promise<void> => {
    if (!formValues.apiKey.trim()) {
      setApiKeyValid(false);
      return;
    }

    try {
      setApiKeyValid(null); // Loading state
      if (window.electronAPI && typeof window.electronAPI.testApiKey === 'function') {
        const isValid = await window.electronAPI.testApiKey(formValues.apiKey);
        setApiKeyValid(isValid);
      } else {
        // Fallback if the main process function isn't available
        // This is just a basic format check, not a real validation
        setApiKeyValid(formValues.apiKey.startsWith('groq_') && formValues.apiKey.length > 30);
      }
    } catch (error) {
      logger.exception('Failed to test API key', error);
      setApiKeyValid(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-card shadow-xl border-border/40 rounded-xl overflow-hidden">
        <DialogHeader className="bg-muted/50 px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your transcription preferences
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 py-6">
            <div className="space-y-8">
              {/* Appearance Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="theme-toggle">Theme</Label>
                      <div className="text-sm text-muted-foreground">
                        Toggle between light and dark mode
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <Button
                        id="theme-toggle"
                        variant="outline"
                        size="sm"
                        className="h-8 w-12 px-0"
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-primary transition-transform ${
                            theme === 'dark' ? 'translate-x-3' : '-translate-x-3'
                          }`}
                        />
                      </Button>
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audio Device Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Audio Device</CardTitle>
                  <CardDescription>Select and manage your microphone settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label htmlFor="microphone-select">Select Microphone</Label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
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
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshDevices}
                        className="whitespace-nowrap"
                        disabled={refreshingDevices}
                        aria-label="Refresh microphone devices"
                      >
                        {refreshingDevices ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          'Refresh Devices'
                        )}
                      </Button>
                    </div>
                    {audioDevices.length === 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No microphones detected. Please check your system settings.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* API Key Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">API Configuration</CardTitle>
                  <CardDescription>Manage your Groq API integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="api-key" className="text-sm font-medium">
                        Groq API Key
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="api-key"
                          type="password"
                          value={formValues.apiKey}
                          onChange={e => handleInputChange('apiKey', e.target.value)}
                          placeholder="Enter your Groq API key"
                          className="flex-1"
                          aria-invalid={!!formErrors.apiKey}
                          aria-describedby={formErrors.apiKey ? 'api-key-error' : undefined}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            window.open('https://console.groq.com/keys', '_blank');
                          }}
                          aria-label="Get Groq API key"
                        >
                          Get Key
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={testApiKey}
                          disabled={!formValues.apiKey.trim()}
                          aria-label="Test API key"
                        >
                          Test
                        </Button>
                      </div>
                      {formErrors.apiKey && (
                        <p id="api-key-error" className="text-destructive text-sm mt-1">
                          {formErrors.apiKey}
                        </p>
                      )}
                      {apiKeyValid === true && (
                        <p className="text-green-600 text-sm mt-1">API key is valid</p>
                      )}
                      {apiKeyValid === false && (
                        <p className="text-destructive text-sm mt-1">
                          API key is invalid or couldn't be verified
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="language" className="text-sm font-medium">
                        Default Language
                      </Label>
                      <div className="mt-1">
                        <Select
                          value={formValues.language}
                          onValueChange={value => handleInputChange('language', value)}
                        >
                          <SelectTrigger id="language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_LANGUAGES.map(lang => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hotkey Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
                  <CardDescription>Configure recording hotkey</CardDescription>
                </CardHeader>
                <CardContent>
                  <HotkeyInput
                    currentHotkey={formValues.hotkey}
                    onHotkeyChange={hotkey => handleInputChange('hotkey', hotkey)}
                  />
                </CardContent>
              </Card>

              {/* File Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">File Management</CardTitle>
                  <CardDescription>Configure where to save your transcriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="save-path" className="text-sm font-medium">
                        Save Transcriptions Path
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="save-path"
                          value={formValues.transcriptionSavePath}
                          onChange={e => handleInputChange('transcriptionSavePath', e.target.value)}
                          placeholder="Default path"
                          className="flex-1"
                          aria-invalid={!!formErrors.transcriptionSavePath}
                          aria-describedby={
                            formErrors.transcriptionSavePath ? 'save-path-error' : undefined
                          }
                        />
                        <Button
                          variant="outline"
                          onClick={handleBrowseForPath}
                          aria-label="Browse for save path"
                        >
                          Browse
                        </Button>
                      </div>
                      {formErrors.transcriptionSavePath && (
                        <p id="save-path-error" className="text-destructive text-sm mt-1">
                          {formErrors.transcriptionSavePath}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="audio-save-path" className="text-sm font-medium">
                        Audio Files Path
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          id="audio-save-path"
                          value={formValues.audioSavePath}
                          onChange={e => handleInputChange('audioSavePath', e.target.value)}
                          placeholder="Default path"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              if (
                                window.electronAPI &&
                                typeof window.electronAPI.showDirectoryPicker === 'function'
                              ) {
                                const selectedPath = await window.electronAPI.showDirectoryPicker();
                                if (selectedPath) {
                                  handleInputChange('audioSavePath', selectedPath);
                                }
                              } else {
                                logger.warn('Directory picker not available');
                              }
                            } catch (error) {
                              logger.exception('Failed to open directory picker', error);
                            }
                          }}
                          aria-label="Browse for audio save path"
                        >
                          Browse
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Path where temporary audio recordings will be stored
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Behavior Settings */}
              <Card className="border border-border/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Behavior</CardTitle>
                  <CardDescription>Configure automatic actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
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
                      checked={formValues.autoTranscribe}
                      onCheckedChange={checked => handleInputChange('autoTranscribe', checked)}
                      aria-label="Auto-transcribe toggle"
                    />
                  </div>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
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
                      checked={formValues.saveTranscriptions}
                      onCheckedChange={checked => handleInputChange('saveTranscriptions', checked)}
                      aria-label="Save transcriptions toggle"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="bg-muted/50 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isLoading} onClick={handleSave}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
