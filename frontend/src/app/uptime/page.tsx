'use client';

import React, { useState, useEffect } from 'react';
import { uptimeService, UptimeMonitor as ApiUptimeMonitor } from '@/lib/services/uptime';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Activity,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Zap,
  Timer,
  Trash2,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewDetailsModal, EditMonitorModal, DeleteConfirmationModal } from '@/components/uptime/UptimeModals';

// Map API monitor to display format
interface UptimeMonitor {
  id: string;
  name: string;
  url: string;
  type: 'http' | 'https' | 'tcp' | 'ping' | 'dns';
  status: 'up' | 'down' | 'degraded' | 'maintenance';
  uptime: number;
  responseTime: number;
  lastCheck: string;
  nextCheck: string;
  interval: number;
  timeout: number;
  retries: number;
  locations: string[];
  incidents: number;
  downtimeToday: number;
  avgResponseTime24h: number;
  uptimeHistory: { timestamp: string; status: 'up' | 'down' | 'degraded' }[];
  alertsEnabled: boolean;
  maintenanceMode: boolean;
}

// Helper function to map API monitor to display format
const mapApiMonitorToDisplay = (apiMonitor: ApiUptimeMonitor): UptimeMonitor => {
  // Determine type based on URL
  let type: 'http' | 'https' | 'tcp' | 'ping' | 'dns' = 'http';
  if (apiMonitor.url.startsWith('https://')) type = 'https';
  else if (apiMonitor.url.includes(':') && !apiMonitor.url.startsWith('http')) type = 'tcp';
  
  return {
    id: apiMonitor.id,
    name: apiMonitor.name,
    url: apiMonitor.url,
    type,
    status: apiMonitor.current_status || 'down',
    uptime: apiMonitor.uptime_percentage || 0,
    responseTime: apiMonitor.avg_response_time || 0,
    lastCheck: apiMonitor.last_check_at || new Date().toISOString(),
    nextCheck: new Date(Date.now() + (apiMonitor.check_interval * 1000)).toISOString(),
    interval: apiMonitor.check_interval,
    timeout: apiMonitor.timeout,
    retries: apiMonitor.max_retries,
    locations: apiMonitor.locations,
    incidents: 0, // Would need separate API call
    downtimeToday: 0, // Would need calculation from stats
    avgResponseTime24h: apiMonitor.avg_response_time || 0,
    uptimeHistory: [], // Would need separate API call for results
    alertsEnabled: apiMonitor.alert_on_failure,
    maintenanceMode: !apiMonitor.is_active
  };
};

