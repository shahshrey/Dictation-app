// Centralized theme colors for the entire application
// No hardcoded colors should be used anywhere else in the app

export const THEME_COLORS = {
  // Primary colors
  primary: '#3f51b5',
  primaryLight: '#757de8',
  primaryDark: '#002984',
  
  // Secondary colors
  secondary: '#f50057',
  secondaryLight: '#ff5983',
  secondaryDark: '#bb002f',
  
  // Background colors
  background: '#fafafa',
  paper: '#ffffff',
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textDisabled: '#9e9e9e',
  
  // Status colors
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  
  // Recording status colors
  recordingActive: '#f44336',
  recordingInactive: '#9e9e9e',
  
  // Misc
  divider: '#e0e0e0',
  shadow: 'rgba(0, 0, 0, 0.2)',
};

// Material UI theme configuration
export const THEME_CONFIG = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 4,
  },
  spacing: 8,
}; 