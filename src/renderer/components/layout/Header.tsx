import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import SettingsModal from '../features/settings/SettingsModal';
import AppLogo from '../ui/app-logo';

const Header: React.FC = () => {
  const { isRecording } = useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 py-2 flex items-center">
        <AppLogo variant="primary" textClassName="text-primary-foreground" />

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
