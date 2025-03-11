import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { THEME_COLORS } from '../../shared/theme';
import { useAppContext } from '../context/AppContext';

const TranscriptionDisplay: React.FC = () => {
  const { currentTranscription } = useAppContext();
  
  if (!currentTranscription) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          p: 3,
        }}
      >
        <Typography variant="body1" color="textSecondary" align="center">
          No transcription available. Record and transcribe audio to see results here.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Chip 
          label={`Language: ${currentTranscription.language}`} 
          size="small" 
          color="primary"
        />
        <Chip 
          label={new Date(currentTranscription.timestamp).toLocaleString()} 
          size="small" 
          variant="outlined"
        />
      </Box>
      
      <Paper
        elevation={0}
        sx={{
          p: 2,
          flex: 1,
          overflow: 'auto',
          bgcolor: THEME_COLORS.background,
          border: `1px solid ${THEME_COLORS.divider}`,
          borderRadius: 1,
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {currentTranscription.text}
        </Typography>
      </Paper>
    </Box>
  );
};

export default TranscriptionDisplay; 