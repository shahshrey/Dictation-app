import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '../ui/button';
import { useTheme } from './ThemeProvider';
import { cn } from '../../lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="text-primary-foreground"
    >
      <Sun
        className={cn(
          'h-[1.2rem] w-[1.2rem] transition-all',
          theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
        )}
      />
      <Moon
        className={cn(
          'absolute h-[1.2rem] w-[1.2rem] transition-all',
          theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
