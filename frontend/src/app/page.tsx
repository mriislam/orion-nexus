'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useDashboardStore, useDeviceStore, useSSLStore, useUptimeStore } from '@/store';
import { apiClient } from '@/lib/api-client';
import { formatPercentage, getStatusColor, formatTimeAgo } from '@/lib/utils';
import DeviceStatus from '@/components/dashboard/DeviceStatus';
import SSLMonitoring from '@/components/dashboard/SSLMonitoring';
import RealtimeAnalytics from '@/components/dashboard/RealtimeAnalytics';
import NetworkTrafficChart from '@/components/dashboard/NetworkTrafficChart';
import dynamic from 'next/dynamic';

// Dynamically import FirebaseAnalyticsRail to prevent SSR issues
const FirebaseAnalyticsRail = dynamic(
  () => import('@/components/analytics/FirebaseAnalyticsRail'),
  { ssr: false }
);
import UptimeOverviewCard from '@/components/dashboard/UptimeOverviewCard';
import NetworkPerformanceCard from '@/components/dashboard/NetworkPerformanceCard';
import SystemAlertsCard from '@/components/dashboard/SystemAlertsCard';
import AnalyticsOverviewCard from '@/components/dashboard/AnalyticsOverviewCard';
import { dashboardService } from '@/lib/services/dashboard';
import {
  Server,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Globe,
  Zap,
  Eye,
  Users
} from 'lucide-react';

