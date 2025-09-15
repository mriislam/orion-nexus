'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface DateRange {
  start: string;
  end: string;
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onApply?: () => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  dateRange, 
  onDateRangeChange, 
  onApply 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState(dateRange);

  const presetRanges = [
    { label: 'Last 7 days', value: '7daysAgo', days: 7 },
    { label: 'Last 14 days', value: '14daysAgo', days: 14 },
    { label: 'Last 30 days', value: '30daysAgo', days: 30 },
    { label: 'Last 90 days', value: '90daysAgo', days: 90 },
    { label: 'Last 6 months', value: '180daysAgo', days: 180 },
    { label: 'Last year', value: '365daysAgo', days: 365 }
  ];

  const getDisplayText = () => {
    if (tempRange.startDate && tempRange.endDate) {
      const start = new Date(tempRange.startDate).toLocaleDateString();
      const end = new Date(tempRange.endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    
    const preset = presetRanges.find(p => p.value === tempRange.start);
    return preset ? preset.label : 'Custom Range';
  };

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - preset.days);
    
    const newRange = {
      start: preset.value,
      end: 'today',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    setTempRange(newRange);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setTempRange(prev => ({
      ...prev,
      [field]: value,
      start: 'custom',
      end: 'custom'
    }));
  };

  const handleApply = () => {
    onDateRangeChange(tempRange);
    setIsOpen(false);
    if (onApply) {
      onApply();
    }
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className="flex items-center gap-2 min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">{getDisplayText()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <Card className="w-80 shadow-lg border">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Preset Ranges */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Select</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {presetRanges.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => handlePresetSelect(preset)}
                        className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                          tempRange.start === preset.value
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Range</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={tempRange.startDate}
                        onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={tempRange.endDate}
                        onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    onClick={handleCancel}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    size="sm"
                  >
                    Apply
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

export default DateRangePicker;