'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Wifi, TrendingUp, TrendingDown, Zap, Router, Signal } from 'lucide-react';

interface NetworkMetrics {
  totalBandwidth: number;
  usedBandwidth: number;
  packetsPerSecond: number;
  latency: number;
  jitter: number;
  packetLoss: number;
  activeConnections: number;
  throughput: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

const NetworkPerformanceCard = () => {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetworkMetrics = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call
        const mockMetrics: NetworkMetrics = {
          totalBandwidth: 1000, // Mbps
          usedBandwidth: 342,
          packetsPerSecond: 15420,
          latency: 12, // ms
          jitter: 2.1, // ms
          packetLoss: 0.02, // %
          activeConnections: 1247,
          throughput: 85.6, // %
          networkHealth: 'excellent'
        };
        setMetrics(mockMetrics);
      } catch (err) {
        setError('Failed to load network metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchNetworkMetrics();
    const interval = setInterval(fetchNetworkMetrics, 5000); // Update every 5 seconds
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

  if (error || !metrics) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
        <div className="text-center py-4">
          <Wifi className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm">{error || 'Unable to load network data'}</p>
        </div>
      </Card>
    );
  }

  const bandwidthUsage = (metrics.usedBandwidth / metrics.totalBandwidth) * 100;
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBandwidthColor = (usage: number) => {
    if (usage < 60) return 'text-green-600';
    if (usage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="bg-gradient-to-br from-white to-cyan-50/30 rounded-lg shadow-sm border border-cyan-100 p-4 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Network Performance</h3>
              <p className="text-sm text-gray-500">Real-time traffic analysis</p>
            </div>
          </div>
          <Badge className={`${getHealthColor(metrics.networkHealth)} border font-medium px-3 py-1 capitalize`}>
            {metrics.networkHealth}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Bandwidth Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Bandwidth Usage</span>
            <span className={`text-sm font-bold ${getBandwidthColor(bandwidthUsage)}`}>
              {metrics.usedBandwidth} / {metrics.totalBandwidth} Mbps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                bandwidthUsage < 60 ? 'bg-green-500' : 
                bandwidthUsage < 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(bandwidthUsage, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 text-right">{bandwidthUsage.toFixed(1)}% utilized</div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center justify-center mb-1">
              <Signal className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-lg font-bold text-green-600">{metrics.latency}ms</span>
            </div>
            <div className="text-xs text-gray-500">Latency</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-lg font-bold text-blue-600">{metrics.throughput}%</span>
            </div>
            <div className="text-xs text-gray-500">Throughput</div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Router className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Active Connections</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{metrics.activeConnections.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Packets/sec</span>
            </div>
            <span className="text-sm font-medium text-gray-900">{metrics.packetsPerSecond.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Packet Loss</span>
            </div>
            <span className={`text-sm font-medium ${
              metrics.packetLoss < 0.1 ? 'text-green-600' : 
              metrics.packetLoss < 1 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.packetLoss}%
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Jitter: {metrics.jitter}ms</span>
            <span className="text-cyan-600 hover:text-cyan-800 cursor-pointer">Network Details →</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkPerformanceCard;