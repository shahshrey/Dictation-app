import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, className, currentPage, onNavigate }) => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      <main className={cn('flex-1 overflow-auto p-4', className)}>{children}</main>
    </div>
  );
};

export default Layout;
