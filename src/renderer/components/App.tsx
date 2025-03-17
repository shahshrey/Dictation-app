import React, { Suspense } from 'react';
import Header from './layout/Header';
import DictationPopup from './features/dictation/DictationPopup';
import { ThemeProvider } from './layout/ThemeProvider';
import Home from './features/home/Home';
import { LoadingSpinner } from './ui/loading-spinner';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="flex flex-col h-screen bg-background">
        <Header />

        <div className="container mx-auto flex-1 py-3 flex flex-col">
          <Suspense
            fallback={
              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            }
          >
            <Home />
          </Suspense>
        </div>

        <DictationPopup />
      </div>
    </ThemeProvider>
  );
};

export default App;
