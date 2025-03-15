import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import SettingsModal from '../features/settings/SettingsModal';

const Header: React.FC = () => {
  const { isRecording } = useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <div className="flex items-center">
          <div className="h-10 w-10 mr-3 flex items-center justify-center bg-white/10 rounded-full p-1.5 shadow-inner">
            <img src="./assets/logo/logo.svg" alt="Voice Vibe Logo" className="h-full w-full" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-gradient-size animate-gradient-x">
              Voice Vibe
            </h1>
            <span className="text-xs text-primary-foreground/80 -mt-1">Speak your thoughts</span>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center mr-4 ml-auto">
            <div className="w-3 h-3 rounded-full bg-destructive mr-2 animate-pulse" />
            <span className="text-sm">Recording</span>
          </div>
        )}

        <div className="ml-auto flex items-center">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground ml-2"
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
};

// Simple icon component
const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default Header;
