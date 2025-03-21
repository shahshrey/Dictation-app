import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ThemeClass = {
  [key: string]: boolean | string | undefined;
};

export function getThemeClasses(classes: ThemeClass): string {
  return cn(
    Object.entries(classes)
      .filter(([_, value]) => value)
      .map(([key]) => key)
  );
}
