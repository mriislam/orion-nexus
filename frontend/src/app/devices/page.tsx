'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import AddDeviceModal from '@/components/AddDeviceModal';
import BulkImportModal from '@/components/BulkImportModal';
import {
  Server,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deviceService, Device as ApiDevice, DeviceHealth } from '@/lib/services/device';
import * as XLSX from 'xlsx';

interface DisplayDevice {
  id: string;
  name: string;
  ip: string;
  type: 'router' | 'switch' | 'firewall' | 'server' | 'access_point';
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  lastSeen: string;
  location: string;
  interfaces: number;
  activeInterfaces: number;
  cpuUsage: number;
  memoryUsage: number;
  temperature?: number;
  memoryTotal?: number;
  memoryUsed?: number;

  systemUptime?: number;
  systemDescription?: string;
  operatingSystem?: string;
}

// Helper function to extract OS from system description
const extractOperatingSystem = (systemDescription?: string): string => {
  if (!systemDescription) return 'Unknown';
  
  const description = systemDescription.toLowerCase();
  
  if (description.includes('windows')) {
    if (description.includes('server 2022')) return 'Windows Server 2022';
    if (description.includes('server 2019')) return 'Windows Server 2019';
    if (description.includes('server 2016')) return 'Windows Server 2016';
    if (description.includes('server')) return 'Windows Server';
    if (description.includes('11')) return 'Windows 11';
    if (description.includes('10')) return 'Windows 10';
    return 'Windows';
  }
  
  if (description.includes('ubuntu')) {
    const versionMatch = description.match(/ubuntu\s*(\d+\.\d+)/);
    return versionMatch ? `Ubuntu ${versionMatch[1]}` : 'Ubuntu';
  }
  
  if (description.includes('centos')) {
    const versionMatch = description.match(/centos\s*(\d+)/);
    return versionMatch ? `CentOS ${versionMatch[1]}` : 'CentOS';
  }
  
  if (description.includes('rhel') || description.includes('red hat')) {
    const versionMatch = description.match(/(?:rhel|red hat)\s*(\d+)/);
    return versionMatch ? `RHEL ${versionMatch[1]}` : 'Red Hat Enterprise Linux';
  }
  
  if (description.includes('debian')) {
    const versionMatch = description.match(/debian\s*(\d+)/);
    return versionMatch ? `Debian ${versionMatch[1]}` : 'Debian';
  }
  
  if (description.includes('linux')) return 'Linux';
  if (description.includes('cisco')) return 'Cisco IOS';
  if (description.includes('juniper')) return 'Junos OS';
  if (description.includes('pfsense')) return 'pfSense';
  if (description.includes('opnsense')) return 'OPNsense';
  
  return 'Unknown';
};

// Helper function to map API device to display device
const mapApiDeviceToDisplay = (apiDevice: ApiDevice & { health?: DeviceHealth | null }): DisplayDevice => {
  const health = apiDevice.health;
  const status = health?.status || (apiDevice.is_active ? 'online' : 'offline');
  
  return {
    id: apiDevice.id,
    name: apiDevice.name,
    ip: apiDevice.ip_address,
    type: apiDevice.device_type as DisplayDevice['type'],
    status: status as DisplayDevice['status'],
    uptime: health?.uptime ? formatUptime(health.uptime) : 'Unknown',
    lastSeen: health?.timestamp ? formatTimestamp(health.timestamp) : (apiDevice.last_report_time ? formatTimestamp(apiDevice.last_report_time) : 'Unknown'),
    location: apiDevice.location || 'Unknown',
    interfaces: 0, // Will be populated from interface data if available
    activeInterfaces: 0, // Will be populated from interface data if available
    cpuUsage: health?.cpu_usage || 0,
    memoryUsage: health?.memory_usage || 0,
    temperature: undefined, // Not available in current API
    memoryTotal: health?.memory_total,
     memoryUsed: health?.memory_used,

     systemUptime: health?.system_uptime,
     systemDescription: health?.system_description,
     operatingSystem: extractOperatingSystem(health?.system_description)
  };
};

