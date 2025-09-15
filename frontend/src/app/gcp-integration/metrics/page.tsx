'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Server, Database, Cloud } from 'lucide-react';
import { GCPMetric, GCPMetricType, GCPServiceType, GCPResourceCountsResponse } from '@/types';
import { gcpService } from '@/lib/services/gcp';

interface MetricCard {
  id: string;
  title: string;
  value: string;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  serviceType: GCPServiceType;
  metricType: GCPMetricType;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<GCPMetric[]>([]);
  const [resourceCounts, setResourceCounts] = useState<GCPResourceCountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  useEffect(() => {
    fetchMetrics();
  }, [selectedTimeRange]);

  const getResourceCount = (serviceType: GCPServiceType): number => {
    if (!resourceCounts?.resource_counts) return 0;
    const resourceCount = resourceCounts.resource_counts.find(rc => rc.service_type === serviceType);
    return resourceCount?.count || 0;
  };

  const getServiceIcon = (serviceType: GCPServiceType) => {
    const iconMap: Record<string, any> = {
      [GCPServiceType.COMPUTE_ENGINE]: Server,
      [GCPServiceType.APP_ENGINE]: Cloud,
      [GCPServiceType.KUBERNETES_ENGINE]: Server,
      [GCPServiceType.CLOUD_FUNCTIONS]: Activity,
      [GCPServiceType.CLOUD_RUN]: Activity,
      [GCPServiceType.CLOUD_STORAGE]: Database,
      [GCPServiceType.FILE_STORE]: Database,
      [GCPServiceType.CLOUD_SQL]: Database,
      [GCPServiceType.FIREBASE_DATABASE]: Database,
      [GCPServiceType.REDIS]: Database,
      [GCPServiceType.SPANNER]: Database,
    };
    return iconMap[serviceType] || Server;
  };

  const getServiceDisplayName = (serviceType: GCPServiceType): string => {
    const nameMap: Record<string, string> = {
      [GCPServiceType.COMPUTE_ENGINE]: 'Compute Engine',
      [GCPServiceType.APP_ENGINE]: 'App Engine',
      [GCPServiceType.KUBERNETES_ENGINE]: 'Kubernetes Engine',
      [GCPServiceType.CLOUD_FUNCTIONS]: 'Cloud Functions',
      [GCPServiceType.CLOUD_RUN]: 'Cloud Run',
      [GCPServiceType.CLOUD_STORAGE]: 'Cloud Storage',
      [GCPServiceType.FILE_STORE]: 'Filestore',
      [GCPServiceType.CLOUD_SQL]: 'Cloud SQL',
      [GCPServiceType.FIREBASE_DATABASE]: 'Firebase Database',
      [GCPServiceType.REDIS]: 'Redis',
      [GCPServiceType.SPANNER]: 'Spanner',
    };
    return nameMap[serviceType] || serviceType;
  };

