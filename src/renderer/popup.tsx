import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './components/theme-provider';
// Import only the processed CSS
import './popup.css';
import './mock-electron-api'; // Import the mock API

// Simple popup component
const PopupApp: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background rounded-lg border border-border shadow-lg overflow-hidden">
      <div className="w-24 h-24 relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
        <div className="absolute inset-4 bg-primary/40 rounded-full animate-pulse"></div>
        <div className="absolute inset-8 bg-primary rounded-full"></div>
      </div>
      <h2 className="mt-4 text-lg font-medium text-foreground">Recording...</h2>
      <p className="text-sm text-muted-foreground mt-2">Press Home key to stop</p>
    </div>
  );
};

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create a root
const root = createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <PopupApp />
    </ThemeProvider>
  </React.StrictMode>
); 