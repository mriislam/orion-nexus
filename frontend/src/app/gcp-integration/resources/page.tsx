'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { GCPServiceType, GCPResourceCountsResponse } from '@/types';
import { gcpService } from '@/lib/services/gcp';

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Something went wrong loading the resources.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ResourcesPage() {
  const router = useRouter();
  const [resourceCounts, setResourceCounts] = useState<GCPResourceCountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [credentials, setCredentials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resourceCountsData, credentialsData] = await Promise.all([
          gcpService.getResourceCounts(),
          gcpService.getCredentials()
        ]);
        setResourceCounts(resourceCountsData);
        setCredentials(credentialsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRefreshResources = async () => {
    if (credentials.length === 0) {
      alert('No credentials found. Please add GCP credentials first.');
      return;
    }

    try {
      setRefreshing(true);
      
      // Trigger discovery for all active credentials
      const activeCredentials = credentials.filter(cred => cred.enabled);
      
      if (activeCredentials.length === 0) {
        alert('No active credentials found. Please enable at least one credential.');
        return;
      }

      // Trigger discovery for the first active credential
      const credential = activeCredentials[0];
      await gcpService.triggerResourceDiscovery(credential.id);
      
      // Wait a moment for discovery to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh the resource counts
      const updatedResourceCounts = await gcpService.getResourceCounts();
      setResourceCounts(updatedResourceCounts);
      
      alert('Resource discovery initiated successfully! Resources will be updated in the background.');
    } catch (error) {
      console.error('Error refreshing resources:', error);
      alert('Failed to refresh resources. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };



  const getResourceCount = (serviceType: GCPServiceType): number => {
    if (!resourceCounts) return 0;
    const resourceCount = resourceCounts.resource_counts.find(rc => rc.service_type === serviceType);
    return resourceCount?.count || 0;
  };

  return (
    <ErrorBoundary>
      <Layout>
        <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              GCP Resources
            </h1>
            <p className="text-gray-600 mt-2 text-base">
              Monitor and manage your Google Cloud Platform resources
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-600">Total Services</span>
              <div className="text-xl font-semibold text-gray-900">{resourceCounts ? resourceCounts.resource_counts.length : 0}</div>
            </div>
            <button
              onClick={handleRefreshResources}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors duration-200"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  <span>Refresh Resources</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            <p className="ml-3 text-gray-600">Loading resources...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Compute Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Compute Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* VM Instance */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/vm-instance')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="16" rx="2" fill="#4285F4"/>
                          <rect x="5" y="6" width="14" height="2" fill="white"/>
                          <rect x="5" y="9" width="10" height="2" fill="white"/>
                          <rect x="5" y="12" width="8" height="2" fill="white"/>
                          <circle cx="17" cy="16" r="1.5" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Compute Engine</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.COMPUTE_ENGINE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Virtual machines</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* App Engine */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/app-engine')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="#4285F4"/>
                          <path d="M8 10h8v2H8v-2zm0 3h6v2H8v-2z" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">App Engine</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.APP_ENGINE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Serverless platform</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Kubernetes Engine */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/kubernetes-engine')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                          <path d="M12 6l-2 6h4l-2-6z" fill="white"/>
                          <circle cx="8" cy="16" r="1.5" fill="white"/>
                          <circle cx="16" cy="16" r="1.5" fill="white"/>
                          <circle cx="12" cy="8" r="1" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Kubernetes Engine</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.KUBERNETES_ENGINE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Container orchestration</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud Functions */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-functions')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
                          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" strokeWidth="2" fill="none"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Functions</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_FUNCTIONS)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Event-driven functions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud Run */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-run')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="6" width="16" height="12" rx="2" fill="#4285F4"/>
                          <path d="M10 10l4 2-4 2v-4z" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Run</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_RUN)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Containerized apps</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Storage Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Storage Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Cloud Storage */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/storage')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="4" rx="2" fill="#4285F4"/>
                          <rect x="3" y="10" width="18" height="4" rx="2" fill="#34A853"/>
                          <rect x="3" y="16" width="18" height="4" rx="2" fill="#FBBC04"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Storage</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_STORAGE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Object storage</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* File Store */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/file-store')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#4285F4"/>
                          <rect x="6" y="10" width="12" height="2" fill="white"/>
                          <rect x="6" y="13" width="8" height="2" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Filestore</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.FILE_STORE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Managed file storage</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Database Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Database Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Cloud SQL */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-sql')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="6" width="18" height="12" rx="2" fill="#4285F4"/>
                          <circle cx="7" cy="12" r="1.5" fill="white"/>
                          <circle cx="12" cy="12" r="1.5" fill="white"/>
                          <circle cx="17" cy="12" r="1.5" fill="white"/>
                          <rect x="5" y="8" width="14" height="1" fill="white" opacity="0.7"/>
                          <rect x="5" y="15" width="14" height="1" fill="white" opacity="0.7"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud SQL</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_SQL)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Managed relational database</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Firebase Database */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/firebase-database')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M5.8 21l7.4-14.9L16.2 21H5.8z" fill="#FF9800"/>
                          <path d="M2 21l8-16 8 16H2z" fill="#FFA726" opacity="0.8"/>
                          <circle cx="12" cy="8" r="2" fill="#4285F4"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Firebase Database</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.FIREBASE_DATABASE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">NoSQL document database</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redis */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/redis')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#DC143C"/>
                          <rect x="6" y="8" width="12" height="2" rx="1" fill="white"/>
                          <rect x="6" y="11" width="8" height="2" rx="1" fill="white"/>
                          <rect x="6" y="14" width="10" height="2" rx="1" fill="white"/>
                          <circle cx="18" cy="9" r="1.5" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Redis</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.REDIS)}</span>
                        </div>
                        <p className="text-xs text-gray-500">In-memory data store</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Spanner */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/spanner')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                          <path d="M12 6l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" fill="white"/>
                          <circle cx="12" cy="12" r="2" fill="#34A853"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Spanner</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.SPANNER)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Global distributed database</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Networking Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Networking Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Load Balancing */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/load-balancing')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="8" width="4" height="8" rx="1" fill="#4285F4"/>
                          <rect x="10" y="6" width="4" height="12" rx="1" fill="#4285F4"/>
                          <rect x="18" y="10" width="4" height="6" rx="1" fill="#4285F4"/>
                          <path d="M6 12h4M14 12h4" stroke="#34A853" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Load Balancing</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_LOAD_BALANCER)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Traffic distribution</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Network Interface */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/network-interface')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="6" width="18" height="12" rx="2" fill="#4285F4"/>
                          <rect x="6" y="9" width="3" height="6" fill="white"/>
                          <rect x="10" y="9" width="3" height="6" fill="white"/>
                          <rect x="14" y="9" width="3" height="6" fill="white"/>
                          <circle cx="19" cy="12" r="1.5" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Network Interface</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.NETWORK_INTERFACE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Network connectivity</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud Interconnect */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-interconnect')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="8" width="6" height="8" rx="1" fill="#4285F4"/>
                          <rect x="16" y="8" width="6" height="8" rx="1" fill="#4285F4"/>
                          <path d="M8 12h8" stroke="#34A853" strokeWidth="3" strokeLinecap="round"/>
                          <circle cx="12" cy="12" r="2" fill="#EA4335"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Interconnect</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_INTERCONNECT)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Dedicated connectivity</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud DNS */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-dns')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#4285F4"/>
                          <path d="M8 10h8v2H8v-2zm2 4h4v2h-4v-2z" fill="white"/>
                          <circle cx="12" cy="7" r="1.5" fill="white"/>
                          <circle cx="12" cy="17" r="1.5" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud DNS</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_DNS)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Domain name system</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* VPN Tunnel */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/vpn-tunnel')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="#4285F4"/>
                          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">VPN Tunnel</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.VPN_TUNNEL)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Secure network connection</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud Routers */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-routers')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="8" fill="#4285F4"/>
                          <circle cx="12" cy="12" r="3" fill="white"/>
                          <circle cx="6" cy="6" r="2" fill="#34A853"/>
                          <circle cx="18" cy="6" r="2" fill="#34A853"/>
                          <circle cx="6" cy="18" r="2" fill="#34A853"/>
                          <circle cx="18" cy="18" r="2" fill="#34A853"/>
                          <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" stroke="white" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Routers</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_ROUTERS)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Network routing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Data & Analytics Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Data & Analytics Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Cloud Dataflow */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-dataflow')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M3 12h3l3-6 6 12 3-6h3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          <circle cx="6" cy="12" r="2" fill="#34A853"/>
                          <circle cx="12" cy="6" r="2" fill="#EA4335"/>
                          <circle cx="18" cy="12" r="2" fill="#FBBC04"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud Dataflow</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_DATAFLOW)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Stream & batch processing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pub/Sub Topic */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/pubsub-topic')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="8" fill="#4285F4"/>
                          <path d="M8 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="6" cy="6" r="2" fill="#34A853"/>
                          <circle cx="18" cy="6" r="2" fill="#34A853"/>
                          <circle cx="6" cy="18" r="2" fill="#34A853"/>
                          <circle cx="18" cy="18" r="2" fill="#34A853"/>
                          <path d="M8 8l8 8M16 8l-8 8" stroke="#EA4335" strokeWidth="1" opacity="0.5"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Pub/Sub Topic</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.PUBSUB_TOPIC)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Messaging service</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Security Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">Security Services</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Certificate Service */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/certificate-service')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="6" width="16" height="12" rx="2" fill="#4285F4"/>
                          <path d="M8 6V4a4 4 0 0 1 8 0v2" stroke="#4285F4" strokeWidth="2" fill="none"/>
                          <circle cx="12" cy="12" r="2" fill="white"/>
                          <path d="M12 14v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Certificate Service</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CERTIFICATE_SERVICE)}</span>
                        </div>
                        <p className="text-xs text-gray-500">SSL/TLS certificates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cloud KMS */}
                <Card 
                  className="cursor-pointer group bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  onClick={() => router.push('/gcp-integration/resources/cloud-kms')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65z" fill="#4285F4"/>
                          <circle cx="7" cy="12" r="2" fill="white"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cloud KMS</span>
                          <span className="text-lg font-semibold text-gray-900">{getResourceCount(GCPServiceType.CLOUD_KMS)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Key management service</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}