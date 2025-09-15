'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
}

export default function Layout({ children, fullHeight = false }: LayoutProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-16"
      )}>
        {/* Header */}
        <Header />
        
        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto bg-gray-50",
          fullHeight ? "p-0" : "p-6"
        )}>
          <div className={cn(
            fullHeight ? "h-full" : "max-w-7xl mx-auto"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}