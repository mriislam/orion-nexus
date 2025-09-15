'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource } from '@/types';

interface CloudSQLInstance {
  id: string;
  name: string;
  databaseVersion: string;
  tier: string;
  region: string;
  status: 'RUNNABLE' | 'STOPPED' | 'MAINTENANCE' | 'FAILED';
  storage: string;
  connections: number;
  maxConnections: number;
  backupEnabled: boolean;
  highAvailability: boolean;
  createdAt: string;
  lastBackup: string;
}

const CloudSQLPage = () => {
  const router = useRouter();
  const [instances, setInstances] = useState<CloudSQLInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Cloud SQL instances from service-specific API
  const fetchCloudSQLInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new service-specific API
      const response = await gcpService.getCloudSqlResources();
      
      // Map the API response to CloudSQLInstance format
      const transformedInstances: CloudSQLInstance[] = response.map((instance: any) => ({
        id: instance.resource_id,
        name: instance.name,
        databaseVersion: instance.metadata?.database_version || 'N/A',
        tier: instance.metadata?.tier || 'N/A',
        region: instance.region || instance.location || 'N/A',
        status: (instance.metadata?.state || 'UNKNOWN') as 'RUNNABLE' | 'STOPPED' | 'MAINTENANCE' | 'FAILED',
        storage: instance.metadata?.storage_size || 'N/A',
        connections: instance.metadata?.current_connections || 0,
        maxConnections: instance.metadata?.max_connections || 0,
        backupEnabled: instance.metadata?.backup_enabled || false,
        highAvailability: instance.metadata?.high_availability || false,
        createdAt: instance.created_at || '',
        lastBackup: instance.metadata?.last_backup || 'N/A'
      }));
      setInstances(transformedInstances);
    } catch (err) {
      console.error('Error fetching Cloud SQL instances:', err);
      setError('Failed to fetch Cloud SQL instances');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh Cloud SQL instances
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call refresh API to fetch latest data from GCP
      await gcpService.refreshCloudSqlResources();
      
      // Fetch updated data
      await fetchCloudSQLInstances();
    } catch (err) {
      console.error('Error refreshing Cloud SQL instances:', err);
      setError('Failed to refresh Cloud SQL instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudSQLInstances();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNABLE':
        return <Badge variant="success">Running</Badge>;
      case 'STOPPED':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="warning">Maintenance</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getDatabaseBadge = (version: string) => {
    if (version.includes('PostgreSQL')) {
      return <Badge variant="info">PostgreSQL</Badge>;
    } else if (version.includes('MySQL')) {
      return <Badge variant="success">MySQL</Badge>;
    } else if (version.includes('Redis')) {
      return <Badge variant="danger">Redis</Badge>;
    }
    return <Badge variant="default">{version}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Cloud SQL instances...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const runningInstances = instances.filter(i => i.status === 'RUNNABLE').length;
  const totalConnections = instances.reduce((sum, instance) => sum + instance.connections, 0);
  const haInstances = instances.filter(i => i.highAvailability).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              onClick={() => router.push('/gcp-integration')}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Resources</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cloud SQL</h1>
              <p className="text-gray-600">Manage your Google Cloud SQL instances</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🗃️</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{instances.length}</p>
                <p className="text-sm text-gray-600">SQL Instances</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Running Instances</p>
                  <p className="text-2xl font-bold text-green-600">{runningInstances}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">▶️</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Connections</p>
                  <p className="text-2xl font-bold text-blue-600">{totalConnections}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">🔗</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Availability</p>
                  <p className="text-2xl font-bold text-purple-600">{haInstances}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">🛡️</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Regions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Set(instances.map(i => i.region)).size}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🌍</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SQL Instances Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">SQL Instance List</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Database</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tier</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Storage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Connections</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">HA</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Last Backup</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr key={instance.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{instance.name}</p>
                          <p className="text-sm text-gray-500">{instance.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(instance.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {getDatabaseBadge(instance.databaseVersion)}
                          <p className="text-sm text-gray-500 mt-1">{instance.databaseVersion}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm">{instance.tier}</td>
                      <td className="py-3 px-4 text-gray-700">{instance.region}</td>
                      <td className="py-3 px-4 text-gray-700">{instance.storage}</td>
                      <td className="py-3 px-4">
                        <div className="text-gray-700">
                          <span className="font-medium">{instance.connections}</span>
                          <span className="text-gray-500">/{instance.maxConnections}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${(instance.connections / instance.maxConnections) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {instance.highAvailability ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {instance.lastBackup !== 'N/A' 
                          ? new Date(instance.lastBackup).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('Connect to:', instance.id)}
                          >
                            Connect
                          </Button>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => console.log('Manage:', instance.id)}
                          >
                            Manage
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CloudSQLPage;