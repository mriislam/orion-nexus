'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  ArrowLeft, 
  Settings, 
  Activity, 
  Globe, 
  Download, 
  Filter, 
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { analyticsService } from '@/lib/services/analytics';
import { GACredentialsResponse } from '@/types';

const AnalyticsSettingsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [credentials, setCredentials] = useState<GACredentialsResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '7daysAgo', end: 'today' });

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
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
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Settings className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Settings</h1>
                    <p className="text-sm text-gray-600">Configure your analytics dashboard preferences</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Dashboard Preferences */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Dashboard Preferences
                </h3>
                <p className="text-sm text-gray-600">Customize your analytics dashboard experience</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Auto-refresh Dashboard</label>
                      <p className="text-xs text-gray-500 mt-1">Automatically refresh data every 5 minutes</p>
                    </div>
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoRefresh ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Default Date Range</label>
                      <p className="text-xs text-gray-500 mt-1">Default time period for new reports</p>
                    </div>
                    <select
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="7daysAgo">Last 7 days</option>
                      <option value="30daysAgo">Last 30 days</option>
                      <option value="90daysAgo">Last 90 days</option>
                      <option value="365daysAgo">Last year</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Real-time Updates</label>
                      <p className="text-xs text-gray-500 mt-1">Enable live data updates for real-time metrics</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Globe className="w-5 h-5 text-green-500" />
                  Data & Privacy
                </h3>
                <p className="text-sm text-gray-600">Manage data retention and privacy settings</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Data Retention Period</label>
                      <p className="text-xs text-gray-500 mt-1">How long to keep cached analytics data locally</p>
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="1">1 day</option>
                      <option value="7" selected>7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Anonymous Data Collection</label>
                      <p className="text-xs text-gray-500 mt-1">Allow anonymous usage analytics to improve the dashboard</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-yellow-200 rounded-full">
                        <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Data Privacy Notice</h4>
                        <p className="text-xs text-yellow-700 mt-1">
                          Your analytics data is processed securely and never shared with third parties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Settings */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-500" />
                  Export Settings
                </h3>
                <p className="text-sm text-gray-600">Configure data export preferences</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Default Export Format</label>
                      <p className="text-xs text-gray-500 mt-1">Choose the default format for data exports</p>
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="csv">CSV</option>
                      <option value="xlsx">Excel (XLSX)</option>
                      <option value="json">JSON</option>
                      <option value="pdf">PDF Report</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Include Metadata</label>
                      <p className="text-xs text-gray-500 mt-1">Export additional context and configuration data</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="secondary" className="flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Current Data
                    </Button>
                    <Button variant="secondary" className="flex items-center justify-center gap-2">
                      <Settings className="w-4 h-4" />
                      Schedule Exports
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Configuration */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Filter className="w-5 h-5 text-orange-500" />
                  Advanced Configuration
                </h3>
                <p className="text-sm text-gray-600">Advanced settings for power users</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Rate Limiting</label>
                    <p className="text-xs text-gray-500 mb-3">Configure request throttling to avoid hitting Google Analytics API limits</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Requests per minute</label>
                        <input
                          type="number"
                          defaultValue="100"
                          min="1"
                          max="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Batch size</label>
                        <input
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                      <p className="text-xs text-gray-500 mt-1">Enable detailed logging for troubleshooting</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                    </button>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Reset Configuration</h4>
                    <p className="text-xs text-red-700 mb-3">
                      This will reset all settings to default values and clear cached data.
                    </p>
                    <Button variant="danger" size="sm">
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Management */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Metrics Management
                </h3>
                <p className="text-sm text-gray-600">Manage and refresh your analytics metrics</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Metrics Collection</h4>
                      <p className="text-xs text-gray-500 mt-1">Refresh analytics data from Google Analytics</p>
                    </div>
                    <Button variant="secondary" className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Now
                    </Button>
                  </div>
                  
                  {credentials.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Connected Properties</h4>
                      <div className="space-y-2">
                        {credentials.map((cred) => (
                          <div key={cred.id} className="flex items-center justify-between text-sm">
                            <span className="text-blue-700">{cred.property_id}</span>
                            <span className="text-blue-600">Active</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const AnalyticsSettingsPage = () => {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    }>
      <AnalyticsSettingsContent />
    </Suspense>
  );
};

export default AnalyticsSettingsPage;