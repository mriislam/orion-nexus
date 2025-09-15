'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import EnhancedRealtime from '@/components/analytics/EnhancedRealtime';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Activity } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { analyticsService } from '@/lib/services/analytics';
import { GACredentialsResponse } from '@/types';

const RealtimeAnalyticsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState<GACredentialsResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const creds = await analyticsService.getCredentials();
        setCredentials(creds);
        
        // Get property from URL parameter or use first available
        const propertyFromUrl = searchParams.get('property');
        if (propertyFromUrl && creds.some(cred => cred.property_id === propertyFromUrl)) {
          setSelectedProperty(propertyFromUrl);
        } else if (creds.length > 0) {
          setSelectedProperty(creds[0].property_id);
        }
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [searchParams]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/analytics${selectedProperty ? `?property=${selectedProperty}` : ''}`)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Analytics
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Real-time Analytics</h1>
                    <p className="text-sm text-gray-600">Monitor live user activity and engagement</p>
                  </div>
                </div>
              </div>
              
              {credentials.length > 0 && (
                <div className="flex items-center gap-4">
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.property_id}>
                        {cred.property_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {credentials.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Connected</h3>
                  <p className="text-gray-600 mb-4 max-w-md">
                    Connect your Google Analytics account to start monitoring real-time user activity.
                  </p>
                  <Button
                    onClick={() => router.push('/analytics')}
                    variant="primary"
                  >
                    Go to Analytics Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EnhancedRealtime propertyId={selectedProperty} />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RealtimeAnalyticsPage;