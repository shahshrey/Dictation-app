import * as React from 'react';
import { themeColors, themeRadii, themeAnimations, themeKeyframes } from '../../lib/theme';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof themeColors;
  radii: typeof themeRadii;
  animations: typeof themeAnimations;
  keyframes: typeof themeKeyframes;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  colors: themeColors,
  radii: themeRadii,
  animations: themeAnimations,
  keyframes: themeKeyframes,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, defaultTheme = 'system', ...props }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (theme: Theme) => setTheme(theme),
      colors: themeColors,
      radii: themeRadii,
      animations: themeAnimations,
      keyframes: themeKeyframes,
    }),
    [theme]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = (): ThemeProviderState => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