  const triggerMetricCollection = async () => {
    try {
      setCollecting(true);
      setCollectionMessage(null);
      
      const result = await gcpService.triggerMetricCollection();
      setCollectionMessage(result.message);
      
      // Wait a few seconds then refresh metrics
      setTimeout(() => {
        fetchMetrics();
        setCollectionMessage(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error triggering metric collection:', error);
      setCollectionMessage('Failed to trigger metric collection');
    } finally {
      setCollecting(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both metrics and resource counts
      const [realMetrics, counts] = await Promise.all([
        gcpService.getMetrics(),
        gcpService.getResourceCounts()
      ]);
      
      setMetrics(realMetrics);
      setResourceCounts(counts);
      
      // If no real metrics available and we have resources, suggest triggering collection
      if (realMetrics.length === 0 && counts.total_resources > 0) {
        setCollectionMessage('No metrics data found. Click "Collect Metrics" to start gathering real-time data from your GCP resources.');
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to fetch metrics data');
    } finally {
      setLoading(false);
    }
  };

  const getMetricCards = (): MetricCard[] => {
    if (!metrics || metrics.length === 0) {
      // Return empty array if no real metrics available
      return [];
    }

    // Group metrics by type and calculate aggregated values
    const metricGroups = metrics.reduce((acc, metric) => {
      const key = metric.metric_type;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(metric);
      return acc;
    }, {} as Record<string, typeof metrics>);

    const cards: MetricCard[] = [];
    let cardId = 1;

    // Process each metric type
    Object.entries(metricGroups).forEach(([metricType, metricList]) => {
      if (metricList.length === 0) return;

      // Get the latest metric value
      const latestMetric = metricList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      // Calculate average value for the metric type
      const avgValue = metricList.reduce((sum, m) => sum + m.value, 0) / metricList.length;
      
      // Calculate trend (compare latest vs average)
      const change = metricList.length > 1 ? 
        ((latestMetric.value - avgValue) / avgValue) * 100 : 0;
      
      const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';

      // Format value based on metric type
      let formattedValue: string;
      let unit: string;
      let title: string;
      let serviceType: GCPServiceType;

      switch (metricType) {
        case 'cpu_utilization':
          title = 'CPU Usage';
          formattedValue = (latestMetric.value * 100).toFixed(1);
          unit = '%';
          serviceType = GCPServiceType.COMPUTE_ENGINE;
          break;
        case 'memory_utilization':
          title = 'Memory';
          formattedValue = (latestMetric.value * 100).toFixed(1);
          unit = '%';
          serviceType = GCPServiceType.COMPUTE_ENGINE;
          break;
        case 'disk_io_read':
        case 'disk_io_write':
          title = 'Disk I/O';
          formattedValue = (latestMetric.value / (1024 * 1024)).toFixed(1); // Convert to MB
          unit = 'MB/s';
          serviceType = GCPServiceType.COMPUTE_ENGINE;
          break;
        case 'network_in':
        case 'network_out':
          title = 'Network';
          formattedValue = (latestMetric.value / (1024 * 1024)).toFixed(1); // Convert to MB
          unit = 'MB/s';
          serviceType = GCPServiceType.COMPUTE_ENGINE;
          break;
        case 'request_count':
          title = 'Requests';
          formattedValue = latestMetric.value >= 1000 ? 
            `${(latestMetric.value / 1000).toFixed(2)}K` : 
            latestMetric.value.toString();
          unit = '/min';
          serviceType = GCPServiceType.CLOUD_LOAD_BALANCER;
          break;
        case 'error_rate':
          title = 'Error Rate';
          formattedValue = (latestMetric.value * 100).toFixed(1);
          unit = '%';
          serviceType = GCPServiceType.CLOUD_LOAD_BALANCER;
          break;
        case 'latency':
          title = 'Latency';
          formattedValue = latestMetric.value.toFixed(0);
          unit = 'ms';
          serviceType = GCPServiceType.CLOUD_LOAD_BALANCER;
          break;
        case 'storage_usage':
          title = 'Storage';
          formattedValue = (latestMetric.value / (1024 * 1024 * 1024 * 1024)).toFixed(1); // Convert to TB
          unit = 'TB';
          serviceType = GCPServiceType.CLOUD_STORAGE;
          break;
        default:
          title = latestMetric.metric_name || metricType;
          formattedValue = latestMetric.value.toFixed(2);
          unit = latestMetric.unit || '';
          serviceType = GCPServiceType.COMPUTE_ENGINE;
      }

      cards.push({
        id: cardId.toString(),
        title,
        value: formattedValue,
        unit,
        change: Math.abs(change),
        trend,
        serviceType,
        metricType: metricType as GCPMetricType
      });

      cardId++;
    });

    return cards;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', metricType: GCPMetricType) => {
    if (trend === 'stable') return 'text-gray-500';
    
    // For error rate, up is bad (red), down is good (green)
    if (metricType === GCPMetricType.ERROR_RATE) {
      return trend === 'up' ? 'text-red-500' : 'text-green-500';
    }
    
    // For most other metrics, up is good (green), down is bad (red)
    return trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ];

  return (
    <Layout fullHeight={true}>
      <div className="h-full px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              GCP Metrics
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Monitor performance metrics across your Google Cloud Platform resources
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={selectedTimeRange === range.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedTimeRange(range.value)}
                  className={selectedTimeRange === range.value ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <Button
              onClick={triggerMetricCollection}
              disabled={collecting}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {collecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              {collecting ? 'Collecting...' : 'Collect Metrics'}
            </Button>
            <Button
              onClick={fetchMetrics}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Collection Message */}
        {collectionMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800">{collectionMessage}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading metrics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-lg font-medium">Error Loading Metrics</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
            <Button onClick={fetchMetrics} className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {getMetricCards().map((metric) => (
                <Card key={metric.id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-800 truncate">
                        {metric.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs px-1 py-0.5">
                        {metric.serviceType.split('_')[0]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="space-y-2">
                      <div className="flex items-baseline space-x-1">
                        <span className="text-xl font-bold text-gray-900">
                          {metric.value}
                        </span>
                        <span className="text-xs text-gray-500">
                          {metric.unit}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className={`flex items-center space-x-1 ${getTrendColor(metric.trend, metric.metricType)}`}>
                          {getTrendIcon(metric.trend)}
                          <span className="text-xs font-medium">
                            {metric.change > 0 ? '+' : ''}{metric.change}%
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          vs {selectedTimeRange}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Service-specific Metrics - Dynamic based on actual resources */}
            {resourceCounts && resourceCounts.resource_counts.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {resourceCounts.resource_counts
                  .filter(rc => rc.count > 0)
                  .slice(0, 8) // Limit to 8 services for better layout
                  .map((resourceCount, index) => {
                    const IconComponent = getServiceIcon(resourceCount.service_type);
                    const serviceName = getServiceDisplayName(resourceCount.service_type);
                    const colors = [
                      'from-green-50 to-green-100 border-green-200 text-green-800',
                      'from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-800',
                      'from-orange-50 to-orange-100 border-orange-200 text-orange-800',
                      'from-purple-50 to-purple-100 border-purple-200 text-purple-800',
                      'from-blue-50 to-blue-100 border-blue-200 text-blue-800',
                      'from-red-50 to-red-100 border-red-200 text-red-800',
                      'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800',
                      'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800'
                    ];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <Card key={resourceCount.service_type} className={`bg-gradient-to-br ${colorClass}`}>
                        <CardHeader className="pb-2 px-3 pt-3">
                          <h2 className="text-sm font-semibold flex items-center">
                            <div className={`w-5 h-5 rounded flex items-center justify-center mr-2 ${colorClass.includes('green') ? 'bg-green-500' : colorClass.includes('cyan') ? 'bg-cyan-500' : colorClass.includes('orange') ? 'bg-orange-500' : colorClass.includes('purple') ? 'bg-purple-500' : colorClass.includes('blue') ? 'bg-blue-500' : colorClass.includes('red') ? 'bg-red-500' : colorClass.includes('yellow') ? 'bg-yellow-500' : 'bg-indigo-500'}`}>
                              <IconComponent className="w-3 h-3 text-white" />
                            </div>
                            {serviceName}
                          </h2>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs opacity-80">Resources</span>
                              <span className="text-sm font-semibold">{resourceCount.count}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs opacity-80">Status</span>
                              <span className="text-sm font-semibold">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs opacity-80">Monitoring</span>
                              <span className="text-sm font-semibold">Enabled</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
            
            {/* Show message if no resources available */}
            {(!resourceCounts || resourceCounts.resource_counts.length === 0) && (
              <div className="text-center py-8">
                <p className="text-gray-500">No GCP resources found. Please configure your GCP credentials and discover resources first.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}