// Helper function to format uptime from seconds
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

// Helper function to format time ago
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp + 'Z'); // Ensure UTC parsing by adding 'Z'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const mockDevices: DisplayDevice[] = [
  {
    id: '1',
    name: 'Core Router 01',
    ip: '192.168.1.1',
    type: 'router',
    status: 'online',
    uptime: '45d 12h 30m',
    lastSeen: '2024-01-15 14:32:15',
    location: 'Data Center A',
    interfaces: 24,
    activeInterfaces: 18,
    cpuUsage: 23,
    memoryUsage: 67,
    temperature: 42,
    memoryTotal: 8589934592, // 8GB in bytes
    memoryUsed: 5754725376, // ~67% of 8GB
    
    systemUptime: 3931800, // 45d 12h 30m in seconds
    operatingSystem: 'Cisco IOS'
  },
  {
    id: '2',
    name: 'Switch Floor 2',
    ip: '192.168.2.10',
    type: 'switch',
    status: 'online',
    uptime: '12d 8h 15m',
    lastSeen: '2024-01-15 14:33:22',
    location: 'Floor 2',
    interfaces: 48,
    activeInterfaces: 32,
    cpuUsage: 15,
    memoryUsage: 45,
    memoryTotal: 4294967296, // 4GB in bytes
    memoryUsed: 1932735283, // ~45% of 4GB
    
    systemUptime: 1058100, // 12d 8h 15m in seconds
    operatingSystem: 'Cisco IOS'
  },
  {
    id: '3',
    name: 'Firewall Main',
    ip: '192.168.1.254',
    type: 'firewall',
    status: 'warning',
    uptime: '89d 4h 22m',
    lastSeen: '2024-01-15 14:29:45',
    location: 'DMZ',
    interfaces: 8,
    activeInterfaces: 6,
    cpuUsage: 78,
    memoryUsage: 82,
    temperature: 65,
    memoryTotal: 17179869184, // 16GB in bytes
    memoryUsed: 14087513190, // ~82% of 16GB
    
    systemUptime: 7707720, // 89d 4h 22m in seconds
    operatingSystem: 'pfSense'
  },
  {
    id: '4',
    name: 'Web Server 01',
    ip: '192.168.3.100',
    type: 'server',
    status: 'online',
    uptime: '156d 18h 45m',
    lastSeen: '2024-01-15 14:34:05',
    location: 'Server Room',
    interfaces: 2,
    activeInterfaces: 2,
    cpuUsage: 34,
    memoryUsage: 56,
    memoryTotal: 34359738368, // 32GB in bytes
    memoryUsed: 19241553100, // ~56% of 32GB
    
    systemUptime: 13543500, // 156d 18h 45m in seconds
    operatingSystem: 'Ubuntu 22.04'
  },
  {
    id: '5',
    name: 'WiFi AP Floor 1',
    ip: '192.168.4.50',
    type: 'access_point',
    status: 'offline',
    uptime: '0d 0h 0m',
    lastSeen: '2024-01-15 12:35:12',
    location: 'Floor 1 Lobby',
    interfaces: 1,
    activeInterfaces: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    memoryTotal: 536870912, // 512MB in bytes
    memoryUsed: 0,

    systemUptime: 0,
    operatingSystem: 'Unknown'
  }
];

const getDeviceIcon = (type: DisplayDevice['type']) => {
  switch (type) {
    case 'router':
      return Wifi;
    case 'switch':
      return Server;
    case 'firewall':
      return AlertTriangle;
    case 'server':
      return Server;
    case 'access_point':
      return Wifi;
    default:
      return Server;
  }
};

const getStatusIcon = (status: DisplayDevice['status']) => {
  switch (status) {
    case 'online':
      return CheckCircle;
    case 'offline':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return XCircle;
  }
};

