import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { AppContextProvider } from './context/AppContext';
import { ThemeProvider } from './components/theme-provider';
// Import only the processed CSS
import './index.css';
import './mock-electron-api'; // Import the mock API

console.log('Renderer process started');
console.log('React version:', React.version);
console.log('Using shadcn/ui components');

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