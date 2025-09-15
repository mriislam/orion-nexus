'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource, GCPServiceType } from '@/types';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const StoragePage = () => {
  const router = useRouter();
  const [buckets, setBuckets] = useState<GCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageBuckets();
  }, []);

  const fetchStorageBuckets = async () => {
    try {
      setLoading(true);
      const storageBuckets = await gcpService.getStorageResourcesWithSize();
      setBuckets(storageBuckets);
    } catch (error) {
      console.error('Error fetching storage buckets:', error);
      setError('Failed to fetch storage buckets');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Get credentials for resource discovery
      const credentials = await gcpService.getCredentials();
      const activeCredentials = credentials.filter(cred => cred.enabled);
      
      if (activeCredentials.length === 0) {
        alert('No active GCP credentials found. Please add and activate credentials first.');
        return;
      }
      
      // Use the dedicated storage refresh endpoint
      await gcpService.refreshStorageResources(activeCredentials[0].id);
      
      // Wait a moment for refresh to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the data
      await fetchStorageBuckets();
      
      alert('Storage buckets refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing storage buckets:', error);
      alert('Failed to refresh storage buckets. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getStorageClassBadge = (storageClass: string) => {
    switch (storageClass) {
      case 'STANDARD':
        return <Badge variant="success">Standard</Badge>;
      case 'NEARLINE':
        return <Badge variant="info">Nearline</Badge>;
      case 'COLDLINE':
        return <Badge variant="warning">Coldline</Badge>;
      case 'ARCHIVE':
        return <Badge variant="secondary">Archive</Badge>;
      default:
        return <Badge variant="default">{storageClass}</Badge>;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  const getEncryptionBadge = (encryption: string) => {
    return encryption === 'Customer-managed' 
      ? <Badge variant="info">Customer-managed</Badge>
      : <Badge variant="secondary">Google-managed</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading storage buckets...</p>
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

  const totalSize = buckets.reduce((sum, bucket) => {
    const sizeValue = bucket.metadata?.size ? parseFloat(bucket.metadata.size.toString().split(' ')[0]) : 0;
    return sum + sizeValue;
  }, 0);

  const totalObjects = buckets.reduce((sum, bucket) => {
    const objectCount = bucket.metadata?.objectCount ? Number(bucket.metadata.objectCount) : 0;
    return sum + objectCount;
  }, 0);

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
              <h1 className="text-2xl font-bold text-gray-900">Cloud Storage</h1>
              <p className="text-gray-600">Manage your Google Cloud Storage buckets</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
              variant="secondary"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🗄️</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{buckets.length}</p>
                <p className="text-sm text-gray-600">Storage Buckets</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Storage</p>
                  <p className="text-2xl font-bold text-blue-600">{totalSize.toFixed(1)} GB</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">💾</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Objects</p>
                  <p className="text-2xl font-bold text-green-600">{totalObjects.toLocaleString()}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">📁</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Standard Class</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {buckets.filter(b => b.metadata?.storageClass === 'STANDARD').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">⚡</span>
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
                    {new Set(buckets.map(b => b.metadata?.location || b.region || 'unknown')).size}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🌍</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Buckets Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Storage Bucket List</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Storage Class</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Objects</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Versioning</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Encryption</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Last Modified</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => (
                    <tr key={bucket.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{bucket.resource_name}</p>
                          <p className="text-sm text-gray-500">{bucket.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{bucket.metadata?.location || bucket.region || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {getStorageClassBadge(bucket.metadata?.storageClass || 'STANDARD')}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {bucket.metadata?.total_size_gb !== undefined ? 
                          `${bucket.metadata.total_size_gb} GB` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {bucket.metadata?.object_count !== undefined ? 
                          (typeof bucket.metadata.object_count === 'string' ? 
                            bucket.metadata.object_count : 
                            Number(bucket.metadata.object_count).toLocaleString()) : '0'}
                      </td>
                      <td className="py-3 px-4">
                        {bucket.metadata?.versioning ? (
                          <Badge variant="success">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getEncryptionBadge(bucket.metadata?.encryption || 'Google-managed')}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {bucket.created_at ? new Date(bucket.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('Browse bucket:', bucket.id)}
                          >
                            Browse
                          </Button>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => console.log('Configure:', bucket.id)}
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

export default StoragePage;