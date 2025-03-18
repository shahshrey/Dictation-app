import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import SettingsModal from '../features/settings/SettingsModal';
import AppLogo from '../ui/app-logo';
import { Settings, Minimize } from 'lucide-react';

const Header: React.FC = () => {
  const { isRecording } = useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleMinimize = () => {
    window.electronAPI.minimizeMainWindow();
  };

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
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minimize className="h-5 w-5" />
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground ml-2"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
};

export default Header;
