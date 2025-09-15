'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Activity, TrendingUp, Clock, AlertTriangle, CheckCircle, Globe } from 'lucide-react';
import { uptimeService } from '@/lib/services/uptime';

interface UptimeStats {
  totalMonitors: number;
  activeMonitors: number;
  downMonitors: number;
  avgUptime: number;
  avgResponseTime: number;
  incidentsToday: number;
}

const UptimeOverviewCard = () => {
  const [stats, setStats] = useState<UptimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUptimeStats = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call
        const mockStats: UptimeStats = {
          totalMonitors: 12,
          activeMonitors: 11,
          downMonitors: 1,
          avgUptime: 99.8,
          avgResponseTime: 245,
          incidentsToday: 2
        };
        setStats(mockStats);
      } catch (err) {
        setError('Failed to load uptime statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchUptimeStats();
    const interval = setInterval(fetchUptimeStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

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

  if (error || !stats) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
        <div className="text-center py-4">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error || 'Unable to load uptime data'}</p>
        </div>
      </Card>
    );
  }

  const uptimeColor = stats.avgUptime >= 99.5 ? 'text-green-600' : stats.avgUptime >= 99 ? 'text-yellow-600' : 'text-red-600';
  const responseTimeColor = stats.avgResponseTime <= 200 ? 'text-green-600' : stats.avgResponseTime <= 500 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="bg-gradient-to-br from-white to-blue-50/30 rounded-lg shadow-sm border border-blue-100 p-4 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Uptime Monitoring</h3>
              <p className="text-sm text-gray-500">{stats.totalMonitors} services monitored</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className={`text-2xl font-bold ${uptimeColor}`}>{stats.avgUptime}%</div>
            <div className="text-xs text-gray-500 flex items-center justify-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Avg Uptime
            </div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className={`text-2xl font-bold ${responseTimeColor}`}>{stats.avgResponseTime}ms</div>
            <div className="text-xs text-gray-500 flex items-center justify-center mt-1">
              <Clock className="h-3 w-3 mr-1" />
              Response Time
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Online Services</span>
            </div>
            <Badge variant="success" size="sm">{stats.activeMonitors}</Badge>
          </div>
          
          {stats.downMonitors > 0 && (
            <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Services Down</span>
              </div>
              <Badge variant="danger" size="sm">{stats.downMonitors}</Badge>
            </div>
          )}
          
          {stats.incidentsToday > 0 && (
            <div className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Incidents Today</span>
              </div>
              <Badge variant="warning" size="sm">{stats.incidentsToday}</Badge>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Last updated: just now</span>
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer">View Details →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UptimeOverviewCard;