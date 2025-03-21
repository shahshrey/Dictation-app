import React from 'react';
import { cn } from '../../lib/utils';
import ThemedLogo from './themed-logo';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'foreground' | 'muted';
  showText?: boolean;
  textClassName?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className,
  size = 'md',
  variant = 'primary',
  showText = true,
  textClassName,
}) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('flex items-center', className)}>
      <ThemedLogo variant={variant} size={size} className={showText ? 'mr-3' : ''} />

      {showText && (
        <div className="flex flex-col justify-center">
          <h1 className={cn(textSizes[size], 'font-bold tracking-tight', textClassName)}>
            Voice Vibe
          </h1>
          <span
            className={cn(
              'text-xs -mt-1',
              textClassName ||
                (variant === 'primary'
                  ? 'text-primary'
                  : variant === 'foreground'
                    ? 'text-foreground'
                    : 'text-muted-foreground')
            )}
          >
            Speak your thoughts
          </span>
        </div>
      )}
    </div>
  );
};

export default AppLogo;
