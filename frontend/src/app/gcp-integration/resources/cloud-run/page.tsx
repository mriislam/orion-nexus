'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource, GCPServiceType } from '@/types';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';

const CloudRunPage = () => {
  const router = useRouter();
  const [services, setServices] = useState<GCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCloudRunServices();
  }, []);

  const fetchCloudRunServices = async () => {
    try {
      setLoading(true);
      const resources = await gcpService.getCloudRunResources();
      setServices(resources);
    } catch (error) {
      console.error('Error fetching Cloud Run services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // Call refresh API to fetch latest data from GCP
      await gcpService.refreshCloudRunResources();
      // Fetch updated data
      await fetchCloudRunServices();
    } catch (error) {
      console.error('Error refreshing Cloud Run services:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cloud Run Services</h1>
              <p className="text-gray-600">Manage your serverless containers</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏃</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{services.length}</p>
                <p className="text-sm text-gray-600">Services</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services List */}
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏃</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Cloud Run Services Found</h3>
                  <p className="text-gray-600 mt-2">
                    No Cloud Run services are currently deployed in your GCP project.
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-4"
                >
                  Refresh Services
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {service.name}
                    </h3>
                    <Badge className={getStatusColor(service.is_active)}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Region</p>
                      <p className="text-sm text-gray-600">{service.region || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Resource ID</p>
                      <p className="text-sm text-gray-600">{service.resource_id}</p>
                    </div>
                    
                    {service.metadata?.url && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Service URL</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600 truncate flex-1">
                            {service.metadata.url}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(service.metadata?.url, '_blank')}
                            className="flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {service.metadata?.image && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Container Image</p>
                        <p className="text-sm text-gray-600 truncate">{service.metadata.image}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Synced</p>
                      <p className="text-sm text-gray-600">
                        {service.last_synced ? new Date(service.last_synced).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CloudRunPage;