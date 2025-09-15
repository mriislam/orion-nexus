'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource } from '@/types';

interface CloudRouter {
  id: string;
  name: string;
  network: string;
  region: string;
  asn: number;
  bgpPeers: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  advertisedRoutes: number;
  learnedRoutes: number;
  createdAt: string;
  lastUpdate: string;
}

const CloudRoutersPage = () => {
  const router = useRouter();
  const [routers, setRouters] = useState<CloudRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCloudRouters = async () => {
    try {
      setError(null);
      const response = await gcpService.getCloudRoutersResources();
      
      // Transform GCPResource to CloudRouter format
      const transformedRouters: CloudRouter[] = response.map((resource: GCPResource) => ({
        id: resource.resource_id,
        name: resource.resource_name,
        network: resource.metadata?.network || 'Unknown',
        region: resource.region || 'Unknown',
        asn: resource.metadata?.asn || 0,
        bgpPeers: resource.metadata?.bgpPeers || 0,
        status: resource.metadata?.status === 'RUNNING' ? 'ACTIVE' : 'INACTIVE',
        advertisedRoutes: resource.metadata?.advertisedRoutes || 0,
        learnedRoutes: resource.metadata?.learnedRoutes || 0,
        createdAt: resource.created_at,
        lastUpdate: resource.updated_at
      }));
      
      setRouters(transformedRouters);
    } catch (err) {
      console.error('Error fetching cloud routers:', err);
      setError('Failed to fetch cloud routers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await gcpService.refreshCloudRoutersResources();
      await fetchCloudRouters();
    } catch (err) {
      console.error('Error refreshing cloud routers:', err);
      setError('Failed to refresh cloud routers');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCloudRouters();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Cloud Routers...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Cloud Routers</h1>
              <p className="text-gray-600">Manage your Google Cloud Routers</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <span>🔄</span>
              )}
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌐</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{routers.length}</p>
                <p className="text-sm text-gray-600">Cloud Routers</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Routers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {routers.filter(r => r.status === 'ACTIVE').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total BGP Peers</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {routers.reduce((sum, r) => sum + r.bgpPeers, 0)}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">Total Routes</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {routers.reduce((sum, r) => sum + r.advertisedRoutes + r.learnedRoutes, 0)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">🛣️</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Networks</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Set(routers.map(r => r.network)).size}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🌐</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routers Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Router List</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Network</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">ASN</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">BGP Peers</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Advertised Routes</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Learned Routes</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routers.map((routerItem) => (
                    <tr key={routerItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{routerItem.name}</p>
                          <p className="text-sm text-gray-500">{routerItem.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(routerItem.status)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{routerItem.network}</td>
                      <td className="py-3 px-4 text-gray-700">{routerItem.region}</td>
                      <td className="py-3 px-4 text-gray-700 font-mono">{routerItem.asn}</td>
                      <td className="py-3 px-4 text-gray-700">{routerItem.bgpPeers}</td>
                      <td className="py-3 px-4 text-gray-700">{routerItem.advertisedRoutes}</td>
                      <td className="py-3 px-4 text-gray-700">{routerItem.learnedRoutes}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('View router:', routerItem.id)}
                          >
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => console.log('Configure:', routerItem.id)}
                          >
                            Configure
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

export default CloudRoutersPage;