import React, { Suspense } from 'react';
import { Box, Container, Paper, Typography, CircularProgress } from '@mui/material';
import { THEME_COLORS } from '../../shared/theme';
import Header from './Header';
import RecordingControls from './RecordingControls';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecentTranscriptions from './RecentTranscriptions';
import SettingsPanel from './SettingsPanel';

const App: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: THEME_COLORS.background,
      }}
    >
      <Header />
      
      <Container maxWidth="lg" sx={{ flex: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: THEME_COLORS.paper,
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Dictation
          </Typography>
          
          <Suspense fallback={<CircularProgress />}>
            <RecordingControls />
          </Suspense>
        </Paper>
        
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            bgcolor: THEME_COLORS.paper,
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Transcription
          </Typography>
          
          <Suspense fallback={<CircularProgress />}>
            <TranscriptionDisplay />
          </Suspense>
        </Paper>
        
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: THEME_COLORS.paper,
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom>
              Recent Transcriptions
            </Typography>
            
            <Suspense fallback={<CircularProgress />}>
              <RecentTranscriptions />
            </Suspense>
          </Paper>
          
          <Paper
            elevation={3}
            sx={{
              p: 3,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: THEME_COLORS.paper,
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom>
              Settings
            </Typography>
            
            <Suspense fallback={<CircularProgress />}>
              <SettingsPanel />
            </Suspense>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default App; 