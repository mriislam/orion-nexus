'use client';

import React, { useState } from 'react';
import { Filter, X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'metric' | 'dimension' | 'segment';
}

interface AnalyticsFiltersProps {
  onFiltersChange: (filters: FilterOption[]) => void;
  onApply?: () => void;
  loading?: boolean;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ 
  onFiltersChange, 
  onApply,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([]);

  const availableMetrics = [
    { id: 'activeUsers', label: 'Active Users', value: 'activeUsers' },
    { id: 'sessions', label: 'Sessions', value: 'sessions' },
    { id: 'pageViews', label: 'Page Views', value: 'screenPageViews' },
    { id: 'bounceRate', label: 'Bounce Rate', value: 'bounceRate' },
    { id: 'sessionDuration', label: 'Avg Session Duration', value: 'averageSessionDuration' },
    { id: 'conversions', label: 'Conversions', value: 'conversions' },
    { id: 'revenue', label: 'Revenue', value: 'totalRevenue' }
  ];

  const availableDimensions = [
    { id: 'country', label: 'Country', value: 'country' },
    { id: 'city', label: 'City', value: 'city' },
    { id: 'deviceCategory', label: 'Device Category', value: 'deviceCategory' },
    { id: 'browser', label: 'Browser', value: 'browser' },
    { id: 'operatingSystem', label: 'Operating System', value: 'operatingSystem' },
    { id: 'source', label: 'Traffic Source', value: 'source' },
    { id: 'medium', label: 'Medium', value: 'medium' },
    { id: 'campaign', label: 'Campaign', value: 'campaign' }
  ];

  const availableSegments = [
    { id: 'newUsers', label: 'New Users', value: 'newUsers' },
    { id: 'returningUsers', label: 'Returning Users', value: 'returningUsers' },
    { id: 'mobileUsers', label: 'Mobile Users', value: 'mobileUsers' },
    { id: 'desktopUsers', label: 'Desktop Users', value: 'desktopUsers' },
    { id: 'organicTraffic', label: 'Organic Traffic', value: 'organicTraffic' },
    { id: 'paidTraffic', label: 'Paid Traffic', value: 'paidTraffic' }
  ];

  const addFilter = (item: any, type: 'metric' | 'dimension' | 'segment') => {
    const newFilter: FilterOption = {
      id: `${type}_${item.id}`,
      label: item.label,
      value: item.value,
      type
    };

    const updatedFilters = [...activeFilters, newFilter];
    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const removeFilter = (filterId: string) => {
    const updatedFilters = activeFilters.filter(f => f.id !== filterId);
    setActiveFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    onFiltersChange([]);
  };

  const handleApply = () => {
    setIsOpen(false);
    if (onApply) {
      onApply();
    }
  };

  const isFilterActive = (item: any, type: string) => {
    return activeFilters.some(f => f.id === `${type}_${item.id}`);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant={activeFilters.length > 0 ? "primary" : "secondary"}
        className={`flex items-center gap-2 transition-all duration-200 ${
          activeFilters.length > 0 ? 'shadow-md' : ''
        }`}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilters.length > 0 && (
          <span className="bg-white text-blue-600 text-xs rounded-full px-2 py-0.5 ml-1 font-medium">
            {activeFilters.length}
          </span>
        )}
      </Button>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {activeFilters.map((filter) => {
            const getFilterColor = (type: string) => {
              switch (type) {
                case 'metric': return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'dimension': return 'bg-green-100 text-green-800 border-green-200';
                case 'segment': return 'bg-purple-100 text-purple-800 border-purple-200';
                default: return 'bg-gray-100 text-gray-800 border-gray-200';
              }
            };
            
            return (
              <div
                key={filter.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm ${
                  getFilterColor(filter.type)
                }`}
              >
                <span className="capitalize text-xs opacity-75">{filter.type}:</span>
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 ml-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline px-2 py-1 rounded transition-colors hover:bg-gray-50"
          >
            Clear all
          </button>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <Card className="w-96 shadow-lg border">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Analytics Filters</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Metrics */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Metrics</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableMetrics.map((metric) => (
                    <button
                      key={metric.id}
                      onClick={() => !isFilterActive(metric, 'metric') && addFilter(metric, 'metric')}
                      disabled={isFilterActive(metric, 'metric')}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                        isFilterActive(metric, 'metric')
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{metric.label}</span>
                        {!isFilterActive(metric, 'metric') && <Plus className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Dimensions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableDimensions.map((dimension) => (
                    <button
                      key={dimension.id}
                      onClick={() => !isFilterActive(dimension, 'dimension') && addFilter(dimension, 'dimension')}
                      disabled={isFilterActive(dimension, 'dimension')}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                        isFilterActive(dimension, 'dimension')
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{dimension.label}</span>
                        {!isFilterActive(dimension, 'dimension') && <Plus className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Segments */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Segments</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableSegments.map((segment) => (
                    <button
                      key={segment.id}
                      onClick={() => !isFilterActive(segment, 'segment') && addFilter(segment, 'segment')}
                      disabled={isFilterActive(segment, 'segment')}
                      className={`px-3 py-2 text-xs rounded-md border transition-colors text-left ${
                        isFilterActive(segment, 'segment')
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{segment.label}</span>
                        {!isFilterActive(segment, 'segment') && <Plus className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                  {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    size="sm"
                    disabled={loading}
                    className="min-w-[100px]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        Applying...
                      </div>
                    ) : (
                      'Apply Filters'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilters;