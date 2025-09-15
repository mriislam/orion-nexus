'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { AlertTriangle, Bell, CheckCircle, Clock, X, Eye, ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  category: 'uptime' | 'ssl' | 'device' | 'network' | 'security';
}

interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
  resolved: number;
}

const SystemAlertsCard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call
        const mockAlerts: Alert[] = [
          {
            id: '1',
            title: 'SSL Certificate Expiring',
            message: 'Certificate for api.orion-nexus.com expires in 5 days',
            severity: 'warning',
            source: 'SSL Monitor',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            status: 'active',
            category: 'ssl'
          },
          {
            id: '2',
            title: 'High Network Latency',
            message: 'Average response time increased to 850ms',
            severity: 'warning',
            source: 'Network Monitor',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            status: 'acknowledged',
            category: 'network'
          },
          {
            id: '3',
            title: 'Device Offline',
            message: 'Router-01 (192.168.1.1) is not responding',
            severity: 'critical',
            source: 'Device Monitor',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
            status: 'active',
            category: 'device'
          },
          {
            id: '4',
            title: 'Uptime Check Failed',
            message: 'https://app.orion-nexus.com returned 503 error',
            severity: 'critical',
            source: 'Uptime Monitor',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
            status: 'active',
            category: 'uptime'
          }
        ];
        
        const mockStats: AlertStats = {
          total: mockAlerts.length,
          critical: mockAlerts.filter(a => a.severity === 'critical').length,
          warning: mockAlerts.filter(a => a.severity === 'warning').length,
          info: mockAlerts.filter(a => a.severity === 'info').length,
          acknowledged: mockAlerts.filter(a => a.status === 'acknowledged').length,
          resolved: mockAlerts.filter(a => a.status === 'resolved').length
        };
        
        setAlerts(mockAlerts);
        setStats(mockStats);
      } catch (err) {
        setError('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'acknowledged': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'uptime': return '🌐';
      case 'ssl': return '🔒';
      case 'device': return '📱';
      case 'network': return '📡';
      case 'security': return '🛡️';
      default: return '⚠️';
    }
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

  if (error) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
        <div className="text-center py-4">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  const displayAlerts = showAll ? alerts : alerts.slice(0, 3);
  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <Card className="bg-gradient-to-br from-white to-red-50/20 rounded-lg shadow-sm border border-red-100 p-4 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg relative">
              <Bell className="h-5 w-5 text-white" />
              {activeAlerts.length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
              <p className="text-sm text-gray-500">{stats?.total || 0} total alerts</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeAlerts.length > 0 && (
              <Badge variant="danger" size="sm">{activeAlerts.length} Active</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alert Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-red-50 rounded-lg border border-red-200">
              <div className="text-lg font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-red-600">Critical</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-lg font-bold text-yellow-600">{stats.warning}</div>
              <div className="text-xs text-yellow-600">Warning</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="text-lg font-bold text-green-600">{stats.acknowledged}</div>
              <div className="text-xs text-green-600">Handled</div>
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        <div className="space-y-2">
          {displayAlerts.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">All systems operational</p>
              <p className="text-gray-500 text-sm">No active alerts</p>
            </div>
          ) : (
            displayAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="text-lg">{getCategoryIcon(alert.category)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{alert.title}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getSeverityColor(alert.severity)} border text-xs px-2 py-1`}>
                        {alert.severity}
                      </Badge>
                      <Badge className={`${getStatusColor(alert.status)} text-xs px-2 py-1`}>
                        {alert.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(alert.timestamp)}</span>
                      <span>•</span>
                      <span>{alert.source}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More/Less */}
        {alerts.length > 3 && (
          <div className="text-center pt-2 border-t border-gray-200">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              {showAll ? 'Show Less' : `Show All ${alerts.length} Alerts`} →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemAlertsCard;