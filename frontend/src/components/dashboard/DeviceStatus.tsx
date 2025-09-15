'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Server, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import { useDeviceStore } from '@/store';
import { deviceService, Device, DeviceHealth } from '@/lib/services/device';
import { formatTimeAgo } from '@/lib/utils';

const DeviceStatus = () => {
  const { devices } = useDeviceStore();
  const [devicesWithHealth, setDevicesWithHealth] = useState<Array<Device & { health?: DeviceHealth | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const devicesData = await deviceService.getDevicesWithHealth();
        setDevicesWithHealth(devicesData);
        // Store devices in component state only
        setError(null);
      } catch (err) {
        console.error('Failed to fetch devices:', err);
        setError('Failed to load devices');
        setDevicesWithHealth([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
   }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Server className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="success" size="sm">Online</Badge>;
      case 'warning':
        return <Badge variant="warning" size="sm">Warning</Badge>;
      case 'offline':
        return <Badge variant="danger" size="sm">Offline</Badge>;
      default:
        return <Badge variant="default" size="sm">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Device Status</h3>
            <p className="text-sm text-gray-500">Loading device information...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
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
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Device Status</h3>
            <p className="text-sm text-gray-500">Unable to load devices</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Device Data Unavailable</h4>
          <p className="text-gray-600 mb-1">{error}</p>
          <p className="text-sm text-gray-500">Please check your device configuration or try refreshing the page</p>
        </div>
      </div>
    );
  }

  const onlineDevices = devicesWithHealth.filter(d => {
    const status = d.health?.status || (d.is_active ? 'online' : 'offline');
    return status === 'online';
  }).length;
  
  const issueDevices = devicesWithHealth.filter(d => {
    const status = d.health?.status || (d.is_active ? 'online' : 'offline');
    return status !== 'online';
  }).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Server className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Device Status</h3>
            <p className="text-sm text-gray-500">{devicesWithHealth.length} devices monitored</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{onlineDevices}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{issueDevices}</div>
            <div className="text-xs text-gray-500">Issues</div>
          </div>
        </div>
      </div>
      
      {devicesWithHealth.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
            <Server className="h-12 w-12 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Devices Found</h4>
          <p className="text-gray-600 mb-1">Start monitoring by adding your first device</p>
          <p className="text-sm text-gray-500">Devices will appear here once configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devicesWithHealth.map((device) => {
            const status = device.health?.status || (device.is_active ? 'online' : 'offline');
            const responseTime = device.health?.response_time;
            const lastSeen = formatTimeAgo(device.health?.timestamp || device.updated_at);
            
            const getStatusIcon = () => {
              switch (status) {
                case 'online':
                  return <CheckCircle className="w-5 h-5 text-green-500" />;
                case 'warning':
                  return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
                default:
                  return <AlertTriangle className="w-5 h-5 text-red-500" />;
              }
            };
            
            const getStatusColor = () => {
              switch (status) {
                case 'online':
                  return 'bg-green-100 text-green-800 border-green-200';
                case 'warning':
                  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                default:
                  return 'bg-red-100 text-red-800 border-red-200';
              }
            };
            
            const getDeviceGradient = () => {
              switch (status) {
                case 'online':
                  return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
                case 'warning':
                  return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
                default:
                  return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
              }
            };
            
            return (
              <div key={device.id} className={`flex items-center justify-between p-4 rounded-xl border hover:shadow-md transition-all duration-200 ${getDeviceGradient()}`}>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    {device.device_type === 'access_point' || device.device_type === 'router' ? (
                      <Wifi className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Server className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{device.name}</h4>
                      {getStatusIcon()}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{device.ip_address}</p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {responseTime && (
                        <span>Response: {responseTime}ms</span>
                      )}
                      <span>Last seen: {lastSeen}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`${getStatusColor()} border font-medium px-3 py-1`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeviceStatus;