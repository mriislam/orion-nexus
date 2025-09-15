'use client';

import React from 'react';
import { Card, CardContent } from './Card';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchAndFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  totalCount?: number;
  filteredCount?: number;
  children?: React.ReactNode;
  className?: string;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  totalCount,
  filteredCount,
  children,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {children && (
            <div className="flex items-center space-x-2">
              {children}
            </div>
          )}
          
          {(totalCount !== undefined && filteredCount !== undefined) && (
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {filteredCount} of {totalCount} items
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchAndFilter;