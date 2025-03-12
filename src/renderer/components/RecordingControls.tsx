import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Card } from './ui/card';

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="min-w-[200px]">
          <Label htmlFor="audio-source" className="mb-2 block">Audio Source</Label>
          <Select
            value={selectedSourceId}
            onValueChange={setSelectedSourceId}
            disabled={isRecording}
          >
            <SelectTrigger id="audio-source">
              <SelectValue placeholder="Select audio source" />
            </SelectTrigger>
            <SelectContent>
              {audioSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          onClick={refreshAudioSources}
          disabled={isRecording}
          className="flex gap-2 items-center"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <div className="flex gap-4 items-center">
        {!isRecording ? (
          <Button
            variant="default"
            onClick={startRecording}
            disabled={!selectedSourceId}
            className="flex gap-2 items-center"
          >
            <MicIcon className="h-4 w-4" />
            Start Recording
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={stopRecording}
            className="flex gap-2 items-center"
          >
            <StopIcon className="h-4 w-4" />
            Stop Recording
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={() => transcribeRecording()}
          disabled={isRecording}
          className="flex gap-2 items-center"
        >
          <MicIcon className="h-4 w-4" />
          Transcribe
        </Button>
        
        <Button
          variant="outline"
          onClick={translateRecording}
          disabled={isRecording}
          className="flex gap-2 items-center"
        >
          <TranslateIcon className="h-4 w-4" />
          Translate
        </Button>
      </div>
      
      {currentTranscription && (
        <div className="flex gap-4 mt-4">
          <Button
            variant="outline"
            onClick={() => saveTranscription()}
            className="flex gap-2 items-center"
          >
            <SaveIcon className="h-4 w-4" />
            Save
          </Button>
          
          <Button
            variant="outline"
            onClick={saveTranscriptionAs}
            className="flex gap-2 items-center"
          >
            <SaveIcon className="h-4 w-4" />
            Save As...
          </Button>
        </div>
      )}
      
      <Card className="p-4 mt-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Press the <strong>Home</strong> key to start/stop recording at any time.
        </p>
      </Card>
    </div>
  );
};

// Icon components
const MicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" x2="12" y1="19" y2="22"></line>
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="14" height="14" x="5" y="5" rx="2"></rect>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </svg>
);

const TranslateIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 8 6 6"></path>
    <path d="m4 14 6-6 2-3"></path>
    <path d="M2 5h12"></path>
    <path d="M7 2h1"></path>
    <path d="m22 22-5-10-5 10"></path>
    <path d="M14 18h6"></path>
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

export default RecordingControls; 