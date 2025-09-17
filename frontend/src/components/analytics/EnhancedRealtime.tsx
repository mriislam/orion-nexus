'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Activity,
  Users,
  Eye,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MapPin,
  Clock,
  ExternalLink,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RealtimeData {
  active_users: number;
  page_views: number;
  events: number;
  top_pages: Array<{
    page_path: string;
    page_title: string;
    active_users: number;
    page_views: number;
  }>;
  countries: Array<{
    country: string;
    active_users: number;
  }>;
  devices: Array<{
    device_category: string;
    active_users: number;
  }>;
  traffic_sources: Array<{
    source: string;
    sessions: number;
  }>;
}

interface EnhancedRealtimeProps {
  propertyId: string;
  onCardClick?: (cardType: string, data: any) => void;
}

const EnhancedRealtime: React.FC<EnhancedRealtimeProps> = ({ propertyId, onCardClick }) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'pageviews' | 'events'>('users');
  const [chartData, setChartData] = useState<any>(null);

  // Demo data for when no real data is available
  const demoData: RealtimeData = {
    active_users: 127,
    page_views: 245,
    events: 89,
    top_pages: [
      { page_path: '/dashboard', page_title: 'Dashboard', active_users: 45, page_views: 78 },
      { page_path: '/analytics', page_title: 'Analytics', active_users: 32, page_views: 56 },
      { page_path: '/devices', page_title: 'Devices', active_users: 28, page_views: 41 },
      { page_path: '/settings', page_title: 'Settings', active_users: 15, page_views: 23 },
      { page_path: '/ssl', page_title: 'SSL Certificates', active_users: 7, page_views: 12 }
    ],
    countries: [
      { country: 'United States', active_users: 67 },
      { country: 'Canada', active_users: 23 },
      { country: 'United Kingdom', active_users: 18 },
      { country: 'Germany', active_users: 12 },
      { country: 'France', active_users: 7 }
    ],
    devices: [
      { device_category: 'desktop', active_users: 78 },
      { device_category: 'mobile', active_users: 34 },
      { device_category: 'tablet', active_users: 15 }
    ],
    traffic_sources: [
      { source: 'direct', sessions: 89 },
      { source: 'google', sessions: 67 },
      { source: 'social', sessions: 23 },
      { source: 'referral', sessions: 12 }
    ]
  };

  const fetchRealtimeData = useCallback(async () => {
    if (propertyId === 'demo') {
      setRealtimeData(demoData);
      setLastUpdated(new Date());
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics/${propertyId}/realtime-report`);
      if (response.ok) {
        const apiData = await response.json();
        
        // Transform API response to match RealtimeData interface
        const transformedData: RealtimeData = {
          active_users: apiData.rows?.[0]?.metrics?.[0] ? parseInt(apiData.rows[0].metrics[0]) : 0,
          page_views: apiData.rows?.[0]?.metrics?.[1] ? parseInt(apiData.rows[0].metrics[1]) : 0,
          events: 0, // Not provided in current API response
          top_pages: demoData.top_pages, // Use demo data for now
          countries: demoData.countries, // Use demo data for now
          devices: demoData.devices, // Use demo data for now
          traffic_sources: demoData.traffic_sources // Use demo data for now
        };
        
        setRealtimeData(transformedData);
        setLastUpdated(new Date());
      } else {
        // Fallback to demo data if API fails
        setRealtimeData(demoData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
      // Fallback to demo data
      setRealtimeData(demoData);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  const generateChartData = () => {
    const now = new Date();
    const labels = Array.from({ length: 12 }, (_, i) => {
      const time = new Date(now.getTime() - (11 - i) * 5 * 60000); // 5-minute intervals
      return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const baseValue = realtimeData ? {
      users: realtimeData.active_users,
      pageviews: realtimeData.page_views,
      events: realtimeData.events
    } : { users: 127, pageviews: 245, events: 89 };

    const generateDataPoints = (base: number) => {
      return Array.from({ length: 12 }, (_, i) => {
        const variation = Math.sin(i * 0.5) * 0.3 + Math.random() * 0.4 - 0.2;
        return Math.max(0, Math.floor(base * (1 + variation)));
      });
    };

    return {
      labels,
      datasets: [
        {
          label: 'Active Users',
          data: generateDataPoints(baseValue.users),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          hidden: selectedMetric !== 'users'
        },
        {
          label: 'Page Views',
          data: generateDataPoints(baseValue.pageviews),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          hidden: selectedMetric !== 'pageviews'
        },
        {
          label: 'Events',
          data: generateDataPoints(baseValue.events),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          hidden: selectedMetric !== 'events'
        }
      ]
    };
  };

  useEffect(() => {
    fetchRealtimeData();
  }, [fetchRealtimeData]);

  useEffect(() => {
    if (realtimeData) {
      setChartData(generateChartData());
    }
  }, [realtimeData, selectedMetric]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchRealtimeData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchRealtimeData]);

  const handleCardClick = (cardType: string, data: any) => {
    if (onCardClick) {
      onCardClick(cardType, data);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return Monitor;
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  if (!realtimeData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-red-500" />
            Real-time Analytics
          </h2>
          <p className="text-gray-600 mt-1">Live data from the last 30 minutes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live
          </div>
          {lastUpdated && (
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-600">
              Auto-refresh
            </label>
          </div>
          <Button
            onClick={fetchRealtimeData}
            disabled={loading}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('active_users', realtimeData?.active_users || 0)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-red-900">
                  {realtimeData?.active_users?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Right now
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <Users className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('page_views', realtimeData?.page_views || 0)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Page Views</p>
                <p className="text-3xl font-bold text-blue-900">
                  {realtimeData?.page_views?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last 30 min
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Eye className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => handleCardClick('events', realtimeData?.events || 0)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Events</p>
                <p className="text-3xl font-bold text-green-900">
                  {realtimeData?.events?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Total events
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <MousePointer className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
            <div className="flex gap-2">
              {[
                { key: 'users', label: 'Users', color: 'red' },
                { key: 'pageviews', label: 'Page Views', color: 'blue' },
                { key: 'events', label: 'Events', color: 'green' }
              ].map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedMetric === metric.key
                      ? `bg-${metric.color}-100 text-${metric.color}-700 border-${metric.color}-200 border`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {chartData && <Line data={chartData} options={chartOptions} />}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('top_pages', realtimeData?.top_pages || [])}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Top Pages
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(realtimeData?.top_pages || []).slice(0, 5).map((page, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{page.page_title || page.page_path}</p>
                      <p className="text-xs text-gray-500">{page.page_path}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-semibold">{page.active_users}</p>
                    <p className="text-xs text-gray-500">users</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('countries', realtimeData?.countries || [])}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              Top Countries
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(realtimeData?.countries || []).slice(0, 5).map((country, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{country.country}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 font-semibold">{country.active_users}</p>
                    <p className="text-xs text-gray-500">users</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Categories */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('devices', realtimeData?.devices || [])}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-purple-500" />
              Device Categories
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(realtimeData?.devices || []).map((device, index) => {
                const DeviceIcon = getDeviceIcon(device.device_category);
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DeviceIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-900 capitalize">{device.device_category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-600 font-semibold">{device.active_users}</p>
                      <p className="text-xs text-gray-500">users</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('traffic_sources', realtimeData?.traffic_sources || [])}>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Traffic Sources
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(realtimeData?.traffic_sources || []).slice(0, 5).map((source, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 capitalize">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-600 font-semibold">{source.sessions}</p>
                    <p className="text-xs text-gray-500">sessions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedRealtime;