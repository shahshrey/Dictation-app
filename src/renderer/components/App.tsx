import React, { Suspense, useState } from 'react';
import DictationPopup from './features/dictation/DictationPopup';
import { ThemeProvider } from './layout/ThemeProvider';
import { LoadingSpinner } from './ui/loading-spinner';
import Layout from './layout/Layout';

// Lazy load the pages for better performance
const Home = React.lazy(() => import('./features/home/Home'));
const Dictionary = React.lazy(() => import('./features/dictionary/Dictionary'));
const History = React.lazy(() => import('./features/history/History'));

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');

  // Render the current page based on navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'dictionary':
        return <Dictionary />;
      case 'history':
        return <History />;
      default:
        return <Home />;
    }
  };

  return (
    <ThemeProvider defaultTheme="system">
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      </Layout>
      <DictationPopup />
    </ThemeProvider>
  );
};

export default App;
