import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const DictationPopup: React.FC = () => {
  const { isRecording } = useAppContext();
  const [visible, setVisible] = useState(false);
  
  // Control visibility with a slight delay for animations
  useEffect(() => {
    if (isRecording) {
      setVisible(true);
    } else {
      // Add a small delay before hiding to allow for exit animation
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none transition-opacity duration-300"
      style={{ opacity: isRecording ? 1 : 0 }}
    >
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-black/80 w-[200px] h-[200px] shadow-lg">
        {/* Animated waves */}
        <div className="relative w-[120px] h-[120px] mb-4">
          {/* Multiple animated circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full bg-transparent border-2 border-primary animate-ping opacity-70"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] rounded-full bg-transparent border-2 border-primary animate-ping opacity-70 [animation-delay:200ms]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-full bg-transparent border-2 border-primary animate-ping opacity-70 [animation-delay:400ms]"></div>
          
          {/* Mic icon in the center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[60px] h-[60px] rounded-full bg-primary animate-pulse">
            <svg className="w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" x2="12" y1="19" y2="22"></line>
            </svg>
          </div>
        </div>
        
        <h2 className="text-white font-bold text-lg mb-2">
          Recording...
        </h2>
        
        <p className="text-white/70 text-xs mt-1">
          Press Home to stop
        </p>
      </div>
    </div>
  );
};

export default DictationPopup; 