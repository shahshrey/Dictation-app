import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Settings as SettingsIcon, Mic as MicIcon } from '@mui/icons-material';
import { THEME_COLORS } from '../../shared/theme';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { isRecording } = useAppContext();
  
  return (
    <AppBar position="static" sx={{ bgcolor: THEME_COLORS.primary }}>
      <Toolbar>
        <MicIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Dictation App
        </Typography>
        
        {isRecording && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mr: 2,
              '& .recording-indicator': {
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: THEME_COLORS.recordingActive,
                mr: 1,
                animation: 'pulse 1.5s infinite',
              },
              '@keyframes pulse': {
                '0%': {
                  opacity: 1,
                },
                '50%': {
                  opacity: 0.4,
                },
                '100%': {
                  opacity: 1,
                },
              },
            }}
          >
            <div className="recording-indicator" />
            <Typography variant="body2">Recording</Typography>
          </Box>
        )}
        
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          aria-label="settings"
        >
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 