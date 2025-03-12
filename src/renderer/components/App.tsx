import React, { Suspense } from 'react';
import Header from './layout/Header';
import RecordingControls from './features/dictation/RecordingControls';
import TranscriptionDisplay from './features/transcription/TranscriptionDisplay';
import RecentTranscriptions from './features/transcription/RecentTranscriptions';
import SettingsPanel from './features/settings/SettingsPanel';
import DictationPopup from './features/dictation/DictationPopup';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <div className="container mx-auto flex-1 py-3 flex flex-col">
        <Card className="mb-3">
          <CardHeader>
            <CardTitle>Dictation</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="flex justify-center"><LoadingSpinner /></div>}>
              <RecordingControls />
            </Suspense>
          </CardContent>
        </Card>
        
        <Card className="mb-3 flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            <Suspense fallback={<div className="flex justify-center"><LoadingSpinner /></div>}>
              <TranscriptionDisplay />
            </Suspense>
          </CardContent>
        </Card>
        
        <div className="flex gap-3">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Recent Transcriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex justify-center"><LoadingSpinner /></div>}>
                <RecentTranscriptions />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="flex justify-center"><LoadingSpinner /></div>}>
                <SettingsPanel />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <DictationPopup />
    </div>
  );
};

// Simple loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
);

export default App; 