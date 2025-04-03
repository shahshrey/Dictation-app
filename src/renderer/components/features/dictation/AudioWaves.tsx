import React from 'react';
import { cn } from '../../../lib/utils';

interface AudioWavesProps {
  isActive: boolean;
  className?: string;
}

const AudioWaves: React.FC<AudioWavesProps> = ({ isActive, className }) => {
  if (!isActive) return null;

  return (
    <div className={cn('flex items-center justify-center gap-1 h-full', className)}>
      {/* Create multiple bars with different animations */}
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn('bg-primary h-full w-[2px] rounded-full opacity-80', 'animate-sound-wave')}
          style={{
            animationDelay: `${index * 0.1}s`,
            height: `${30 + Math.random() * 20}%`,
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaves;
