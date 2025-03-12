import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { Card } from './ui/card';

const RecentTranscriptions: React.FC = () => {
  const { recentFiles, refreshRecentFiles } = useAppContext();
  
  useEffect(() => {
    refreshRecentFiles();
  }, []);
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };
  
  const openFile = (path: string): void => {
    // This will be handled by the main process
    window.electronAPI.openFile(path);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {recentFiles.length} recent transcriptions
        </p>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshRecentFiles}
          className="flex items-center gap-1"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {recentFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[100px]">
          <p className="text-sm text-muted-foreground text-center">
            No recent transcriptions found.
          </p>
        </div>
      ) : (
        <Card className="w-full bg-muted/50 border rounded overflow-auto max-h-[300px]">
          <ul className="divide-y divide-border">
            {recentFiles.map((file) => (
              <li key={file.path} className="hover:bg-muted/80 transition-colors">
                <button 
                  className="w-full px-4 py-3 flex justify-between items-center text-left"
                  onClick={() => openFile(file.path)}
                >
                  <div className="overflow-hidden">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatDate(file.modifiedAt)} • {formatFileSize(file.size)}
                    </p>
                  </div>
                  <OpenIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

// Icon components
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
    <path d="M21 3v5h-5"></path>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
    <path d="M3 21v-5h5"></path>
  </svg>
);

const OpenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" x2="21" y1="14" y2="3"></line>
  </svg>
);

export default RecentTranscriptions; 