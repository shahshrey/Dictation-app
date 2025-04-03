export const themeColors = {
  // Primary colors
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },

  // Background colors
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',

  // Component colors
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },

  // State colors
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },

  // UI element colors
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
};

export const themeRadii = {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
};

export const themeAnimations = {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'gradient-x': 'gradient-x 5s ease infinite',
  'sound-wave': 'sound-wave 1.2s ease-in-out infinite',
};

export const themeKeyframes = {
  'accordion-down': {
    from: { height: 0 },
    to: { height: 'var(--radix-accordion-content-height)' },
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: 0 },
  },
  'gradient-x': {
    '0%, 100%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
  },
  'sound-wave': {
    '0%, 100%': {
      height: '15%',
      opacity: 0.6,
    },
    '50%': {
      height: '100%',
      opacity: 1,
    },
  },
};
