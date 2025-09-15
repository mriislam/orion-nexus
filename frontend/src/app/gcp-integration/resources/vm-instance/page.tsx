'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource, GCPServiceType } from '@/types';

interface VMInstance {
  id: string;
  name: string;
  zone: string;
  machineType: string;
  status: 'RUNNING' | 'STOPPED' | 'TERMINATED';
  internalIP: string;
  externalIP: string;
  createdAt: string;
  labels: Record<string, string>;
}

const VMInstancePage = () => {
  const router = useRouter();
  const [instances, setInstances] = useState<VMInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correct data access functions
  const getStatus = (instance: any) => {
    // Check if it's mock data first
    if (instance.metadata?.status) {
      return instance.metadata.status;
    }
    // For real API data from filtered discovery, check if status is at the root level
    if (instance.status) {
      return instance.status;
    }
    // For real API data, we don't have status in metadata, so we'll assume RUNNING
    // In a real implementation, you'd need to make additional API calls to get instance status
    return 'RUNNING';
  };

  const getMachineType = (instance: any) => {
    // Check if it's mock data first
    if (instance.metadata?.machine_type) {
      return instance.metadata.machine_type;
    }
    // For real API data from filtered discovery, check if machine_type is at the root level
    if (instance.machine_type) {
      return instance.machine_type;
    }
    // For real API data, we don't have machine_type in metadata
    // Return a placeholder indicating we need more data from GCP API
    return 'Not Available';
  };

  const getInternalIp = (instance: any) => {
    // This one is correct - inside network_interfaces[0]
    return instance.metadata?.network_interfaces?.[0]?.internal_ip || 'N/A';
  };

  const getExternalIp = (instance: any) => {
    // Check if it's mock data first
    if (instance.metadata?.network_interfaces?.[0]?.external_ip) {
      const externalIp = instance.metadata.network_interfaces[0].external_ip;
      return externalIp && externalIp !== 'none' ? externalIp : 'N/A';
    }
    // For real API data from filtered discovery, check if network_interfaces is at the root level
    if (instance.network_interfaces?.[0]?.external_ip) {
      const externalIp = instance.network_interfaces[0].external_ip;
      return externalIp && externalIp !== 'none' ? externalIp : 'N/A';
    }
    // For real API data, we don't have external_ip in metadata
    return 'N/A';
  };

  // Action handlers
  const handleViewInstance = (instance: VMInstance) => {
    // Navigate to instance details page or show modal
    router.push(`/gcp-integration/resources/vm-instance/${instance.id}`);
  };

  const handleToggleInstance = async (instance: VMInstance) => {
    try {
      const action = instance.status === 'RUNNING' ? 'stop' : 'start';
      const response = await fetch(`http://localhost:8001/api/v1/gcp/instances/${instance.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Refresh the instances list
        window.location.reload();
      } else {
        console.error(`Failed to ${action} instance:`, response.statusText);
        alert(`Failed to ${action} instance. Please try again.`);
      }
    } catch (error) {
      console.error('Error toggling instance:', error);
      alert('Error performing action. Please try again.');
    }
  };

  // Complete Table Row Component




  // Fetch VM instances from service-specific API
  const fetchVMInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new service-specific API
      const response = await gcpService.getComputeEngineResources();
      
      // Map the API response to VMInstance format and deduplicate by resource_id
      const instanceMap = new Map();
      response.forEach((instance: any) => {
        const vmInstance: VMInstance = {
          id: instance.id, // Use unique database ID instead of resource_id
          name: instance.resource_name || instance.name,
          zone: instance.zone || instance.location,
          machineType: instance.metadata?.machine_type || 'N/A',
          status: (instance.metadata?.status || 'RUNNING') as 'RUNNING' | 'STOPPED' | 'TERMINATED',
          internalIP: instance.metadata?.network_interfaces?.[0]?.internal_ip || 'N/A',
          externalIP: instance.metadata?.network_interfaces?.[0]?.external_ip || 'N/A',
          createdAt: instance.created_at || '',
          labels: instance.labels || {}
        };
        // Use resource_id as key to deduplicate, but keep the most recent entry
        const resourceId = instance.resource_id;
        if (!instanceMap.has(resourceId) || 
            new Date(instance.updated_at || instance.created_at) > 
            new Date(instanceMap.get(resourceId).createdAt)) {
          instanceMap.set(resourceId, vmInstance);
        }
      });
      const transformedInstances: VMInstance[] = Array.from(instanceMap.values());
      setInstances(transformedInstances);
    } catch (err) {
      console.error('Error fetching VM instances:', err);
      setError('Failed to fetch VM instances');
      setInstances([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh VM instances
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call refresh API to fetch latest data from GCP
      await gcpService.refreshComputeEngineResources();
      
      // Fetch updated data
      await fetchVMInstances();
    } catch (err) {
      console.error('Error refreshing VM instances:', err);
      setError('Failed to refresh VM instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVMInstances();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge variant="success">Running</Badge>;
      case 'STOPPED':
        return <Badge variant="warning">Stopped</Badge>;
      case 'TERMINATED':
        return <Badge variant="danger">Terminated</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getGroupStatus = (statuses: string[]) => {
    const uniqueStatuses = [...new Set(statuses)];
    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0];
    }
    return 'MIXED';
  };

  const getGroupStatusBadge = (statuses: string[]) => {
    const groupStatus = getGroupStatus(statuses);
    if (groupStatus === 'MIXED') {
      return <Badge variant="default">Mixed</Badge>;
    }
    return getStatusBadge(groupStatus);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading VM instances...</p>
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
      <div className="min-h-screen bg-white">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="secondary" 
                onClick={() => router.push('/gcp-integration')}
                className="flex items-center space-x-1 px-3 py-1 text-sm"
              >
                <span>←</span>
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">VM Instances</h1>
                <p className="text-gray-600 mt-2">Manage your Google Cloud VM instances</p>
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
              <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-sm font-medium text-gray-600">Running Instances</span>
                <div className="text-xl font-semibold text-gray-900">{instances.filter(i => i.status === 'RUNNING').length}</div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Running Instances</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-2">
                      {instances.filter(i => i.status === 'RUNNING').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                     <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M8 5v14l11-7z"/>
                     </svg>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Stopped Instances</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-2">
                      {instances.filter(i => i.status === 'STOPPED').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                     <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M6 6h12v12H6z"/>
                     </svg>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Zones</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-2">
                      {new Set(instances.map(i => i.zone)).size}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                     <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                     </svg>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instances Table */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="bg-white border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Instance Details</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Name</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Status</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Zone</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Machine Type</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Internal IP</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">External IP</th>
                      <th className="text-left py-3 px-6 font-medium text-gray-700 text-sm">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {instances.filter(instance => instance.status === 'RUNNING').map((instance, index) => (
                      <tr key={instance.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{instance.name}</p>
                            <p className="text-xs text-gray-500">{instance.id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(instance.status)}
                        </td>
                        <td className="py-4 px-6 text-gray-700 text-sm">{instance.zone}</td>
                        <td className="py-4 px-6 text-gray-700 text-sm">{instance.machineType}</td>
                        <td className="py-4 px-6 text-gray-700 font-mono text-xs">{instance.internalIP}</td>
                        <td className="py-4 px-6 text-gray-700 font-mono text-xs">
                          {instance.externalIP || 'None'}
                        </td>
                        <td className="py-4 px-6 text-gray-700 text-sm">
                          {instance.createdAt
                            ? new Date(instance.createdAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default VMInstancePage;