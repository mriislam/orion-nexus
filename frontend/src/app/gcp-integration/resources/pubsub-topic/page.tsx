'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource } from '@/types';

interface PubSubTopic {
  id: string;
  name: string;
  subscriptions: number;
  messageRetention: string;
  messageOrdering: boolean;
  encryption: 'Google-managed' | 'Customer-managed';
  publishRate: string;
  subscribeRate: string;
  createdAt: string;
  lastActivity: string;
}

const PubSubTopicPage = () => {
  const router = useRouter();
  const [topics, setTopics] = useState<PubSubTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPubSubTopics = async () => {
    try {
      setError(null);
      const response = await gcpService.getPubSubResources();
      
      // Transform GCPResource to PubSubTopic format
      const transformedTopics: PubSubTopic[] = response.map((resource: GCPResource) => ({
        id: resource.resource_id,
        name: resource.resource_name,
        subscriptions: resource.metadata?.subscriptions || 0,
        messageRetention: resource.metadata?.messageRetention || '7 days',
        messageOrdering: resource.metadata?.messageOrdering || false,
        encryption: resource.metadata?.encryption || 'Google-managed',
        publishRate: resource.metadata?.publishRate || '0/min',
        subscribeRate: resource.metadata?.subscribeRate || '0/min',
        createdAt: resource.created_at,
        lastActivity: resource.updated_at
      }));
      
      setTopics(transformedTopics);
    } catch (err) {
      console.error('Error fetching pub/sub topics:', err);
      setError('Failed to fetch pub/sub topics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await gcpService.refreshPubSubResources();
      await fetchPubSubTopics();
    } catch (err) {
      console.error('Error refreshing pub/sub topics:', err);
      setError('Failed to refresh pub/sub topics');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPubSubTopics();
  }, []);

  const getEncryptionBadge = (encryption: string) => {
    return encryption === 'Customer-managed' 
      ? <Badge variant="info">Customer-managed</Badge>
      : <Badge variant="secondary">Google-managed</Badge>;
  };

  const getOrderingBadge = (ordering: boolean) => {
    return ordering 
      ? <Badge variant="success">Enabled</Badge>
      : <Badge variant="secondary">Disabled</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Pub/Sub topics...</p>
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

  const totalSubscriptions = topics.reduce((sum, topic) => sum + topic.subscriptions, 0);
  const totalPublishRate = topics.reduce((sum, topic) => {
    const rate = parseFloat(topic.publishRate.replace(/[^0-9.]/g, ''));
    return sum + rate;
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
              <h1 className="text-2xl font-bold text-gray-900">Pub/Sub Topics</h1>
              <p className="text-gray-600">Manage your Google Cloud Pub/Sub topics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="primary"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              {refreshing ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>🔄</span>
              )}
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📢</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
                <p className="text-sm text-gray-600">Pub/Sub Topics</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-blue-600">{totalSubscriptions}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">📬</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Publish Rate</p>
                  <p className="text-2xl font-bold text-green-600">{totalPublishRate.toFixed(1)}K/min</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">📤</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ordered Topics</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {topics.filter(t => t.messageOrdering).length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">🔢</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Customer Encrypted</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {topics.filter(t => t.encryption === 'Customer-managed').length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600">🔐</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topics Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Topic List</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Subscriptions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Retention</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Message Ordering</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Encryption</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Publish Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Subscribe Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Last Activity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{topic.name}</p>
                          <p className="text-sm text-gray-500">{topic.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-700 font-medium">{topic.subscriptions}</span>
                          <Badge variant="info">{topic.subscriptions > 1 ? 'Multiple' : 'Single'}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{topic.messageRetention}</td>
                      <td className="py-3 px-4">
                        {getOrderingBadge(topic.messageOrdering)}
                      </td>
                      <td className="py-3 px-4">
                        {getEncryptionBadge(topic.encryption)}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-sm">{topic.publishRate}</td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-sm">{topic.subscribeRate}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(topic.lastActivity).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => console.log('View topic:', topic.id)}
                          >
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => console.log('Manage:', topic.id)}
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

export default PubSubTopicPage;