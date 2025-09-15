'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from './Layout';
import Button from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  showBackButton?: boolean;
  backButtonText?: string;
  onBack?: () => void;
  headerActions?: React.ReactNode;
  fullHeight?: boolean;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  description,
  showBackButton = false,
  backButtonText = 'Back',
  onBack,
  headerActions,
  fullHeight = false,
  className
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <Layout fullHeight={fullHeight}>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backButtonText}
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>

        {/* Content */}
        {children}
      </div>
    </Layout>
  );
};

export default PageLayout;