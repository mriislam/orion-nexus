'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { BarChart3, Users, Eye, MousePointer, TrendingUp, TrendingDown, Globe, Clock } from 'lucide-react';

interface AnalyticsMetrics {
  activeUsers: number;
  totalSessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  returningUsers: number;
  conversionRate: number;
  topPages: Array<{
    path: string;
    views: number;
    change: number;
  }>;
  trafficSources: Array<{
    source: string;
    percentage: number;
    sessions: number;
  }>;
  trends: {
    activeUsersChange: number;
    sessionsChange: number;
    pageViewsChange: number;
    bounceRateChange: number;
  };
}

const AnalyticsOverviewCard = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call
        const mockMetrics: AnalyticsMetrics = {
          activeUsers: 1247,
          totalSessions: 3892,
          pageViews: 15420,
          bounceRate: 42.3,
          avgSessionDuration: 185, // seconds
          newUsers: 892,
          returningUsers: 355,
          conversionRate: 3.2,
          topPages: [
            { path: '/dashboard', views: 4521, change: 12.5 },
            { path: '/analytics', views: 2890, change: -5.2 },
            { path: '/devices', views: 2156, change: 8.7 },
            { path: '/uptime', views: 1843, change: 15.3 }
          ],
          trafficSources: [
            { source: 'Direct', percentage: 45.2, sessions: 1759 },
            { source: 'Organic Search', percentage: 28.7, sessions: 1117 },
            { source: 'Referral', percentage: 16.8, sessions: 654 },
            { source: 'Social', percentage: 9.3, sessions: 362 }
          ],
          trends: {
            activeUsersChange: 8.5,
            sessionsChange: 12.3,
            pageViewsChange: -2.1,
            bounceRateChange: -5.4
          }
        };
        setMetrics(mockMetrics);
      } catch (err) {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
        <div className="text-center py-4">
          <BarChart3 className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error || 'Unable to load analytics data'}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-white to-purple-50/30 rounded-lg shadow-sm border border-purple-100 p-4 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
              <p className="text-sm text-gray-500">Website performance metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs rounded ${
                  timeRange === range 
                    ? 'bg-purple-100 text-purple-700 font-medium' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-lg font-bold text-blue-600">{metrics.activeUsers.toLocaleString()}</span>
              {getTrendIcon(metrics.trends.activeUsersChange)}
            </div>
            <div className="text-xs text-gray-500">Active Users</div>
            <div className={`text-xs ${getTrendColor(metrics.trends.activeUsersChange)}`}>
              {metrics.trends.activeUsersChange > 0 ? '+' : ''}{metrics.trends.activeUsersChange}%
            </div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center justify-center mb-1">
              <Eye className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-lg font-bold text-green-600">{metrics.pageViews.toLocaleString()}</span>
              {getTrendIcon(metrics.trends.pageViewsChange)}
            </div>
            <div className="text-xs text-gray-500">Page Views</div>
            <div className={`text-xs ${getTrendColor(metrics.trends.pageViewsChange)}`}>
              {metrics.trends.pageViewsChange > 0 ? '+' : ''}{metrics.trends.pageViewsChange}%
            </div>
          </div>
        </div>

        {/* Session Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <MousePointer className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-bold text-purple-600">{metrics.totalSessions.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-600">Total Sessions</div>
            <div className={`text-xs ${getTrendColor(metrics.trends.sessionsChange)}`}>
              {metrics.trends.sessionsChange > 0 ? '+' : ''}{metrics.trends.sessionsChange}%
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-bold text-orange-600">{formatDuration(metrics.avgSessionDuration)}</span>
            </div>
            <div className="text-xs text-gray-600">Avg Duration</div>
            <div className="text-xs text-gray-500">Bounce: {metrics.bounceRate}%</div>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">New Users</span>
            </div>
            <span className="text-sm font-medium text-blue-900">{metrics.newUsers.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-800">Returning Users</span>
            </div>
            <span className="text-sm font-medium text-green-900">{metrics.returningUsers.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Traffic Sources */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Top Traffic Sources</h4>
          {metrics.trafficSources.slice(0, 3).map((source, index) => (
            <div key={source.source} className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Globe className="h-3 w-3 text-gray-400" />
                <span className="text-sm text-gray-700">{source.source}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{source.percentage}%</span>
                <Badge variant="info" size="sm">{source.sessions}</Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Conversion Rate: {metrics.conversionRate}%</span>
            <span className="text-purple-600 hover:text-purple-800 cursor-pointer">Full Analytics →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsOverviewCard;