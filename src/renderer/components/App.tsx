import React, { Suspense } from 'react';
import Header from './layout/Header';
import RecordingControls from './features/dictation/RecordingControls';
import TranscriptionDisplay from './features/transcription/TranscriptionDisplay';
import RecentTranscriptions from './features/transcription/RecentTranscriptions';
import DictationPopup from './features/dictation/DictationPopup';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ThemeProvider } from './layout/ThemeProvider';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="flex flex-col h-screen bg-background">
        <Header />

        <div className="container mx-auto flex-1 py-3 flex flex-col">
          <Card className="mb-3">
            <CardHeader>
              <CardTitle>Voice Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                }
              >
                <RecordingControls />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="mb-3 flex-1 overflow-hidden">
            <CardHeader>
              <CardTitle>Voice Transcription</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                }
              >
                <TranscriptionDisplay />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Recent Voice Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                }
              >
                <RecentTranscriptions />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        <DictationPopup />
      </div>
    </ThemeProvider>
  );
};

// Simple loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
);

export default App;
