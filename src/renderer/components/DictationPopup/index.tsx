import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Mic as MicIcon } from '@mui/icons-material';
import { THEME_COLORS } from '../../../shared/theme';
import { useAppContext } from '../../context/AppContext';

// CSS styles for animations
const styles = {
  '@keyframes wave': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.8,
    },
    '50%': {
      transform: 'scale(1.2)',
      opacity: 0.4,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.8,
    },
  },
  '@keyframes multiWave0': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
    '50%': {
      transform: 'scale(1.5)',
      opacity: 0.3,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
  },
  '@keyframes multiWave1': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
    '50%': {
      transform: 'scale(1.5)',
      opacity: 0.3,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
  },
  '@keyframes multiWave2': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
    '50%': {
      transform: 'scale(1.5)',
      opacity: 0.3,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.7,
    },
  },
};

const DictationPopup: React.FC = () => {
  const { isRecording } = useAppContext();
  const [visible, setVisible] = useState(false);
  
  // Control visibility with a slight delay for animations
  useEffect(() => {
    if (isRecording) {
      setVisible(true);
    } else {
      // Add a small delay before hiding to allow for exit animation
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);
  
  if (!visible) return null;
  
  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none', // Allow clicking through the popup
        transition: 'opacity 0.3s ease-in-out',
        opacity: isRecording ? 1 : 0,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          borderRadius: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          width: 200,
          height: 200,
        }}
      >
        {/* Animated waves */}
        <Box sx={{ position: 'relative', width: 120, height: 120, mb: 2 }}>
          {/* Multiple animated circles */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `2px solid ${THEME_COLORS.recordingActive}`,
              animation: 'multiWave0 1.5s infinite ease-in-out',
              animationDelay: '0s',
              '@keyframes multiWave0': styles['@keyframes multiWave0'],
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 110,
              height: 110,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `2px solid ${THEME_COLORS.recordingActive}`,
              animation: 'multiWave1 1.5s infinite ease-in-out',
              animationDelay: '0.2s',
              '@keyframes multiWave1': styles['@keyframes multiWave1'],
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: `2px solid ${THEME_COLORS.recordingActive}`,
              animation: 'multiWave2 1.5s infinite ease-in-out',
              animationDelay: '0.4s',
              '@keyframes multiWave2': styles['@keyframes multiWave2'],
            }}
          />
          
          {/* Mic icon in the center */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: THEME_COLORS.recordingActive,
              animation: 'wave 2s infinite ease-in-out',
              '@keyframes wave': styles['@keyframes wave'],
            }}
          >
            <MicIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
        </Box>
        
        <Typography variant="h6" color="white" fontWeight="bold">
          Recording...
        </Typography>
        
        <Typography variant="caption" color="white" sx={{ mt: 1, opacity: 0.7 }}>
          Press Home to stop
        </Typography>
      </Paper>
    </Box>
  );
};

export default DictationPopup; 