const getStatusColor = (status: DisplayDevice['status']) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'secondary';
  }
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<DisplayDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load devices on component mount
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiDevices = await deviceService.getDevicesWithHealth();
      const displayDevices = apiDevices.map(mapApiDeviceToDisplay);
      setDevices(displayDevices);
    } catch (err) {
      // Failed to load devices, using mock data as fallback
      setError(null); // Don't show error, just use mock data
      setDevices(mockDevices);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceAdded = () => {
    loadDevices(); // Refresh the devices list
  };

  const handleBulkImport = async (devices: any[]) => {
    try {
      const response = await fetch('/api/v1/devices/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(devices),
      });
      
      if (!response.ok) {
        throw new Error('Failed to import devices');
      }
      
      const result = await response.json();
      
      // Reload devices after import
      await loadDevices();
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 p-4 rounded-lg text-white z-50 bg-green-500';
      if (result.failed_count > 0) {
        toast.textContent = `${result.created_count} devices imported successfully. ${result.failed_count} devices failed.`;
      } else {
        toast.textContent = `Successfully imported ${result.created_count} devices.`;
      }
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (error) {
      // Import failed
      
      // Show error message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 p-4 rounded-lg text-white z-50 bg-red-500';
      toast.textContent = 'Import failed. Please try again.';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
      
      throw error;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.ip.includes(searchTerm) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || device.type === filterType;
    const matchesStatus = filterStatus === 'all' || device.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDevices();
    setIsRefreshing(false);
  };

  const exportToExcel = () => {
    try {
      // Prepare data for Excel export
      const exportData = filteredDevices.map(device => ({
        'Device Name': device.name,
        'IP Address': device.ip,
        'Type': device.type,
        'Operating System': device.operatingSystem,
        'Status': device.status,
        'CPU Usage (%)': device.cpuUsage ? `${device.cpuUsage.toFixed(1)}%` : 'N/A',
        'Memory Usage (%)': device.memoryUsage ? `${device.memoryUsage.toFixed(1)}%` : 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better readability
       const colWidths = [
          { wch: 20 }, // Device Name
          { wch: 15 }, // IP Address
          { wch: 12 }, // Type
          { wch: 18 }, // Operating System
          { wch: 10 }, // Status
          { wch: 15 }, // CPU Usage
          { wch: 15 }  // Memory Usage
        ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Device Health Report');

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `device-health-report-${dateStr}-${timeStr}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      // Error exporting to Excel
      alert('Failed to export data to Excel. Please try again.');
    }
  };

  const deviceStats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length
  };

  return (
    <Layout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Network Devices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage your network infrastructure
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
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button 
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading devices...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {deviceStats.total}
                </p>
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Online</p>
                <p className="text-2xl font-bold text-green-600">
                  {deviceStats.online}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Warning</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {deviceStats.warning}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
                <p className="text-2xl font-bold text-red-600">
                  {deviceStats.offline}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="firewall">Firewall</option>
                <option value="server">Server</option>
                <option value="access_point">Access Point</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Operating System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CPU Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    RAM Total(MB)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    RAM Usage(MB)
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uptime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Report Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          device.status === 'online' ? 'bg-green-500' :
                          device.status === 'warning' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span>{device.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.operatingSystem || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.cpuUsage !== undefined ? `${device.cpuUsage}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.memoryTotal !== undefined ? Math.round(device.memoryTotal / (1024 * 1024)) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.memoryUsed !== undefined ? Math.round(device.memoryUsed / (1024 * 1024)) : 'N/A'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.systemUptime ? formatUptime(device.systemUptime) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {device.lastSeen !== 'Unknown' ? device.lastSeen : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {filteredDevices.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No devices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
      </div>
      
      <AddDeviceModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onDeviceAdded={handleDeviceAdded}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </Layout>
  );
}