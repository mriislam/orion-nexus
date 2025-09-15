'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  GCPCredentialsResponse, 
  GCPResourceCountsResponse
} from '@/types';
import { gcpService } from '@/lib/services/gcp';
import {
  Key,
  Server,
  BarChart3,
  ArrowRight,
  Shield,
  Database,
  Activity,
  Users,
  Globe,
  Zap
} from 'lucide-react';

const GCPIntegrationPage = () => {
  const router = useRouter();
  const [credentials, setCredentials] = useState<GCPCredentialsResponse[]>([]);
  const [resourceCounts, setResourceCounts] = useState<GCPResourceCountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        const [credentialsData, resourceCountsData] = await Promise.all([
          gcpService.getCredentials(),
          gcpService.getResourceCounts()
        ]);
        setCredentials(credentialsData);
        setResourceCounts(resourceCountsData);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
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
      
      // Refresh the data
      const [credentialsData, resourceCountsData] = await Promise.all([
        gcpService.getCredentials(),
        gcpService.getResourceCounts()
      ]);
      setCredentials(credentialsData);
      setResourceCounts(resourceCountsData);
      
      alert('Resource discovery initiated successfully! Resources will be updated in the background.');
    } catch (error) {
      console.error('Error refreshing resources:', error);
      alert('Failed to refresh resources. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getTotalResourceCount = (): number => {
    if (!resourceCounts) return 0;
    return resourceCounts.resource_counts.reduce((total, rc) => total + rc.count, 0);
  };

  const getActiveCredentialsCount = (): number => {
    return credentials.filter(cred => cred.enabled).length;
  };

  const navigationCards = [
    {
      title: 'Credentials',
      description: 'Manage GCP service account credentials and authentication',
      icon: Key,
      href: '/gcp-integration/credentials',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      stats: {
        label: 'Active Credentials',
        value: getActiveCredentialsCount(),
        total: credentials.length
      }
    },
    {
      title: 'Resources',
      description: 'View and monitor your GCP resources across all services',
      icon: Server,
      href: '/gcp-integration/resources',
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      stats: {
        label: 'Total Resources',
        value: getTotalResourceCount(),
        total: resourceCounts?.resource_counts.length || 0
      }
    },
    {
      title: 'Metrics',
      description: 'Monitor performance metrics and analytics for your GCP services',
      icon: BarChart3,
      href: '/gcp-integration/metrics',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      stats: {
        label: 'Metric Types',
        value: 12,
        total: 15
      }
    }
  ];

  const overviewStats = [
    {
      title: 'Total Projects',
      value: new Set(credentials.map(c => c.project_id)).size,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Connections',
      value: getActiveCredentialsCount(),
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Monitored Resources',
      value: getTotalResourceCount(),
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Health Status',
      value: '98.5%',
      icon: Activity,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">GCP Integration</h1>
              <p className="text-blue-100 text-lg">
                Centralized management for your Google Cloud Platform resources
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Shield className="w-16 h-16 text-blue-200" />
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {navigationCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card 
                key={index} 
                className={`bg-gradient-to-br ${card.bgGradient} ${card.borderColor} hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group`}
                onClick={() => router.push(card.href)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${card.gradient} shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">{card.stats.label}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {card.stats.value}
                          {card.stats.total > 0 && (
                            <span className="text-sm text-gray-500 font-normal">/{card.stats.total}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        View Details
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Common tasks and shortcuts</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-12"
                onClick={() => router.push('/gcp-integration/credentials')}
              >
                <Key className="w-4 h-4" />
                Add Credentials
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-12"
                onClick={() => router.push('/gcp-integration/resources')}
              >
                <Server className="w-4 h-4" />
                Discover Resources
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-2 h-12"
                onClick={() => router.push('/gcp-integration/metrics')}
              >
                <BarChart3 className="w-4 h-4" />
                View Metrics
              </Button>
              <Button 
                variant="primary" 
                className="flex items-center justify-center gap-2 h-12"
                onClick={handleRefreshResources}
                disabled={refreshing}
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
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default GCPIntegrationPage;