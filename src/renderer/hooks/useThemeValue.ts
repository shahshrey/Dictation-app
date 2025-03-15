import { themeColors, themeRadii, themeAnimations, themeKeyframes } from '../lib/theme';

type ThemeValue = {
  colors: typeof themeColors;
  radii: typeof themeRadii;
  animations: typeof themeAnimations;
  keyframes: typeof themeKeyframes;
};

export const useThemeValue = (): ThemeValue => {
  return {
    colors: themeColors,
    radii: themeRadii,
    animations: themeAnimations,
    keyframes: themeKeyframes,
  };
};
