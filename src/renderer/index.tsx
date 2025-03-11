import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './components/App';
import { THEME_COLORS, THEME_CONFIG } from '../shared/theme';
import { AppContextProvider } from './context/AppContext';

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: THEME_COLORS.primary,
      light: THEME_COLORS.primaryLight,
      dark: THEME_COLORS.primaryDark,
    },
    secondary: {
      main: THEME_COLORS.secondary,
      light: THEME_COLORS.secondaryLight,
      dark: THEME_COLORS.secondaryDark,
    },
    background: {
      default: THEME_COLORS.background,
      paper: THEME_COLORS.paper,
    },
    text: {
      primary: THEME_COLORS.textPrimary,
      secondary: THEME_COLORS.textSecondary,
      disabled: THEME_COLORS.textDisabled,
    },
    error: {
      main: THEME_COLORS.error,
    },
    warning: {
      main: THEME_COLORS.warning,
    },
    info: {
      main: THEME_COLORS.info,
    },
    success: {
      main: THEME_COLORS.success,
    },
  },
  typography: THEME_CONFIG.typography,
  shape: THEME_CONFIG.shape,
  spacing: THEME_CONFIG.spacing,
});

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContextProvider>
        <App />
      </AppContextProvider>
    </ThemeProvider>
  </React.StrictMode>
); 