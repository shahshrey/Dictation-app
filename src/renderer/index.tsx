import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { AppContextProvider } from './context/AppContext';
import { ThemeProvider } from './components/layout/theme-provider';
import { rendererLogger } from '../shared/preload-logger';
// Import styles
import './styles/globals.css';

rendererLogger.info('Renderer process started');

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