const mockMonitors: UptimeMonitor[] = [
  {
    id: '1',
    name: 'Main Website',
    url: 'https://example.com',
    type: 'https',
    status: 'up',
    uptime: 99.95,
    responseTime: 245,
    lastCheck: '2024-02-15T10:30:00Z',
    nextCheck: '2024-02-15T10:35:00Z',
    interval: 300,
    timeout: 30,
    retries: 3,
    locations: ['US East', 'EU West', 'Asia Pacific'],
    incidents: 2,
    downtimeToday: 0,
    avgResponseTime24h: 267,
    uptimeHistory: [
      { timestamp: '2024-02-15T10:25:00Z', status: 'up' },
      { timestamp: '2024-02-15T10:20:00Z', status: 'up' },
      { timestamp: '2024-02-15T10:15:00Z', status: 'up' }
    ],
    alertsEnabled: true,
    maintenanceMode: false
  },
  {
    id: '2',
    name: 'API Gateway',
    url: 'https://api.example.com/health',
    type: 'https',
    status: 'up',
    uptime: 99.87,
    responseTime: 156,
    lastCheck: '2024-02-15T10:29:45Z',
    nextCheck: '2024-02-15T10:34:45Z',
    interval: 300,
    timeout: 15,
    retries: 2,
    locations: ['US East', 'EU West'],
    incidents: 5,
    downtimeToday: 0,
    avgResponseTime24h: 178,
    uptimeHistory: [
      { timestamp: '2024-02-15T10:24:45Z', status: 'up' },
      { timestamp: '2024-02-15T10:19:45Z', status: 'up' },
      { timestamp: '2024-02-15T10:14:45Z', status: 'degraded' }
    ],
    alertsEnabled: true,
    maintenanceMode: false
  },
  {
    id: '3',
    name: 'Database Server',
    url: 'db.internal.com:5432',
    type: 'tcp',
    status: 'degraded',
    uptime: 98.45,
    responseTime: 1250,
    lastCheck: '2024-02-15T10:30:15Z',
    nextCheck: '2024-02-15T10:32:15Z',
    interval: 120,
    timeout: 10,
    retries: 3,
    locations: ['US East'],
    incidents: 12,
    downtimeToday: 45,
    avgResponseTime24h: 890,
    uptimeHistory: [
      { timestamp: '2024-02-15T10:28:15Z', status: 'degraded' },
      { timestamp: '2024-02-15T10:26:15Z', status: 'degraded' },
      { timestamp: '2024-02-15T10:24:15Z', status: 'up' }
    ],
    alertsEnabled: true,
    maintenanceMode: false
  },
  {
    id: '4',
    name: 'Legacy System',
    url: 'legacy.example.com',
    type: 'ping',
    status: 'down',
    uptime: 85.23,
    responseTime: 0,
    lastCheck: '2024-02-15T10:29:30Z',
    nextCheck: '2024-02-15T10:34:30Z',
    interval: 300,
    timeout: 30,
    retries: 5,
    locations: ['US East', 'EU West'],
    incidents: 45,
    downtimeToday: 180,
    avgResponseTime24h: 0,
    uptimeHistory: [
      { timestamp: '2024-02-15T10:24:30Z', status: 'down' },
      { timestamp: '2024-02-15T10:19:30Z', status: 'down' },
      { timestamp: '2024-02-15T10:14:30Z', status: 'down' }
    ],
    alertsEnabled: true,
    maintenanceMode: false
  },
  {
    id: '5',
    name: 'CDN Endpoint',
    url: 'https://cdn.example.com',
    type: 'https',
    status: 'maintenance',
    uptime: 99.12,
    responseTime: 89,
    lastCheck: '2024-02-15T10:25:00Z',
    nextCheck: '2024-02-15T11:00:00Z',
    interval: 300,
    timeout: 20,
    retries: 2,
    locations: ['Global'],
    incidents: 8,
    downtimeToday: 0,
    avgResponseTime24h: 95,
    uptimeHistory: [
      { timestamp: '2024-02-15T10:20:00Z', status: 'up' },
      { timestamp: '2024-02-15T10:15:00Z', status: 'up' },
      { timestamp: '2024-02-15T10:10:00Z', status: 'up' }
    ],
    alertsEnabled: false,
    maintenanceMode: true
  }
];

const getStatusIcon = (status: UptimeMonitor['status']) => {
  switch (status) {
    case 'up':
      return CheckCircle;
    case 'down':
      return XCircle;
    case 'degraded':
      return AlertTriangle;
    case 'maintenance':
      return Clock;
    default:
      return XCircle;
  }
};

const getStatusColor = (status: UptimeMonitor['status']) => {
  switch (status) {
    case 'up':
      return 'success';
    case 'down':
      return 'danger';
    case 'degraded':
      return 'warning';
    case 'maintenance':
      return 'info';
    default:
      return 'secondary';
  }
};

const getUptimeColor = (uptime: number) => {
  if (uptime >= 99.9) return 'text-green-600';
  if (uptime >= 99.0) return 'text-yellow-600';
  if (uptime >= 95.0) return 'text-orange-600';
  return 'text-red-600';
};

