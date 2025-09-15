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

const KubernetesEnginePage = () => {
  const router = useRouter();
  const [clusters, setClusters] = useState<GCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchKubernetesClusters();
  }, []);

  const fetchKubernetesClusters = async () => {
    try {
      setLoading(true);
      const resources = await gcpService.getKubernetesEngineResources();
      setClusters(resources);
    } catch (error) {
      console.error('Error fetching Kubernetes clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // Call refresh API to fetch latest data from GCP
      await gcpService.refreshKubernetesEngineResources();
      // Fetch updated data
      await fetchKubernetesClusters();
    } catch (error) {
      console.error('Error refreshing Kubernetes clusters:', error);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Kubernetes Engine (GKE)</h1>
              <p className="text-gray-600">Manage your Kubernetes clusters</p>
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
              <span className="text-2xl">⭐</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{clusters.length}</p>
                <p className="text-sm text-gray-600">Clusters</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clusters List */}
        {clusters.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No Kubernetes Clusters Found</h3>
                  <p className="text-gray-600 mt-2">
                    No GKE clusters are currently deployed in your GCP project.
                  </p>
                </div>
                <Button
                  onClick={handleRefresh}
                  className="mt-4"
                >
                  Refresh Clusters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clusters.map((cluster) => (
              <Card key={cluster.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {cluster.name || cluster.resource_name}
                    </h3>
                    <Badge className={getStatusColor(cluster.is_active)}>
                      {cluster.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Zone/Region</p>
                      <p className="text-sm text-gray-600">{cluster.zone || cluster.region || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Resource ID</p>
                      <p className="text-sm text-gray-600">{cluster.resource_id}</p>
                    </div>
                    
                    {cluster.metadata?.nodeCount && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Node Count</p>
                        <p className="text-sm text-gray-600">{cluster.metadata.nodeCount}</p>
                      </div>
                    )}
                    
                    {cluster.metadata?.version && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Kubernetes Version</p>
                        <p className="text-sm text-gray-600">{cluster.metadata.version}</p>
                      </div>
                    )}
                    
                    {cluster.metadata?.endpoint && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Cluster Endpoint</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600 truncate flex-1">
                            {cluster.metadata.endpoint}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(cluster.metadata?.endpoint)}
                            className="flex items-center space-x-1"
                          >
                            <span className="text-xs">Copy</span>
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {cluster.labels && Object.keys(cluster.labels).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Labels</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(cluster.labels).slice(0, 3).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                          {Object.keys(cluster.labels).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{Object.keys(cluster.labels).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Synced</p>
                      <p className="text-sm text-gray-600">
                        {cluster.last_synced ? new Date(cluster.last_synced).toLocaleString() : 'N/A'}
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

export default KubernetesEnginePage;