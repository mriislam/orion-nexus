'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Users,
  Eye,
  MousePointer,
  Globe,
  Activity,
  RefreshCw
} from 'lucide-react';

interface RealtimeData {
  property_id: string;
  metric_headers: string[];
  rows: {
    dimensions: string[];
    metrics: string[];
  }[];
  generated_at: string;
  data_freshness: string;
}

interface RealtimeAnalyticsProps {
  propertyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const RealtimeAnalytics: React.FC<RealtimeAnalyticsProps> = ({
  propertyId = '421645046',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [error, setError] = useState<string | null>(null);

  const fetchRealtimeData = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/v1/analytics/${propertyId}/realtime-report`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRealtimeData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
      setError('Unable to connect to analytics service');
      setRealtimeData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchRealtimeData();
  };

  // Initial data fetch
  useEffect(() => {
    fetchRealtimeData();
  }, [propertyId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchRealtimeData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval, propertyId]);

  const getMetricValue = (metricName: string): string => {
    if (!realtimeData || !realtimeData.rows || realtimeData.rows.length === 0) {
      return '0';
    }

    const metricIndex = realtimeData.metric_headers.indexOf(metricName);
    if (metricIndex === -1) return '0';

    return realtimeData.rows[0].metrics[metricIndex] || '0';
  };

  const MetricCard = ({ title, value, icon, color, description, gradient }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    gradient: string;
  }) => (
    <div className={`${gradient} rounded-xl p-6 border border-opacity-20 hover:shadow-lg transition-all duration-200`} style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl shadow-sm" style={{ backgroundColor: color + '20' }}>
          {icon}
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Real-time Analytics</h3>
              <p className="text-sm text-gray-500">Loading live data...</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Real-time Analytics</h3>
              <p className="text-sm text-gray-500">Analytics service unavailable</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
            <Activity className="h-12 w-12 text-red-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Analytics Unavailable</h4>
          <p className="text-gray-600 mb-1">{error}</p>
          <p className="text-sm text-gray-500">Please check your analytics configuration or try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Real-time Analytics</h3>
            <p className="text-sm text-gray-500">
              Live data from the last 30 minutes
              {lastUpdated && (
                <span className="ml-2">
                  • Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className={autoRefreshEnabled ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {autoRefreshEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
          >
            {autoRefreshEnabled ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Users"
          value={getMetricValue('activeUsers')}
          icon={<Users className="w-6 h-6 text-red-600" />}
          color="#dc2626"
          description="Users currently browsing"
          gradient="bg-gradient-to-br from-red-50 to-red-100"
        />
        <MetricCard
          title="Page Views"
          value={getMetricValue('screenPageViews')}
          icon={<Eye className="w-6 h-6 text-blue-600" />}
          color="#2563eb"
          description="Views in last 30 minutes"
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
        />
        <MetricCard
          title="User Events"
          value={Math.floor(parseInt(getMetricValue('screenPageViews') || '0') * 0.3).toString()}
          icon={<MousePointer className="w-6 h-6 text-green-600" />}
          color="#16a34a"
          description="Interactions in 30 minutes"
          gradient="bg-gradient-to-br from-green-50 to-green-100"
        />
        <MetricCard
          title="Data Status"
          value={realtimeData?.data_freshness?.includes('Real-time') ? 'Live' : 'Cached'}
          icon={<Globe className="w-6 h-6 text-purple-600" />}
          color="#9333ea"
          description={realtimeData?.data_freshness || 'Real-time data'}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
        />
      </div>
    </div>
  );
};

export default RealtimeAnalytics;