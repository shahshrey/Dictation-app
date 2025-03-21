import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { AppContextProvider } from './context/AppContext';
import { ThemeProvider } from './components/layout/theme-provider';
import logger from '../shared/logger';
// Import the CSS directly
import './styles/globals.css';

logger.debug('Renderer process started');
logger.debug('React version:', { version: React.version });
logger.debug('Using shadcn/ui components');

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
      <AppContextProvider>
        <App />
      </AppContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
