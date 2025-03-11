import React, { useState } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider
} from '@mui/material';
import { THEME_COLORS } from '../../shared/theme';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel id="default-language-label">Default Language</InputLabel>
        <Select
          labelId="default-language-label"
          id="default-language-select"
          value={defaultLanguage}
          label="Default Language"
          onChange={(e) => setDefaultLanguage(e.target.value as string)}
        >
          {LANGUAGE_OPTIONS.map((language) => (
            <MenuItem key={language.code} value={language.code}>
              {language.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <TextField
        fullWidth
        label="Groq API Key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        helperText="Enter your Groq API key for transcription services"
      />
      
      <Divider sx={{ my: 1 }} />
      
      <Typography variant="subtitle2" gutterBottom>
        Application Settings
      </Typography>
      
      <FormControlLabel
        control={
          <Switch
            checked={showNotifications}
            onChange={(e) => setShowNotifications(e.target.checked)}
            color="primary"
          />
        }
        label="Show Notifications"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={saveTranscriptionsAutomatically}
            onChange={(e) => setSaveTranscriptionsAutomatically(e.target.checked)}
            color="primary"
          />
        }
        label="Save Transcriptions Automatically"
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={saveSettings}
          sx={{ bgcolor: THEME_COLORS.primary }}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsPanel; 