// Dashboard Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'yellow';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, subtitle, icon: Icon, color, trend }: StatsCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
          icon: 'bg-blue-500 text-white',
          text: 'text-blue-600',
          border: 'border-blue-200'
        };
      case 'green':
        return {
          bg: 'bg-gradient-to-br from-green-50 to-green-100',
          icon: 'bg-green-500 text-white',
          text: 'text-green-600',
          border: 'border-green-200'
        };
      case 'yellow':
        return {
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
          icon: 'bg-yellow-500 text-white',
          text: 'text-yellow-600',
          border: 'border-yellow-200'
        };
      case 'red':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-red-100',
          icon: 'bg-red-500 text-white',
          text: 'text-red-600',
          border: 'border-red-200'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
          icon: 'bg-gray-500 text-white',
          text: 'text-gray-600',
          border: 'border-gray-200'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className={`${colorClasses.bg} rounded-lg shadow-sm border ${colorClasses.border} p-4 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses.icon} shadow-sm`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
            trend.isPositive 
              ? 'text-green-700 bg-green-100' 
              : 'text-red-700 bg-red-100'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-2.5 h-2.5 mr-1" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5 mr-1" />
            )}
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <h3 className="text-xs font-semibold text-gray-700 mb-1">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-600">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// Recent Alerts Component
function RecentAlerts() {
  const [alerts, setAlerts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const recentAlerts = await dashboardService.getRecentAlerts(5);
        setAlerts(recentAlerts);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
        setError('Failed to load alerts');
        // Fallback to empty array on error
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
          <div className="animate-pulse h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Alerts</h3>
        <div className="text-center py-8">
          <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-gray-600 font-medium mb-2">Unable to load alerts</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{alerts.length} alerts</span>
          {alerts.length === 0 && (
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>
      </div>
      
      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h4>
          <p className="text-gray-600 mb-1">No recent alerts to display</p>
          <p className="text-sm text-gray-500">Your infrastructure is running smoothly</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.slice(0, 5).map((alert: any) => {
            const getAlertIcon = (type: string) => {
              switch (type) {
                case 'error':
                  return <XCircle className="w-5 h-5 text-red-500" />;
                case 'warning':
                  return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
                case 'info':
                  return <CheckCircle className="w-5 h-5 text-blue-500" />;
                default:
                  return <Clock className="w-5 h-5 text-gray-500" />;
              }
            };

            return (
              <div key={alert.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-full flex-shrink-0 ${
                  alert.type === 'error' ? 'bg-red-100' :
                  alert.type === 'warning' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                      alert.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {alert.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {alerts.length > 5 && (
            <div className="text-center pt-4">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all {alerts.length} alerts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// System Status Component
function SystemStatus() {
  const [systemHealth, setSystemHealth] = React.useState({
    api_server: { status: 'operational', uptime: 99.9, response_time: 45 },
    database: { status: 'operational', uptime: 99.8, response_time: 12 },
    redis_cache: { status: 'operational', uptime: 99.9, response_time: 3 },
    monitoring_service: { status: 'operational', uptime: 99.7, response_time: 28 },
    ssl_checker: { status: 'operational', uptime: 99.5, response_time: 156 }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const services = [
    { key: 'api_server', name: 'API Server', ...systemHealth.api_server },
    { key: 'database', name: 'Database', ...systemHealth.database },
    { key: 'redis_cache', name: 'Redis Cache', ...systemHealth.redis_cache },
    { key: 'monitoring_service', name: 'Monitoring Service', ...systemHealth.monitoring_service },
    { key: 'ssl_checker', name: 'SSL Checker', ...systemHealth.ssl_checker }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
        </div>
      </div>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              {getStatusIcon(service.status)}
              <div>
                <span className="font-medium text-gray-900">{service.name}</span>
                <div className="text-xs text-gray-500">{service.response_time}ms avg response</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{service.uptime}%</div>
                <div className="text-xs text-gray-500">uptime</div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(service.status)}`}>
                {service.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { stats, loading, error, setLoading, setError, setStats } = useDashboardStore();
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch real dashboard statistics from API
        const dashboardStats = await dashboardService.getStats();
        setStats(dashboardStats);
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to fetch dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set initial time and update every second
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString());
    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [setLoading, setError, setStats]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <FirebaseAnalyticsRail />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Infrastructure Dashboard</h1>
              <p className="text-blue-100 text-sm">Real-time monitoring and analytics for your network infrastructure</p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-200">Live monitoring active</span>
                </div>
                <div className="text-xs text-blue-200">
                  Last updated: {currentTime}
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-xl font-bold">{stats?.total_devices || 0}</div>
                <div className="text-xs text-blue-200">Total Devices</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Network Devices"
            value={stats?.total_devices || 0}
            subtitle={`${stats?.active_devices || 0} online • ${stats?.devices_down || 0} offline`}
            icon={Server}
            color="blue"
            trend={{ value: 2.1, isPositive: true }}
          />
          <StatsCard
            title="SSL Certificates"
            value={stats?.total_ssl_checks || 0}
            subtitle={`${stats?.ssl_expiring_soon || 0} expiring • ${stats?.ssl_expired || 0} expired`}
            icon={Shield}
            color={(stats?.ssl_expired || 0) > 0 ? "red" : (stats?.ssl_expiring_soon || 0) > 0 ? "yellow" : "green"}
            trend={{ value: 1.2, isPositive: false }}
          />
          <StatsCard
            title="Service Monitors"
            value={stats?.total_uptime_checks || 0}
            subtitle={`${(stats?.total_uptime_checks || 0) - (stats?.uptime_checks_down || 0)} healthy • ${stats?.uptime_checks_down || 0} down`}
            icon={Activity}
            color={(stats?.uptime_checks_down || 0) > 0 ? "red" : "green"}
            trend={{ value: 0.5, isPositive: true }}
          />
          <StatsCard
            title="System Uptime"
            value={`${stats?.avg_uptime_percentage || 0}%`}
            subtitle="30-day average"
            icon={CheckCircle}
            color={(stats?.avg_uptime_percentage || 0) >= 99 ? "green" : (stats?.avg_uptime_percentage || 0) >= 95 ? "yellow" : "red"}
            trend={{ value: 0.3, isPositive: true }}
          />
        </div>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">+5.2%</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Network Performance</h3>
            <p className="text-xs text-gray-600 mb-2">Average response time improved this week</p>
            <div className="text-xl font-bold text-green-600">98.7%</div>
            <div className="text-xs text-gray-500">Optimal performance</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Live</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Active Monitoring</h3>
            <p className="text-xs text-gray-600 mb-2">Real-time checks running</p>
            <div className="text-xl font-bold text-blue-600">{(stats?.total_devices || 0) + (stats?.total_ssl_checks || 0) + (stats?.total_uptime_checks || 0)}</div>
            <div className="text-xs text-gray-500">Total monitors</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">24/7</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Alert System</h3>
            <p className="text-xs text-gray-600 mb-2">Proactive issue detection</p>
            <div className="text-xl font-bold text-purple-600">0</div>
            <div className="text-xs text-gray-500">Critical alerts</div>
          </div>
        </div>

        {/* Real-time Analytics */}
        <div className="mb-6">
          <RealtimeAnalytics />
        </div>

        {/* Network Traffic Chart */}
        <div className="mb-6">
          <NetworkTrafficChart />
        </div>

        {/* Enhanced Monitoring Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
          <DeviceStatus />
          <SSLMonitoring />
          <UptimeOverviewCard />
          <NetworkPerformanceCard />
          <SystemAlertsCard />
          <AnalyticsOverviewCard />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Recent Alerts */}
          <RecentAlerts />
          
          {/* System Status */}
          <SystemStatus />
        </div>
      </div>
    </Layout>
  );
}
