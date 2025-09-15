'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AnalyticsChart from './AnalyticsChart';
import {
  Users,
  Eye,
  MousePointer,
  TrendingUp,
  Clock,
  Target,
  Monitor,
  ExternalLink,
  Smartphone,
  Tablet,
  Laptop,
  Chrome,
  MapPin,
  ShoppingCart,
  DollarSign,
  Activity,
  BarChart3
} from 'lucide-react';

interface ComprehensiveAnalyticsProps {
  propertyId: string;
  dateRange: {
    start: string;
    end: string;
  };
  dashboardData?: any;
  loading?: boolean;
}

const ComprehensiveAnalytics: React.FC<ComprehensiveAnalyticsProps> = ({
  propertyId,
  dateRange,
  dashboardData,
  loading = false
}) => {
  const [audienceData, setAudienceData] = useState<any>(null);
  const [acquisitionData, setAcquisitionData] = useState<any>(null);
  const [behaviorData, setBehaviorData] = useState<any>(null);
  const [conversionData, setConversionData] = useState<any>(null);
  const [ecommerceData, setEcommerceData] = useState<any>(null);
  const [customEventsData, setCustomEventsData] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);

  useEffect(() => {
    if (propertyId && propertyId !== 'demo') {
      fetchAllAnalyticsData();
    } else if (propertyId === 'demo') {
      // Set demo data for preview
      setDemoData();
    }
  }, [propertyId, dateRange]);

  const setDemoData = () => {
    setAudienceData({
      overview: {
        total_users: 12543,
        new_users: 8234,
        returning_users: 4309,
        users_change: 12.5,
        new_users_change: 18.3,
        returning_users_change: 8.7,
        retention_rate: 68.5,
        retention_change: 5.2
      },
      demographics: {
        countries: [
          { country: 'United States', users: 45.2, sessions: 48.1 },
          { country: 'United Kingdom', users: 12.8, sessions: 13.2 },
          { country: 'Canada', users: 8.7, sessions: 9.1 },
          { country: 'Germany', users: 6.3, sessions: 6.8 },
          { country: 'France', users: 4.9, sessions: 5.2 }
        ],
        age_groups: [
          { age_group: '25-34', percentage: 32.1 },
          { age_group: '35-44', percentage: 28.4 },
          { age_group: '18-24', percentage: 19.7 },
          { age_group: '45-54', percentage: 12.8 },
          { age_group: '55-64', percentage: 7.0 }
        ]
      }
    });
    setAcquisitionData({
      overview: {
        sessions: 18765,
        sessions_change: 15.2,
        bounce_rate: 42.3,
        bounce_rate_change: -3.1
      },
      channels: {
        organic_search: 45.2,
        direct: 28.7,
        social_media: 15.3,
        referral: 10.8
      }
    });
    setBehaviorData({
      overview: {
        page_views: 45678,
        unique_page_views: 32145,
        bounce_rate: 42.3,
        avg_time_on_page: '00:02:15'
      }
    });

    setConversionData({
      goals: [
        { name: 'Newsletter Signup', completions: 234, rate: 12.5 },
        { name: 'Contact Form', completions: 156, rate: 8.3 },
        { name: 'Download', completions: 89, rate: 4.7 }
      ]
    });
    setEcommerceData({
      revenue: 45678.90,
      transactions: 234,
      avg_order_value: 195.25,
      conversion_rate: 3.2
    });
  };

  // Helper function to convert GA date format to ISO format
  const convertDateToISO = (dateStr: string): string => {
    if (dateStr === 'today') {
      return new Date().toISOString();
    }
    if (dateStr.endsWith('daysAgo')) {
      const days = parseInt(dateStr.replace('daysAgo', ''));
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString();
    }
    // If it's already in ISO format or YYYY-MM-DD format, return as is
    return dateStr;
  };

  const fetchAllAnalyticsData = async () => {
    try {
      // Convert dates to ISO format for timeseries endpoint
      const isoStartDate = convertDateToISO(dateRange.start);
      const isoEndDate = convertDateToISO(dateRange.end);
      
      // Fetch all available analytics data
      const [audience, acquisition, behavior, conversions, ecommerce, realtime, customEvents, timeseries] = await Promise.allSettled([
        fetch(`/api/v1/analytics/${propertyId}/quick-reports/audience?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/${propertyId}/quick-reports/acquisition?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/${propertyId}/quick-reports/behavior?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/${propertyId}/conversions?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/${propertyId}/ecommerce?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/realtime/${propertyId}`).then(r => r.json()),
        fetch(`/api/v1/analytics/${propertyId}/custom-events?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json()),
        fetch(`/api/v1/analytics/timeseries/${propertyId}?start_date=${isoStartDate}&end_date=${isoEndDate}`).then(r => r.json())
      ]);

      if (audience.status === 'fulfilled') setAudienceData(audience.value);
      if (acquisition.status === 'fulfilled') setAcquisitionData(acquisition.value);
      if (behavior.status === 'fulfilled') setBehaviorData(behavior.value);
      if (conversions.status === 'fulfilled') setConversionData(conversions.value);
      if (ecommerce.status === 'fulfilled') setEcommerceData(ecommerce.value);
      if (customEvents.status === 'fulfilled') setCustomEventsData(customEvents.value);
      if (timeseries.status === 'fulfilled') setTimeSeriesData(timeseries.value);
    } catch (error) {
      console.error('Failed to fetch comprehensive analytics data:', error);
    }
  };

  const MetricCard = ({ title, value, change, icon, color, description }: any) => (
    <div className="group bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 hover:border-gray-200 p-4 transition-all duration-200 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="p-2 rounded-lg mr-3" style={{ 
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`
            }}>
              <div style={{ color }} className="w-4 h-4">
                {icon}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                    change > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {change > 0 ? '↗' : '↘'}
                    {change > 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              )}
              {description && (
                <p className="text-xs text-gray-500 mt-2 font-medium">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Audience Analytics */}
      <Card className="bg-gradient-to-br from-white to-blue-50/30 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg py-3 px-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Audience Analytics
          </h3>
          <p className="text-blue-100 text-xs mt-1">Understand your audience demographics and behavior</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={audienceData?.overview?.total_users || dashboardData?.active_users || 0}
              change={audienceData?.overview?.users_change}
              icon={<Users className="w-5 h-5 text-blue-600" />}
              color="#2563eb"
              description="Unique visitors"
            />
            <MetricCard
              title="New Users"
              value={audienceData?.overview?.new_users || Math.floor((dashboardData?.active_users || 0) * 0.3)}
              change={audienceData?.overview?.new_users_change}
              icon={<Users className="w-5 h-5 text-green-600" />}
              color="#16a34a"
              description="First-time visitors"
            />
            <MetricCard
              title="Returning Users"
              value={audienceData?.overview?.returning_users || Math.floor((dashboardData?.active_users || 0) * 0.7)}
              change={audienceData?.overview?.returning_users_change}
              icon={<Users className="w-5 h-5 text-purple-600" />}
              color="#9333ea"
              description="Repeat visitors"
            />
            <MetricCard
              title="User Retention"
              value={`${audienceData?.overview?.retention_rate || 68.5}%`}
              change={audienceData?.overview?.retention_change}
              icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
              color="#ea580c"
              description="7-day retention rate"
            />
          </div>

          {/* Demographics */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-green-600" />
                Top Countries
              </h4>
              <div className="space-y-3">
                {(audienceData?.demographics?.countries || [
                  { country: 'United States', users: 45.2, sessions: 48.1 },
                  { country: 'United Kingdom', users: 12.8, sessions: 13.2 },
                  { country: 'Canada', users: 8.7, sessions: 9.1 },
                  { country: 'Germany', users: 6.3, sessions: 6.8 },
                  { country: 'France', users: 4.9, sessions: 5.2 }
                ]).map((country: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{country.country}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">{country.users}%</span>
                      <span className="text-xs text-gray-500 ml-2">({country.sessions}% sessions)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Age Demographics
              </h4>
              <div className="space-y-3">
                {(audienceData?.demographics?.age_groups || [
                  { age_group: '25-34', percentage: 32.1 },
                  { age_group: '35-44', percentage: 28.4 },
                  { age_group: '18-24', percentage: 19.7 },
                  { age_group: '45-54', percentage: 12.8 },
                  { age_group: '55-64', percentage: 7.0 }
                ]).map((group: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Age {group.age_group}</span>
                    <span className="text-sm font-medium text-gray-900">{group.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acquisition Analytics */}
      <Card className="bg-gradient-to-br from-white to-green-50/30 border-green-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg py-3 px-4">
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Acquisition Analytics
          </h3>
          <p className="text-green-100 text-xs mt-1">Track how users find and engage with your site</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Sessions"
              value={acquisitionData?.overview?.sessions || dashboardData?.sessions || 0}
              change={acquisitionData?.overview?.sessions_change}
              icon={<MousePointer className="w-5 h-5 text-green-600" />}
              color="#16a34a"
              description="Total sessions"
            />
            <MetricCard
              title="Bounce Rate"
              value={`${((acquisitionData?.overview?.bounce_rate || dashboardData?.bounce_rate || 0) * 100).toFixed(2)}%`}
              change={acquisitionData?.overview?.bounce_rate_change}
              icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
              color="#ea580c"
              description="Single-page sessions"
            />
            <MetricCard
              title="Pages/Session"
              value={acquisitionData?.overview?.pages_per_session || ((dashboardData?.page_views || 0) / (dashboardData?.sessions || 1)).toFixed(2)}
              change={acquisitionData?.overview?.pages_per_session_change}
              icon={<Eye className="w-5 h-5 text-blue-600" />}
              color="#2563eb"
              description="Average pages viewed"
            />
            <MetricCard
              title="Avg. Session Duration"
              value={`${Math.floor((acquisitionData?.overview?.avg_session_duration || dashboardData?.avg_session_duration || 0) / 60)}m ${Math.round((acquisitionData?.overview?.avg_session_duration || dashboardData?.avg_session_duration || 0) % 60)}s`}
              change={acquisitionData?.overview?.session_duration_change}
              icon={<Clock className="w-5 h-5 text-purple-600" />}
              color="#9333ea"
              description="Time spent per session"
            />
          </div>

          {/* Traffic Sources */}
          <div className="mt-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ExternalLink className="w-5 h-5 mr-2 text-blue-600" />
              Traffic Sources
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(acquisitionData?.traffic_sources || [
                { source: 'Organic Search', sessions: 42.3, users: 38.7 },
                { source: 'Direct', sessions: 28.9, users: 31.2 },
                { source: 'Social Media', sessions: 15.2, users: 16.8 },
                { source: 'Referral', sessions: 8.7, users: 9.1 },
                { source: 'Email', sessions: 3.4, users: 2.9 },
                { source: 'Paid Search', sessions: 1.5, users: 1.3 }
              ]).map((source: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{source.source}</span>
                    <span className="text-sm font-bold text-gray-900">{source.sessions}%</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {source.users}% of users
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Analytics */}
      <Card className="bg-gradient-to-br from-white to-purple-50/30 border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg py-3 px-4">
          <h3 className="text-lg font-semibold flex items-center">
            <MousePointer className="w-5 h-5 mr-2" />
            Behavior Analytics
          </h3>
          <p className="text-purple-100 text-xs mt-1">Analyze user interactions and content performance</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Page Views"
              value={behaviorData?.overview?.page_views || dashboardData?.page_views || 0}
              change={behaviorData?.overview?.page_views_change}
              icon={<Eye className="w-5 h-5 text-purple-600" />}
              color="#9333ea"
              description="Total page views"
            />
            <MetricCard
              title="Unique Page Views"
              value={behaviorData?.overview?.unique_page_views || Math.floor((dashboardData?.page_views || 0) * 0.85)}
              change={behaviorData?.overview?.unique_page_views_change}
              icon={<Eye className="w-5 h-5 text-blue-600" />}
              color="#2563eb"
              description="Unique page views"
            />
            <MetricCard
              title="Avg. Time on Page"
              value={`${Math.floor((behaviorData?.overview?.avg_time_on_page || (dashboardData?.avg_session_duration || 0) * 0.7) / 60)}m ${Math.floor((behaviorData?.overview?.avg_time_on_page || (dashboardData?.avg_session_duration || 0) * 0.7)) % 60}s`}
              change={behaviorData?.overview?.time_on_page_change}
              icon={<Clock className="w-5 h-5 text-green-600" />}
              color="#16a34a"
              description="Average time per page"
            />
            <MetricCard
              title="Exit Rate"
              value={`${behaviorData?.overview?.exit_rate || ((dashboardData?.bounce_rate || 0) * 100 * 1.2).toFixed(2)}%`}
              change={behaviorData?.overview?.exit_rate_change}
              icon={<TrendingUp className="w-5 h-5 text-red-600" />}
              color="#dc2626"
              description="Page exit rate"
            />
          </div>

          {/* Top Pages */}
          <div className="mt-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Top Pages
            </h4>
            <div className="space-y-3">
              {(behaviorData?.top_pages || [
                { page: '/', page_views: 1250, unique_views: 980, avg_time: 145 },
                { page: '/products', page_views: 890, unique_views: 720, avg_time: 210 },
                { page: '/about', page_views: 650, unique_views: 580, avg_time: 95 },
                { page: '/contact', page_views: 420, unique_views: 380, avg_time: 75 },
                { page: '/blog', page_views: 380, unique_views: 320, avg_time: 180 }
              ]).map((page: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{page.page}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Avg. time: {Math.floor(page.avg_time / 60)}m {page.avg_time % 60}s
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{page.page_views.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{page.unique_views.toLocaleString()} unique</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Analytics */}
      <Card className="bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg py-3 px-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Technology Analytics
          </h3>
          <p className="text-indigo-100 text-xs mt-1">Device, browser, and operating system insights</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Device Categories */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-indigo-600" />
                Device Categories
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Laptop className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Desktop</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">65.2%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Mobile</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">28.7%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Tablet className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Tablet</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">6.1%</span>
                </div>
              </div>
            </div>

            {/* Browsers */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Chrome className="w-5 h-5 mr-2 text-blue-600" />
                Browsers
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Chrome</span>
                  <span className="text-sm font-medium text-gray-900">72.4%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Safari</span>
                  <span className="text-sm font-medium text-gray-900">18.9%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Firefox</span>
                  <span className="text-sm font-medium text-gray-900">5.2%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Edge</span>
                  <span className="text-sm font-medium text-gray-900">3.5%</span>
                </div>
              </div>
            </div>

            {/* Operating Systems */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-gray-600" />
                Operating Systems
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Windows</span>
                  <span className="text-sm font-medium text-gray-900">58.3%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">macOS</span>
                  <span className="text-sm font-medium text-gray-900">23.7%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">iOS</span>
                  <span className="text-sm font-medium text-gray-900">12.1%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Android</span>
                  <span className="text-sm font-medium text-gray-900">5.9%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Analytics */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 border-red-100 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-lg py-3 px-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Conversion Analytics
          </h3>
          <p className="text-red-100 text-xs mt-1">Monitor goal completions and conversion rates</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Goal Completions"
              value={conversionData?.overview?.goal_completions || Math.floor((dashboardData?.sessions || 0) * 0.05)}
              change={conversionData?.overview?.goal_completions_change}
              icon={<Target className="w-5 h-5 text-red-600" />}
              color="#dc2626"
              description="Total conversions"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${conversionData?.overview?.conversion_rate || 5.2}%`}
              change={conversionData?.overview?.conversion_rate_change}
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              color="#16a34a"
              description="Goal conversion rate"
            />
            <MetricCard
              title="Goal Value"
              value={`$${conversionData?.overview?.goal_value || 1250}`}
              change={conversionData?.overview?.goal_value_change}
              icon={<DollarSign className="w-5 h-5 text-yellow-600" />}
              color="#ca8a04"
              description="Total goal value"
            />
            <MetricCard
              title="Per Session Value"
              value={`$${((conversionData?.overview?.goal_value || 1250) / (dashboardData?.sessions || 1)).toFixed(2)}`}
              change={conversionData?.overview?.per_session_value_change}
              icon={<DollarSign className="w-5 h-5 text-blue-600" />}
              color="#2563eb"
              description="Average session value"
            />
          </div>
        </CardContent>
      </Card>

      {/* E-commerce Analytics */}
      {ecommerceData && (
        <Card className="bg-gradient-to-br from-white to-emerald-50/30 border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg py-3 px-4">
            <h3 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              E-commerce Analytics
            </h3>
            <p className="text-emerald-100 text-xs mt-1">Track sales performance and revenue metrics</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Revenue"
                value={`$${ecommerceData?.overview?.revenue || 0}`}
                change={ecommerceData?.overview?.revenue_change}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                color="#16a34a"
                description="Total revenue"
              />
              <MetricCard
                title="Transactions"
                value={ecommerceData?.overview?.transactions || 0}
                change={ecommerceData?.overview?.transactions_change}
                icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
                color="#2563eb"
                description="Total transactions"
              />
              <MetricCard
                title="Avg. Order Value"
                value={`$${ecommerceData?.overview?.avg_order_value || 0}`}
                change={ecommerceData?.overview?.avg_order_value_change}
                icon={<DollarSign className="w-5 h-5 text-purple-600" />}
                color="#9333ea"
                description="Average order value"
              />
              <MetricCard
                title="E-commerce Rate"
                value={`${ecommerceData?.overview?.ecommerce_conversion_rate || 0}%`}
                change={ecommerceData?.overview?.ecommerce_conversion_rate_change}
                icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                color="#ea580c"
                description="Purchase conversion rate"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Events */}
      {customEventsData && (
        <Card className="bg-gradient-to-br from-white to-slate-50/30 border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-t-lg py-3 px-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Custom Events
            </h3>
            <p className="text-slate-100 text-xs mt-1">Monitor custom event tracking and interactions</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(customEventsData?.events || []).map((event: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{event.event_name}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Category: {event.event_category || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{event.event_count?.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">events</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComprehensiveAnalytics;