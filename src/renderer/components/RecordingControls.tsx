import React from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography,
  Tooltip,
  Paper
} from '@mui/material';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  Refresh as RefreshIcon,
  Translate as TranslateIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { THEME_COLORS } from '../../shared/theme';
import { useAppContext } from '../context/AppContext';

const RecordingControls: React.FC = () => {
  const { 
    isRecording, 
    audioSources, 
    selectedSourceId, 
    setSelectedSourceId,
    refreshAudioSources,
    startRecording,
    stopRecording,
    transcribeRecording,
    translateRecording,
    currentTranscription,
    saveTranscription,
    saveTranscriptionAs
  } = useAppContext();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="audio-source-label">Audio Source</InputLabel>
          <Select
            labelId="audio-source-label"
            id="audio-source-select"
            value={selectedSourceId}
            label="Audio Source"
            onChange={(e) => setSelectedSourceId(e.target.value)}
            disabled={isRecording}
          >
            {audioSources.map((source) => (
              <MenuItem key={source.id} value={source.id}>
                {source.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Tooltip title="Refresh audio sources">
          <Button
            variant="outlined"
            color="primary"
            onClick={refreshAudioSources}
            disabled={isRecording}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {!isRecording ? (
          <Button
            variant="contained"
            color="primary"
            onClick={startRecording}
            disabled={!selectedSourceId}
            startIcon={<MicIcon />}
            sx={{ bgcolor: THEME_COLORS.primary }}
          >
            Start Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            onClick={stopRecording}
            startIcon={<StopIcon />}
            sx={{ bgcolor: THEME_COLORS.recordingActive }}
          >
            Stop Recording
          </Button>
        )}
        
        <Button
          variant="outlined"
          color="primary"
          onClick={() => transcribeRecording()}
          disabled={isRecording}
          startIcon={<MicIcon />}
        >
          Transcribe
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={translateRecording}
          disabled={isRecording}
          startIcon={<TranslateIcon />}
        >
          Translate
        </Button>
      </Box>
      
      {currentTranscription && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => saveTranscription()}
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={saveTranscriptionAs}
            startIcon={<SaveIcon />}
          >
            Save As...
          </Button>
        </Box>
      )}
      
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mt: 2, 
          bgcolor: THEME_COLORS.background,
          border: `1px solid ${THEME_COLORS.divider}`
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Press the <strong>Home</strong> key to start/stop recording at any time.
        </Typography>
      </Paper>
    </Box>
  );
};

export default RecordingControls; 