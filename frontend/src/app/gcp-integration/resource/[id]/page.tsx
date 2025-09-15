'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { GCPResource, GCPServiceType } from '@/types';
import { gcpService } from '@/lib/services/gcp';

const ResourceDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [resource, setResource] = useState<GCPResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true);
        // In a real implementation, you'd fetch the specific resource by ID
        const resources = await gcpService.getResources();
        const foundResource = resources.find(r => r.id === params.id);
        
        if (foundResource) {
          setResource(foundResource);
        } else {
          setError('Resource not found');
        }
      } catch (err) {
        setError('Failed to fetch resource details');
        console.error('Error fetching resource:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchResource();
    }
  }, [params.id]);

  const getServiceTypeIcon = (serviceType: GCPServiceType) => {
    const icons: Record<GCPServiceType, React.ReactElement> = {
      [GCPServiceType.COMPUTE_ENGINE]: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      [GCPServiceType.CLOUD_STORAGE]: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      ),
      [GCPServiceType.CLOUD_SQL]: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zM4 16v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>
        </svg>
      ),
      // Add more service types as needed
    } as any;
    
    return icons[serviceType] || (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4Z"/>
      </svg>
    );
  };

  const getServiceTypeColor = (serviceType: GCPServiceType) => {
    const colors: Record<string, string> = {
      [GCPServiceType.COMPUTE_ENGINE]: 'bg-blue-100 text-blue-600',
      [GCPServiceType.CLOUD_STORAGE]: 'bg-green-100 text-green-600',
      [GCPServiceType.CLOUD_SQL]: 'bg-purple-100 text-purple-600',
    };
    return colors[serviceType] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading resource details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !resource) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Resource Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The requested resource could not be found.'}</p>
            <Button onClick={() => router.back()} variant="primary">
              Go Back
            </Button>
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
              onClick={() => router.back()}
              variant="outline"
              size="sm"
            >
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{resource.resource_name}</h1>
              <p className="text-gray-600">Resource Details</p>
            </div>
          </div>
          <Badge variant={resource.is_active ? 'success' : 'danger'}>
            {resource.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Resource Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${getServiceTypeColor(resource.resource_type)}`}>
                {getServiceTypeIcon(resource.resource_type)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{resource.resource_name}</h2>
                <p className="text-gray-600">{resource.resource_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Resource ID</h3>
                <p className="text-lg font-mono text-gray-900">{resource.resource_id}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Region</h3>
                <p className="text-lg text-gray-900">{resource.region}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Created</h3>
                <p className="text-lg text-gray-900">{new Date(resource.created_at).toLocaleDateString()}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</h3>
                <Badge variant={resource.is_active ? 'success' : 'danger'}>
                  {resource.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Service Type</h3>
                <p className="text-lg text-gray-900">{resource.resource_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Metrics */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Resource Metrics</h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Metrics Coming Soon</h3>
              <p className="text-gray-600">Resource metrics and monitoring data will be displayed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Resource Configuration */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">⚙️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Details</h3>
              <p className="text-gray-600">Resource configuration and settings will be displayed here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">
                View Logs
              </Button>
              <Button variant="outline">
                Edit Configuration
              </Button>
              <Button variant="outline">
                View Metrics
              </Button>
              <Button variant="danger">
                Delete Resource
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ResourceDetailPage;