import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import AppLogo from '../ui/app-logo';
import { Home, Book, History, Settings } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import SettingsModal from '../features/settings/SettingsModal';

interface SidebarProps {
  className?: string;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center w-full px-3 py-3 rounded-lg transition-colors',
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-accent/50'
      )}
    >
      <Icon className={cn('h-5 w-5 mr-3', active ? 'text-primary' : 'text-muted-foreground')} />
      <span>{label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ className, currentPage, onNavigate }) => {
  const { isRecording } = useAppContext();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dictionary', label: 'Dictionary', icon: Book },
    { id: 'history', label: 'History', icon: History },
  ];

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  return (
    <div className={cn('w-[220px] h-full flex flex-col bg-background border-r', className)}>
      <div className="p-4 border-b">
        <AppLogo size="sm" variant="foreground" />
      </div>

      {isRecording && (
        <div className="mx-4 mt-4 p-2 bg-destructive/10 rounded-md flex items-center">
          <div className="w-2 h-2 rounded-full bg-destructive mr-2 animate-pulse" />
          <span className="text-sm text-destructive font-medium">Recording</span>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1 overflow-auto">
        {navItems.map(item => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentPage === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}

        <SidebarItem icon={Settings} label="Settings" active={false} onClick={handleOpenSettings} />
      </nav>

      <div className="p-4 text-xs text-muted-foreground border-t">
        <div className="flex items-center justify-between">
          <span>Voice Vibe</span>
          <span>v1.0.0</span>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Sidebar;