const getResponseTimeColor = (responseTime: number, avgResponseTime: number) => {
  if (responseTime === 0) return 'text-red-600';
  if (responseTime <= avgResponseTime * 1.2) return 'text-green-600';
  if (responseTime <= avgResponseTime * 2) return 'text-yellow-600';
  return 'text-red-600';
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

export default function UptimePage() {
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    url: '',
    type: 'https' as 'http' | 'https' | 'tcp' | 'ping' | 'dns',
    check_interval: 300,
    timeout: 30,
    retries: 3,
    alert_threshold: 3,
    tags: [] as string[]
  });

  // Modal states
  const [selectedMonitor, setSelectedMonitor] = useState<ApiUptimeMonitor | null>(null);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTestingMonitor, setIsTestingMonitor] = useState<string | null>(null);

  // Load monitors on component mount
  useEffect(() => {
    loadMonitors();
  }, []);

  // Handle add monitor form submission
  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    
    try {
      await uptimeService.createMonitor(addFormData);
      setShowAddForm(false);
      setAddFormData({
        name: '',
        url: '',
        type: 'https',
        check_interval: 300,
        timeout: 30,
        retries: 3,
        alert_threshold: 3,
        tags: []
      });
      await loadMonitors(); // Refresh the list
    } catch (err) {
      console.error('Failed to create monitor:', err);
      setError('Failed to create monitor. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  // Modal handlers
  const handleViewDetails = (monitor: ApiUptimeMonitor) => {
    setSelectedMonitor(monitor);
    setShowViewDetails(true);
  };

  const handleEditMonitor = (monitor: ApiUptimeMonitor) => {
    setSelectedMonitor(monitor);
    setShowEditModal(true);
  };

  const handleDeleteMonitor = (monitor: ApiUptimeMonitor) => {
    setSelectedMonitor(monitor);
    setShowDeleteModal(true);
  };

  const handleTestNow = async (monitor: ApiUptimeMonitor) => {
    setIsTestingMonitor(monitor.id);
    try {
      await uptimeService.testMonitor(monitor.id);
      showToast('Monitor test initiated successfully', 'success');
      // Refresh monitors after a short delay to see updated results
      setTimeout(() => {
        loadMonitors();
      }, 2000);
    } catch (error) {
      console.error('Failed to test monitor:', error);
      showToast('Failed to test monitor. Please try again.', 'error');
    } finally {
      setIsTestingMonitor(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  const loadMonitors = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiMonitors = await uptimeService.getMonitors();
      const displayMonitors = apiMonitors.map(mapApiMonitorToDisplay);
      setMonitors(displayMonitors);
    } catch (err) {
      console.error('Failed to load monitors:', err);
      setError('Failed to load uptime monitors');
      setMonitors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMonitors = monitors.filter(monitor => {
    const matchesSearch = monitor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         monitor.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || monitor.status === filterStatus;
    const matchesType = filterType === 'all' || monitor.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMonitors();
    setIsRefreshing(false);
  };

  const monitorStats = {
    total: monitors.length,
    up: monitors.filter(m => m.status === 'up').length,
    down: monitors.filter(m => m.status === 'down').length,
    degraded: monitors.filter(m => m.status === 'degraded').length,
    maintenance: monitors.filter(m => m.status === 'maintenance').length,
    avgUptime: monitors.reduce((acc, m) => acc + m.uptime, 0) / monitors.length,
    avgResponseTime: monitors.filter(m => m.responseTime > 0).reduce((acc, m) => acc + m.responseTime, 0) / monitors.filter(m => m.responseTime > 0).length
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading uptime monitors...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Uptime Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor service availability and response times
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Monitor
          </Button>
        </div>
      </div>

      {/* Add Monitor Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add New Monitor
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure a new uptime monitor for your service
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMonitor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monitor Name
                  </label>
                  <input
                    type="text"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="My Website"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL/Endpoint
                  </label>
                  <input
                    type="text"
                    value={addFormData.url}
                    onChange={(e) => setAddFormData({ ...addFormData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monitor Type
                  </label>
                  <select
                    value={addFormData.type}
                    onChange={(e) => setAddFormData({ ...addFormData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="https">HTTPS</option>
                    <option value="http">HTTP</option>
                    <option value="tcp">TCP</option>
                    <option value="ping">Ping</option>
                    <option value="dns">DNS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={addFormData.check_interval}
                    onChange={(e) => setAddFormData({ ...addFormData, check_interval: parseInt(e.target.value) || 300 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="60"
                    max="3600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={addFormData.timeout}
                    onChange={(e) => setAddFormData({ ...addFormData, timeout: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="5"
                    max="120"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Retries
                  </label>
                  <input
                    type="number"
                    value={addFormData.retries}
                    onChange={(e) => setAddFormData({ ...addFormData, retries: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button type="submit" variant="primary" disabled={isAdding}>
                  {isAdding ? 'Creating...' : 'Create Monitor'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddFormData({
                      name: '',
                      url: '',
                      type: 'https',
                      check_interval: 300,
                      timeout: 30,
                      retries: 3,
                      alert_threshold: 3,
                      tags: []
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monitorStats.total}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Up</p>
                <p className="text-2xl font-bold text-green-600">
                  {monitorStats.up}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Down</p>
                <p className="text-2xl font-bold text-red-600">
                  {monitorStats.down}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {monitorStats.degraded}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Uptime</p>
                <p className={cn('text-2xl font-bold', getUptimeColor(monitorStats.avgUptime))}>
                  {monitorStats.avgUptime.toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(monitorStats.avgResponseTime)}ms
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search monitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="up">Up</option>
                <option value="down">Down</option>
                <option value="degraded">Degraded</option>
                <option value="maintenance">Maintenance</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
                <option value="ping">Ping</option>
                <option value="dns">DNS</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitors List */}
      <div className="space-y-4">
        {filteredMonitors.map((monitor) => {
          const StatusIcon = getStatusIcon(monitor.status);
          
          return (
            <Card key={monitor.id} className="hover:shadow-md transition-all duration-200 border-l-4" style={{
              borderLeftColor: monitor.status === 'up' ? '#10b981' : 
                              monitor.status === 'degraded' ? '#f59e0b' : 
                              monitor.status === 'maintenance' ? '#3b82f6' : '#ef4444'
            }}>
              <CardContent className="p-4">
                {/* Compact Header Section */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={cn(
                      "p-2 rounded-md",
                      monitor.status === 'up' ? 'bg-green-50 dark:bg-green-900/20' :
                      monitor.status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      monitor.status === 'maintenance' ? 'bg-blue-50 dark:bg-blue-900/20' :
                      'bg-red-50 dark:bg-red-900/20'
                    )}>
                      <StatusIcon className={cn(
                        "w-5 h-5",
                        monitor.status === 'up' ? 'text-green-600 dark:text-green-400' :
                        monitor.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                        monitor.status === 'maintenance' ? 'text-blue-600 dark:text-blue-400' :
                        'text-red-600 dark:text-red-400'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {monitor.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">{monitor.type.toUpperCase()}</Badge>
                        {monitor.maintenanceMode && (
                          <Badge variant="info" className="text-xs">Maintenance</Badge>
                        )}
                        {monitor.alertsEnabled && (
                          <Badge variant="success" className="text-xs">Alerts</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {monitor.url}
                      </p>
                    </div>
                  </div>
                  
                  {/* Compact Status & Uptime */}
                  <div className="text-right ml-4">
                    <Badge variant={getStatusColor(monitor.status)} className="mb-1 text-xs px-2 py-1">
                      {monitor.status.toUpperCase()}
                    </Badge>
                    <div className={cn(
                      'text-right',
                      getUptimeColor(monitor.uptime)
                    )}>
                      <p className="text-xl font-bold">{monitor.uptime.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                    </div>
                  </div>
                </div>

                {/* Inline Metrics & Details */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-sm">
                  {/* Key Metrics - Inline */}
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Response</span>
                      <p className={cn(
                        'text-sm font-semibold',
                        getResponseTimeColor(monitor.responseTime, monitor.avgResponseTime24h)
                      )}>
                        {monitor.responseTime === 0 ? 'N/A' : `${monitor.responseTime}ms`}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">24h Avg</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {monitor.avgResponseTime24h === 0 ? 'N/A' : `${Math.round(monitor.avgResponseTime24h)}ms`}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Incidents</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {monitor.incidents}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Downtime</span>
                      <p className={cn(
                        'text-sm font-semibold',
                        monitor.downtimeToday > 0 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {monitor.downtimeToday === 0 ? 'None' : formatDuration(monitor.downtimeToday)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status History - Compact */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">History:</span>
                    <div className="flex space-x-1">
                      {monitor.uptimeHistory.map((entry, index) => {
                        const statusColor = entry.status === 'up' ? 'bg-green-500' :
                                          entry.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';
                        return (
                          <div
                            key={index}
                            className={cn('w-2 h-2 rounded-sm', statusColor)}
                            title={`${entry.status} at ${new Date(entry.timestamp).toLocaleString()}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Locations & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Locations:</span>
                    <div className="flex flex-wrap gap-1">
                      {monitor.locations.slice(0, 3).map((location, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                          {location}
                        </Badge>
                      ))}
                      {monitor.locations.length > 3 && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          +{monitor.locations.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Compact Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <Button 
                       variant="outline" 
                       size="sm"
                       onClick={() => {
                          const apiMonitor: ApiUptimeMonitor = {
                            id: monitor.id,
                            name: monitor.name,
                            url: monitor.url,
                            method: 'GET',
                            expected_status_code: 200,
                            check_interval: monitor.interval,
                            timeout: monitor.timeout,
                            max_retries: monitor.retries,
                            headers: {},
                            follow_redirects: true,
                            verify_ssl: true,
                            alert_on_failure: monitor.alertsEnabled,
                            alert_threshold: 3,
                            locations: monitor.locations,
                            tags: [],
                            is_active: true,
                            created_at: monitor.lastCheck,
                            updated_at: monitor.lastCheck,
                            current_status: monitor.status,
                            uptime_percentage: monitor.uptime,
                            avg_response_time: monitor.avgResponseTime24h,
                            last_check_at: monitor.lastCheck
                          };
                          handleViewDetails(apiMonitor);
                        }}
                       className="text-xs px-2 py-1"
                     >
                       <Globe className="w-3 h-3" />
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm"
                       onClick={() => {
                          const apiMonitor: ApiUptimeMonitor = {
                            id: monitor.id,
                            name: monitor.name,
                            url: monitor.url,
                            method: 'GET',
                            expected_status_code: 200,
                            check_interval: monitor.interval,
                            timeout: monitor.timeout,
                            max_retries: monitor.retries,
                            headers: {},
                            follow_redirects: true,
                            verify_ssl: true,
                            alert_on_failure: monitor.alertsEnabled,
                            alert_threshold: 3,
                            locations: monitor.locations,
                            tags: [],
                            is_active: true,
                            created_at: monitor.lastCheck,
                            updated_at: monitor.lastCheck,
                            current_status: monitor.status,
                            uptime_percentage: monitor.uptime,
                            avg_response_time: monitor.avgResponseTime24h,
                            last_check_at: monitor.lastCheck
                          };
                          handleEditMonitor(apiMonitor);
                        }}
                       className="text-xs px-2 py-1"
                     >
                       <Edit className="w-3 h-3" />
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm"
                       onClick={() => {
                          const apiMonitor: ApiUptimeMonitor = {
                            id: monitor.id,
                            name: monitor.name,
                            url: monitor.url,
                            method: 'GET',
                            expected_status_code: 200,
                            check_interval: monitor.interval,
                            timeout: monitor.timeout,
                            max_retries: monitor.retries,
                            headers: {},
                            follow_redirects: true,
                            verify_ssl: true,
                            alert_on_failure: monitor.alertsEnabled,
                            alert_threshold: 3,
                            locations: monitor.locations,
                            tags: [],
                            is_active: true,
                            created_at: monitor.lastCheck,
                            updated_at: monitor.lastCheck,
                            current_status: monitor.status,
                            uptime_percentage: monitor.uptime,
                            avg_response_time: monitor.avgResponseTime24h,
                            last_check_at: monitor.lastCheck
                          };
                          handleTestNow(apiMonitor);
                        }}
                       disabled={isTestingMonitor === monitor.id}
                       className="text-xs px-2 py-1"
                     >
                       <ExternalLink className="w-3 h-3" />
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm"
                       onClick={() => {
                          const apiMonitor: ApiUptimeMonitor = {
                            id: monitor.id,
                            name: monitor.name,
                            url: monitor.url,
                            method: 'GET',
                            expected_status_code: 200,
                            check_interval: monitor.interval,
                            timeout: monitor.timeout,
                            max_retries: monitor.retries,
                            headers: {},
                            follow_redirects: true,
                            verify_ssl: true,
                            alert_on_failure: monitor.alertsEnabled,
                            alert_threshold: 3,
                            locations: monitor.locations,
                            tags: [],
                            is_active: true,
                            created_at: monitor.lastCheck,
                            updated_at: monitor.lastCheck,
                            current_status: monitor.status,
                            uptime_percentage: monitor.uptime,
                            avg_response_time: monitor.avgResponseTime24h,
                            last_check_at: monitor.lastCheck
                          };
                          handleDeleteMonitor(apiMonitor);
                        }}
                       className="text-red-600 hover:text-red-700 hover:border-red-300 text-xs px-2 py-1"
                     >
                       <Trash2 className="w-3 h-3" />
                     </Button>
                    {monitor.status === 'down' && (
                      <Button variant="outline" size="sm" className="text-xs px-2 py-1">
                        <AlertTriangle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
           );
        })}
      </div>
      
      {filteredMonitors.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No monitors found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Modals */}
      <ViewDetailsModal
        open={showViewDetails}
        onOpenChange={setShowViewDetails}
        monitor={selectedMonitor}
      />
      <EditMonitorModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        monitor={selectedMonitor}
        onMonitorUpdated={() => {
          loadMonitors();
          showToast('Monitor updated successfully', 'success');
        }}
      />
      <DeleteConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        monitor={selectedMonitor}
        onMonitorDeleted={() => {
          loadMonitors();
          setSelectedMonitor(null);
          showToast('Monitor deleted successfully', 'success');
        }}
      />
      </div>
    </Layout>
  );
}