import React from 'react';
import { createRoot } from 'react-dom/client';
import DictationPopup from './components/features/dictation/DictationPopup';
import { AppContextProvider } from './context/AppContext';

// Import styles
import './styles/globals.css';

console.log('Popup window started');

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Create a root
const root = createRoot(rootElement);

// Render the popup
root.render(
  <React.StrictMode>
    <AppContextProvider>
      <DictationPopup />
    </AppContextProvider>
  </React.StrictMode>
); 