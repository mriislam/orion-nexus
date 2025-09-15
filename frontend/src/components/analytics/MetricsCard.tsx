'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  subtitle?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
  description?: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  previousValue,
  change,
  changeType = 'percentage',
  icon,
  color = 'blue',
  subtitle,
  loading = false,
  className = '',
  onClick,
  clickable = false,
  description
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(2)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(2)}K`;
      }
      // For decimal numbers, limit to 2 decimal places
      if (val % 1 !== 0) {
        return val.toFixed(2);
      }
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-3 h-3" />;
    }
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) {
      return 'text-gray-500';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeText = () => {
    if (change === undefined) return '';
    
    const absChange = Math.abs(change);
    const prefix = change > 0 ? '+' : '-';
    
    if (changeType === 'percentage') {
      return `${prefix}${absChange.toFixed(2)}%`;
    }
    return `${prefix}${formatValue(absChange)}`;
  };

  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100',
      border: 'border-blue-200',
      text: 'text-blue-600',
      textDark: 'text-blue-900',
      iconBg: 'bg-blue-200',
      iconText: 'text-blue-700'
    },
    green: {
      bg: 'from-green-50 to-green-100',
      border: 'border-green-200',
      text: 'text-green-600',
      textDark: 'text-green-900',
      iconBg: 'bg-green-200',
      iconText: 'text-green-700'
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      text: 'text-purple-600',
      textDark: 'text-purple-900',
      iconBg: 'bg-purple-200',
      iconText: 'text-purple-700'
    },
    orange: {
      bg: 'from-orange-50 to-orange-100',
      border: 'border-orange-200',
      text: 'text-orange-600',
      textDark: 'text-orange-900',
      iconBg: 'bg-orange-200',
      iconText: 'text-orange-700'
    },
    red: {
      bg: 'from-red-50 to-red-100',
      border: 'border-red-200',
      text: 'text-red-600',
      textDark: 'text-red-900',
      iconBg: 'bg-red-200',
      iconText: 'text-red-700'
    },
    gray: {
      bg: 'from-gray-50 to-gray-100',
      border: 'border-gray-200',
      text: 'text-gray-600',
      textDark: 'text-gray-900',
      iconBg: 'bg-gray-200',
      iconText: 'text-gray-700'
    }
  };

  const colors = colorClasses[color];

  if (loading) {
    return (
      <Card className={cn(
        `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-sm`,
        className
      )}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-20"></div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
                <div className="h-3 bg-gray-300 rounded w-12"></div>
              </div>
              <div className="w-12 h-12 bg-gray-300 rounded-xl"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-sm transition-all duration-200`,
        clickable && 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-opacity-80',
        clickable && `hover:${colors.bg.replace('50', '100').replace('100', '200')}`,
        className
      )}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-semibold ${colors.text} uppercase tracking-wide`}>{title}</p>
              {clickable && (
                <div className={`w-2 h-2 rounded-full ${colors.iconBg} opacity-60`}></div>
              )}
            </div>
            
            <p className={`text-3xl font-bold ${colors.textDark} mb-3 leading-none`}>
              {formatValue(value)}
            </p>
            
            {/* Description */}
            {description && (
              <p className={`text-xs ${colors.text} mb-2 opacity-80`}>{description}</p>
            )}
            
            {/* Trend and Change */}
            <div className="flex items-center gap-3 mt-2">
              {change !== undefined && (
                <div className={`flex items-center gap-1 ${getTrendColor()} bg-white bg-opacity-50 px-2 py-1 rounded-full`}>
                  {getTrendIcon()}
                  <span className="text-xs font-semibold">{getChangeText()}</span>
                </div>
              )}
              {subtitle && (
                <span className={`text-xs ${colors.text} font-medium`}>{subtitle}</span>
              )}
            </div>
            
            {/* Previous Value Comparison */}
            {previousValue && (
              <p className={`text-xs ${colors.text} mt-2 opacity-70`}>
                Previous: {formatValue(previousValue)}
              </p>
            )}
          </div>
          
          {/* Icon */}
          {icon && (
            <div className={`p-3 ${colors.iconBg} rounded-xl flex-shrink-0 shadow-sm`}>
              <div className={`${colors.iconText} w-6 h-6 flex items-center justify-center`}>
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsCard;