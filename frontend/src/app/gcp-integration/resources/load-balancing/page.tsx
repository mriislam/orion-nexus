'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource } from '@/types';

interface LoadBalancer {
  id: string;
  name: string;
  type: 'HTTP(S)' | 'TCP' | 'UDP' | 'SSL';
  region: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  frontendIP: string;
  backendServices: number;
  createdAt: string;
  protocol: string;
}

const LoadBalancingPage = () => {
  const router = useRouter();
  const [loadBalancers, setLoadBalancers] = useState<LoadBalancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoadBalancers = async () => {
    try {
      setError(null);
      const response = await gcpService.getLoadBalancingResources();
      
      // Transform GCPResource to LoadBalancer format
      const transformedLoadBalancers: LoadBalancer[] = response.map((resource: GCPResource) => ({
        id: resource.resource_id,
        name: resource.resource_name,
        type: resource.metadata?.type || 'HTTP(S)',
        region: resource.region || 'Unknown',
        status: resource.metadata?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        frontendIP: resource.metadata?.frontendIP || 'N/A',
        backendServices: resource.metadata?.backendServices || 0,
        createdAt: resource.created_at,
        protocol: resource.metadata?.protocol || 'HTTPS'
      }));
      
      setLoadBalancers(transformedLoadBalancers);
    } catch (err) {
      console.error('Error fetching load balancers:', err);
      setError('Failed to fetch load balancers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await gcpService.refreshLoadBalancingResources();
      await fetchLoadBalancers();
    } catch (err) {
      console.error('Error refreshing load balancers:', err);
      setError('Failed to refresh load balancers');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoadBalancers();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="warning">Inactive</Badge>;
      case 'ERROR':
        return <Badge variant="danger">Error</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HTTP(S)':
        return <Badge variant="info">HTTP(S)</Badge>;
      case 'TCP':
        return <Badge variant="secondary">TCP</Badge>;
      case 'UDP':
        return <Badge variant="secondary">UDP</Badge>;
      case 'SSL':
        return <Badge variant="info">SSL</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading load balancers...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Load Balancers</h1>
              <p className="text-gray-600">Manage your Google Cloud Load Balancers</p>
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
              <span className="text-2xl">⚖️</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{loadBalancers.length}</p>
                <p className="text-sm text-gray-600">Total Load Balancers</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Load Balancers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loadBalancers.filter(lb => lb.status === 'ACTIVE').length}
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
                  <p className="text-sm font-medium text-gray-600">HTTP(S) Load Balancers</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {loadBalancers.filter(lb => lb.type === 'HTTP(S)').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">🌐</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Backend Services</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {loadBalancers.reduce((sum, lb) => sum + lb.backendServices, 0)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">🔧</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Regions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Set(loadBalancers.map(lb => lb.region)).size}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🌍</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Load Balancers Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Load Balancer List</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Frontend IP</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Backend Services</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Protocol</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadBalancers.map((lb) => (
                    <tr key={lb.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{lb.name}</p>
                          <p className="text-sm text-gray-500">{lb.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(lb.status)}
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(lb.type)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{lb.region}</td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-sm">{lb.frontendIP}</td>
                      <td className="py-3 px-4 text-gray-700">{lb.backendServices}</td>
                      <td className="py-3 px-4 text-gray-700">{lb.protocol}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(lb.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('View details:', lb.id)}
                          >
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => console.log('Configure:', lb.id)}
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

export default LoadBalancingPage;