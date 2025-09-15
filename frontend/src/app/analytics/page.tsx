'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  GACredentialsResponse, 
  GAMetric, 
  GADashboardData, 
  GAMetricType,
  GACredentialsCreate
} from '@/types';
import { analyticsService } from '@/lib/services/analytics';
import {
  BarChart3,
  Users,
  Eye,
  MousePointer,
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Plus,
  Activity,
  Target,
  Monitor,
  ExternalLink,
  Smartphone,
  Tablet,
  Laptop,
  Chrome,
  MapPin,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';
import MetricsCard from '@/components/analytics/MetricsCard';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import RealtimeChart from '@/components/analytics/RealtimeChart';
import DateRangePicker from '@/components/analytics/DateRangePicker';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import EnhancedAnalytics from '@/components/analytics/EnhancedAnalytics';
import ComprehensiveAnalytics from '@/components/analytics/ComprehensiveAnalytics';
import EnhancedRealtime from '@/components/analytics/EnhancedRealtime';
import EnhancedReports from '@/components/analytics/EnhancedReports';
import PagesAndScreens from '@/components/analytics/PagesAndScreens';

const AnalyticsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [credentials, setCredentials] = useState<GACredentialsResponse[]>([]);
  const [metrics, setMetrics] = useState<GAMetric[]>([]);
  const [dashboardData, setDashboardData] = useState<GADashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'reports' | 'pages-screens' | 'settings'>('overview');
  
  // New state for enhanced features
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '7daysAgo', end: 'today', startDate: '', endDate: '' });
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [dailyUsers, setDailyUsers] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  
  // Form states
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credentialForm, setCredentialForm] = useState<GACredentialsCreate>({
    property_id: '',
    service_account_json: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Quick Reports states
  const [quickReportData, setQuickReportData] = useState<any>(null);
  const [quickReportType, setQuickReportType] = useState<string>('');
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [searchParams]);

  useEffect(() => {
    if (credentials.length > 0) {
      fetchMetrics();
      fetchDashboardData();
      if (selectedProperty) {
        fetchEnhancedData();
      }
    }
  }, [credentials, selectedProperty]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && selectedProperty && activeTab === 'realtime') {
      // Initial fetch when entering real-time tab
      fetchRealtimeData();
      
      // Set up auto-refresh every 30 seconds for real-time data
      interval = setInterval(() => {
        fetchRealtimeData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedProperty, activeTab]);

  const fetchCredentials = async () => {
    try {
      const data = await analyticsService.getCredentials();
      setCredentials(data);
      
      // Get property from URL parameter or use first available
      const propertyFromUrl = searchParams.get('property');
      if (propertyFromUrl && data.some(cred => cred.property_id === propertyFromUrl)) {
        setSelectedProperty(propertyFromUrl);
      } else if (data.length > 0) {
        setSelectedProperty(data[0].property_id);
        // Update URL with the selected property if no property in URL
        if (!propertyFromUrl) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('property', data[0].property_id);
          router.replace(newUrl.pathname + newUrl.search);
        }
      }
    } catch (error) {
      console.error('Failed to fetch GA credentials:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      // First try to get existing metrics
      let data = await analyticsService.getMetrics();
      
      // If no metrics found and we have credentials, trigger collection
      if (data.length === 0 && credentials.length > 0) {
        console.log('No metrics found, triggering collection...');
        await analyticsService.triggerMetricCollection(credentials[0].property_id);
        
        // Wait a moment and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        data = await analyticsService.getMetrics({ property_id: credentials[0].property_id });
      }
      
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch GA metrics:', error);
      // Set empty array to prevent loading state from hanging
      setMetrics([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Note: This requires a property_id, adjust based on available credentials
      if (credentials.length > 0) {
        const propertyId = selectedProperty || credentials[0].property_id;
        const data = await analyticsService.getDashboardData(propertyId);
        setDashboardData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };



  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please select a valid JSON file');
        return;
      }
      
      setSelectedFile(file);
      
      try {
        const text = await file.text();
        // Validate JSON format
        JSON.parse(text);
        setCredentialForm({ ...credentialForm, service_account_json: text });
      } catch (error) {
        alert('Invalid JSON file format');
        setSelectedFile(null);
      }
    }
  };

  const handleCreateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await analyticsService.createCredentials(credentialForm);
      await fetchCredentials();
      setShowCredentialForm(false);
      setCredentialForm({ property_id: '', service_account_json: '' });
      setSelectedFile(null);
      alert('Google Analytics credentials created successfully!');
    } catch (error: any) {
      console.error('Failed to create GA credentials:', error);
      
      // Extract error message from the response
      let errorMessage = 'Failed to create credentials';
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredentials = async (id: string) => {
    if (!confirm('Are you sure you want to delete these credentials?')) return;
    
    try {
      await analyticsService.deleteCredentials(id);
      await fetchCredentials();
    } catch (error) {
      console.error('Failed to delete GA credentials:', error);
    }
  };

  const triggerMetricsCollection = async () => {
    setLoading(true);
    try {
      // Note: This triggers collection for all properties, adjust if needed for specific property
      if (credentials.length > 0) {
        await analyticsService.triggerMetricCollection(credentials[0].property_id);
        setTimeout(() => {
          fetchMetrics();
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger metrics collection:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Quick Reports functions
  const generateQuickReport = async (reportType: string) => {
    if (!selectedProperty) return;
    
    setReportLoading(true);
    setQuickReportType(reportType);
    
    try {
      const response = await fetch(`/api/analytics/${selectedProperty}/quick-reports/${reportType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate ${reportType} report`);
      }
      
      const data = await response.json();
      setQuickReportData(data);
      setShowReportPreview(true);
    } catch (error) {
      console.error(`Failed to generate ${reportType} report:`, error);
    } finally {
      setReportLoading(false);
    }
  };
  
  const downloadReport = (format: 'csv' | 'pdf') => {
    if (!quickReportData) return;
    
    if (format === 'csv') {
      downloadCSV();
    } else {
      downloadPDF();
    }
  };
  
  const downloadCSV = () => {
    if (!quickReportData) return;
    
    let csvContent = '';
    const reportType = quickReportData.report_type;
    
    // Generate CSV based on report type
    if (reportType === 'audience') {
      csvContent = 'Country,City,Age Group,Gender,Active Users,Sessions,Session Duration\n';
      quickReportData.demographics.forEach((item: any) => {
        csvContent += `${item.country},${item.city},${item.age_group},${item.gender},${item.active_users},${item.sessions},${item.session_duration}\n`;
      });
    } else if (reportType === 'content') {
      csvContent = 'Page Path,Page Title,Page Views,Unique Views,Avg Time on Page,Bounce Rate\n';
      quickReportData.page_performance.forEach((item: any) => {
        csvContent += `${item.page_path},"${item.page_title}",${item.page_views},${item.unique_page_views},${item.avg_time_on_page},${item.bounce_rate}\n`;
      });
    } else if (reportType === 'acquisition') {
      csvContent = 'Source,Medium,Campaign,Sessions,New Users,Bounce Rate,Avg Session Duration\n';
      quickReportData.traffic_sources.forEach((item: any) => {
        csvContent += `${item.source},${item.medium},${item.campaign},${item.sessions},${item.new_users},${item.bounce_rate},${item.avg_session_duration}\n`;
      });
    } else if (reportType === 'behavior') {
      csvContent = 'Page Path,Event Name,Event Count,Page Views,Engagement Duration\n';
      quickReportData.user_flow.forEach((item: any) => {
        csvContent += `${item.page_path},${item.event_name},${item.event_count},${item.page_views},${item.engagement_duration}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const downloadPDF = () => {
    // For now, we'll create a simple HTML-to-PDF download
    // In a real implementation, you'd use a library like jsPDF or html2pdf
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const htmlContent = generatePDFContent();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  const generatePDFContent = () => {
    if (!quickReportData) return '';
    
    const reportType = quickReportData.report_type;
    const dateRange = `${quickReportData.date_range.start_date} to ${quickReportData.date_range.end_date}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h1>
        <p><strong>Date Range:</strong> ${dateRange}</p>
        <p><strong>Property ID:</strong> ${quickReportData.property_id}</p>
        
        <div class="summary">
          <h3>Summary</h3>
          ${Object.entries(quickReportData.summary).map(([key, value]) => 
            `<p><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value}</p>`
          ).join('')}
        </div>
        
        <h3>Detailed Data</h3>
        ${generateTableHTML()}
      </body>
      </html>
    `;
  };
  
  const generateTableHTML = () => {
    if (!quickReportData) return '';
    
    const reportType = quickReportData.report_type;
    
    if (reportType === 'audience') {
      return `
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th>City</th>
              <th>Age Group</th>
              <th>Gender</th>
              <th>Active Users</th>
              <th>Sessions</th>
              <th>Session Duration</th>
            </tr>
          </thead>
          <tbody>
            ${quickReportData.demographics.map((item: any) => `
              <tr>
                <td>${item.country}</td>
                <td>${item.city}</td>
                <td>${item.age_group}</td>
                <td>${item.gender}</td>
                <td>${item.active_users}</td>
                <td>${item.sessions}</td>
                <td>${item.session_duration}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    return '<p>No data available</p>';
  };

  const prepareChartData = (dailyUsers: any[], pageViews: any[], countryData: any[]) => {
    // Prepare timeline data from actual API data
    const timelineLabels = dailyUsers.slice(-7).map((item: any) => 
      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    const timelineUsers = dailyUsers.slice(-7).map((item: any) => item.active_users || 0);
    const timelinePageViews = pageViews.slice(-7).map((item: any) => item.page_views || 0);
    const timelineSessions = dailyUsers.slice(-7).map((item: any) => item.sessions || Math.floor(item.active_users * 0.8));
    
    return {
      timeline: {
        labels: timelineLabels,
        users: timelineUsers,
        pageViews: timelinePageViews,
        sessions: timelineSessions
      },
      trafficSources: {
        labels: ['Organic Search', 'Direct', 'Social Media', 'Referral', 'Email'],
        data: [45, 25, 15, 10, 5] // Mock data - would come from API
      },
      topPages: {
        labels: pageViews.slice(0, 5).map((item: any) => item.page_path || 'Unknown'),
        data: pageViews.slice(0, 5).map((item: any) => item.page_views || 0)
      }
    };
  };

  const fetchEnhancedData = async () => {
    if (!selectedProperty) return;
    
    try {
      setLoading(true);
      
      // Build query parameters from active filters
      const buildFilterParams = () => {
        const params = new URLSearchParams();
        
        // Add date range
        if (dateRange.startDate) {
          params.append('startDate', dateRange.startDate);
        }
        if (dateRange.endDate) {
          params.append('endDate', dateRange.endDate);
        }
        if (dateRange.start && dateRange.start !== '7daysAgo') {
          params.append('startDate', dateRange.start);
        }
        if (dateRange.end && dateRange.end !== 'today') {
          params.append('endDate', dateRange.end);
        }
        
        // Add active filters
        activeFilters.forEach(filter => {
          if (filter.type === 'metric') {
            params.append('metrics', filter.value);
          } else if (filter.type === 'dimension') {
            params.append('dimensions', filter.value);
          } else if (filter.type === 'segment') {
            params.append('segments', filter.value);
          }
        });
        
        return params.toString();
      };
      
      const filterParams = buildFilterParams();
      const queryString = filterParams ? `?${filterParams}` : '';
      
      const [dailyUsersRes, pageViewsRes, countryRes] = await Promise.all([
        fetch(`/api/v1/analytics/${selectedProperty}/daily-active-users${queryString}`),
        fetch(`/api/v1/analytics/${selectedProperty}/page-views${queryString}`),
        fetch(`/api/v1/analytics/${selectedProperty}/users-by-country${queryString}`)
      ]);
      
      let dailyUsersData: any[] = [];
      let pageViewsData: any[] = [];
      let countryDataResult: any[] = [];
      
      if (dailyUsersRes.ok) {
        const data = await dailyUsersRes.json();
        dailyUsersData = data.daily_active_users || [];
        setDailyUsers(dailyUsersData);
      }
      
      if (pageViewsRes.ok) {
        const data = await pageViewsRes.json();
        pageViewsData = data.page_views || [];
        setPageViews(pageViewsData);
      }
      
      if (countryRes.ok) {
        const data = await countryRes.json();
        countryDataResult = data.users_by_country || [];
        setCountryData(countryDataResult);
      }
      
      // Prepare chart data
      const charts = prepareChartData(dailyUsersData, pageViewsData, countryDataResult);
      setChartData(charts);
    } catch (error) {
      console.error('Failed to fetch enhanced data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await fetch(`/api/v1/analytics/${selectedProperty}/realtime-report`);
      if (response.ok) {
        const data = await response.json();
        setRealtimeData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  };

  const getMetricTypeColor = (metricType: GAMetricType): 'success' | 'warning' | 'info' | 'secondary' | 'danger' | 'default' => {
    const colors: Record<GAMetricType, 'success' | 'warning' | 'info' | 'secondary' | 'danger' | 'default'> = {
      [GAMetricType.ACTIVE_USERS]: 'success',
      [GAMetricType.SESSIONS]: 'info',
      [GAMetricType.PAGE_VIEWS]: 'secondary',
      [GAMetricType.BOUNCE_RATE]: 'warning',
      [GAMetricType.SESSION_DURATION]: 'info',
      [GAMetricType.CONVERSIONS]: 'success',
      [GAMetricType.REVENUE]: 'success'
    };
    return colors[metricType] || 'default';
  };

  const formatMetricValue = (metric: GAMetric) => {
    switch (metric.metric_type) {
      case GAMetricType.BOUNCE_RATE:
        return `${(metric.value * 100).toFixed(1)}%`;
      case GAMetricType.SESSION_DURATION:
        return `${Math.round(metric.value)}s`;
      case GAMetricType.REVENUE:
        return `$${metric.value.toFixed(2)}`;
      default:
        return metric.value.toLocaleString();
    }
  };

  const formatChangePercentage = (change?: number) => {
    if (change === undefined) return null;
    const isPositive = change > 0;
    return (
      <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        {/* Firebase-style Header Section - Moved to Top */}
        {/* Compact Merged Header with Integrated Controls */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)'
            }}></div>
          </div>
          
          <div className="relative container mx-auto px-3 lg:px-4 py-3 lg:py-4">
            {/* Top Row - Title and Status */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 mb-3">
              {/* Compact Title */}
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="relative p-1.5 lg:p-2 bg-white/20 backdrop-blur-sm rounded-lg shadow-lg border border-white/30">
                  <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-lg lg:text-xl font-bold text-white">
                    Google Analytics
                    <span className="ml-2 text-xs font-normal text-blue-200">Dashboard</span>
                  </h1>
                  <p className="text-xs lg:text-sm text-blue-100">Monitor website performance and user engagement</p>
                </div>
              </div>
              
              {/* Status Indicator */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm border text-xs ${
                selectedProperty 
                  ? 'bg-green-500/20 border-green-400/50 text-green-100' 
                  : 'bg-yellow-500/20 border-yellow-400/50 text-yellow-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  selectedProperty ? 'bg-green-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                }`}></div>
                <span className="font-medium">
                  {selectedProperty ? '✅ Connected' : '⚠️ Select Property'}
                </span>
              </div>
            </div>
            
            {/* Bottom Row - Controls */}
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              {/* Property Selector with Filter */}
              {credentials.length > 0 && (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm p-2 rounded-lg border border-white/30">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></div>
                  <select
                    value={selectedProperty}
                    onChange={(e) => {
                      const newProperty = e.target.value;
                      setSelectedProperty(newProperty);
                      const newUrl = new URL(window.location.href);
                      if (newProperty) {
                        newUrl.searchParams.set('property', newProperty);
                      } else {
                        newUrl.searchParams.delete('property');
                      }
                      router.replace(newUrl.pathname + newUrl.search);
                    }}
                    className="px-2.5 py-1 border border-white/30 rounded-md focus:outline-none focus:ring-1 focus:ring-white/50 bg-white/10 text-white text-xs min-w-[160px] backdrop-blur-sm"
                  >
                    <option value="" className="text-gray-800">🔍 Select Property</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.property_id} className="text-gray-800">
                        📊 {cred.property_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Date Range Picker */}
              <div className="bg-white/15 backdrop-blur-sm rounded-lg border border-white/30">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onApply={fetchEnhancedData}
                />
              </div>
              
              {/* Analytics Filters */}
              <div className="bg-white/15 backdrop-blur-sm rounded-lg border border-white/30">
                <AnalyticsFilters
                  onFiltersChange={setActiveFilters}
                  onApply={fetchEnhancedData}
                  loading={loading}
                />
              </div>
              
              {/* Action Buttons */}
              <button 
                onClick={fetchEnhancedData}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300 text-xs disabled:opacity-50 border border-white/30"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              
              <button 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 text-xs border ${
                  autoRefresh 
                    ? 'bg-green-500/90 backdrop-blur-sm text-white border-green-400/50' 
                    : 'bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30'
                }`}
              >
                <Activity className={`w-3 h-3 ${autoRefresh ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{autoRefresh ? 'Live' : 'Manual'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation - Firebase Style */}
        <div className="mb-6 lg:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 lg:px-6 py-3 lg:py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <h2 className="text-base lg:text-lg font-semibold text-gray-800">Analytics Dashboard</h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Navigate through different analytics sections</p>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3, description: 'Key metrics & insights' },
                { key: 'realtime', label: 'Realtime', icon: Activity, description: 'Live user activity' },
                { key: 'reports', label: 'Reports', icon: Target, description: 'Detailed analytics' },
                { key: 'pages-screens', label: 'Pages & Screens', icon: Monitor, description: 'Page performance' },
                { key: 'settings', label: 'Settings', icon: Settings, description: 'Configuration' }
              ].map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as 'overview' | 'realtime' | 'reports' | 'pages-screens' | 'settings')}
                    className={`group relative flex-1 p-4 text-left transition-all duration-500 ease-out transform hover:scale-[1.02] ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b-4 border-blue-500 shadow-lg'
                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 border-b-4 border-transparent hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all duration-500 transform group-hover:rotate-3 group-hover:scale-110 ${
                        isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg animate-pulse' 
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gradient-to-r group-hover:from-blue-100 group-hover:to-indigo-100 group-hover:text-blue-600'
                      }`}>
                        <Icon className="w-5 h-5 transition-transform duration-300" />
                      </div>
                      <div>
                        <div className={`font-semibold transition-colors ${
                          isActive ? 'text-blue-600' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {tab.label}
                        </div>
                        <div className={`text-xs transition-colors ${
                          isActive ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-600'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                    )}
                    
                    {/* Hover effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isActive ? 'opacity-100' : ''
                    }`} />
                  </button>
                );
              })}
            </nav>
            
            {/* Mobile Navigation */}
            <nav className="lg:hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                {[
                  { key: 'overview', label: 'Overview', icon: BarChart3 },
                  { key: 'realtime', label: 'Realtime', icon: Activity },
                  { key: 'reports', label: 'Reports', icon: Target },
                  { key: 'pages-screens', label: 'Pages & Screens', icon: Monitor },
                  { key: 'settings', label: 'Settings', icon: Settings }
                ].map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as 'overview' | 'realtime' | 'reports' | 'pages-screens' | 'settings')}
                      className={`group relative p-3 sm:p-4 text-center transition-all duration-500 ease-out transform hover:scale-105 border-b-4 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-lg'
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 border-transparent hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg transition-all duration-500 transform group-hover:rotate-6 group-hover:scale-110 ${
                          isActive 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg animate-pulse' 
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gradient-to-r group-hover:from-blue-100 group-hover:to-indigo-100 group-hover:text-blue-600'
                        }`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300" />
                        </div>
                        <div className={`text-xs sm:text-sm font-medium transition-colors ${
                          isActive ? 'text-blue-600' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {tab.label}
                        </div>
                      </div>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                      )}
                      
                      {/* Hover effect */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isActive ? 'opacity-100' : ''
                      }`} />
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Firebase-style Status Banner */}
          {lastUpdated && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">Live Data</span>
                  <span className="text-xs text-green-600">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
                {selectedProperty && (
                  <span className="text-xs bg-white px-2 py-1 rounded border text-gray-600">
                    Property: {selectedProperty}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filter Status Indicator */}
          {activeFilters.length > 0 && (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">
                        {activeFilters.length} Active Filter{activeFilters.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeFilters.slice(0, 3).map((filter) => (
                        <span
                          key={filter.id}
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200"
                        >
                          {filter.label}
                        </span>
                      ))}
                      {activeFilters.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded border border-blue-200">
                          +{activeFilters.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setActiveFilters([]);
                      fetchEnhancedData();
                    }}
                    variant="secondary"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800 px-2 py-1 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compact Main Analytics Overview Grid */}
          {selectedProperty && (
            <div className="space-y-3">
              {/* Key Metrics Cards - Reduced Padding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Users Metric */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-700">Total Users</p>
                        <p className="text-lg font-bold text-blue-900">
                           {dashboardData?.active_users?.toLocaleString() || '0'}
                         </p>
                        <p className="text-xs text-blue-600">Unique visitors</p>
                      </div>
                      <div className="p-1.5 bg-blue-200 rounded-md">
                        <Users className="w-4 h-4 text-blue-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Page Views Metric */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-green-700">Page Views</p>
                        <p className="text-lg font-bold text-green-900">
                           {dashboardData?.page_views?.toLocaleString() || '0'}
                         </p>
                        <p className="text-xs text-green-600">Total views</p>
                      </div>
                      <div className="p-1.5 bg-green-200 rounded-md">
                        <Eye className="w-4 h-4 text-green-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sessions Metric */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-700">Sessions</p>
                        <p className="text-lg font-bold text-purple-900">
                          {dashboardData?.sessions?.toLocaleString() || '0'}
                        </p>
                        <p className="text-xs text-purple-600">User sessions</p>
                      </div>
                      <div className="p-1.5 bg-purple-200 rounded-md">
                        <Activity className="w-4 h-4 text-purple-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bounce Rate Metric */}
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-orange-700">Bounce Rate</p>
                        <p className="text-lg font-bold text-orange-900">
                           {dashboardData?.bounce_rate ? `${(dashboardData.bounce_rate * 100).toFixed(1)}%` : '0%'}
                         </p>
                        <p className="text-xs text-orange-600">Single page visits</p>
                      </div>
                      <div className="p-1.5 bg-orange-200 rounded-md">
                        <TrendingDown className="w-4 h-4 text-orange-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section - Reduced Gap */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Traffic Chart - Compact */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Traffic Overview</h3>
                        <p className="text-xs text-gray-600">Daily visitors and page views</p>
                      </div>
                      <BarChart3 className="w-4 h-4 text-gray-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <AnalyticsChart 
                       title="Traffic Overview"
                       type="line"
                       data={{
                         labels: dashboardData?.top_pages?.map(p => p.page_path) || [],
                         datasets: [{
                           label: 'Page Views',
                           data: dashboardData?.top_pages?.map(p => p.page_views) || [],
                           borderColor: 'rgb(59, 130, 246)',
                           backgroundColor: 'rgba(59, 130, 246, 0.1)',
                           fill: true,
                           tension: 0.4
                         }]
                       }}
                     />
                  </CardContent>
                </Card>

                {/* Realtime Chart - Compact */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Realtime Activity</h3>
                        <p className="text-xs text-gray-600">Current active users</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600">Live</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <RealtimeChart 
                       title="Active Users"
                       data={{
                         labels: realtimeData?.labels || ['Now', '5m ago', '10m ago', '15m ago', '20m ago'],
                         datasets: [{
                           label: 'Active Users',
                           data: realtimeData?.datasets?.[0]?.data || [12, 15, 8, 20, 18],
                           borderColor: 'rgb(34, 197, 94)',
                           backgroundColor: 'rgba(34, 197, 94, 0.1)',
                           fill: true
                         }]
                       }}
                     />
                  </CardContent>
                </Card>
              </div>

              {/* Additional Analytics Section */}
              <ComprehensiveAnalytics
                propertyId={selectedProperty}
                dateRange={dateRange}
                dashboardData={dashboardData}
                loading={loading}
              />
            </div>
          )}

          {showCredentialForm && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Add Google Analytics Credentials</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You'll need a Google Analytics property ID and Service Account JSON file.
                </p>

              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCredentials} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property ID
                    </label>
                    <input
                      type="text"
                      value={credentialForm.property_id}
                      onChange={(e) => setCredentialForm({ ...credentialForm, property_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="GA4 Property ID (e.g., 123456789)"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Account JSON File
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                      {selectedFile && (
                        <div className="text-sm text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          File selected: {selectedFile.name}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Upload your Google Cloud Service Account JSON key file. This file contains the credentials needed to access Google Analytics.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Credentials'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCredentialForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Demo Analytics Dashboard when no credentials */}
          {credentials.length === 0 && (
            <div className="space-y-6">
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Connected</h3>
                    <p className="text-gray-600 mb-4 max-w-md">
                      Connect your Google Analytics account to start tracking website performance and user engagement.
                    </p>
                    <Button
                      onClick={() => setShowCredentialForm(true)}
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Google Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Demo Comprehensive Analytics */}
              <ComprehensiveAnalytics
                propertyId="demo"
                dateRange={dateRange}
                dashboardData={null}
                loading={false}
              />
            </div>
          )}

          {credentials.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Connected Properties
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">Select a property to view analytics data</p>
                </div>
                <Button
                  onClick={() => setShowCredentialForm(true)}
                  variant="secondary"
                  className="flex items-center gap-2 bg-white/80 hover:bg-white border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add Property
                </Button>
              </div>

              <div className="grid gap-4 md:gap-6">
                {credentials.map((cred) => (
                  <Card 
                    key={cred.id} 
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${
                      selectedProperty === cred.property_id 
                        ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg' 
                        : 'border border-gray-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm'
                    }`}
                    onClick={() => setSelectedProperty(cred.property_id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl transition-all duration-200 ${
                            selectedProperty === cred.property_id 
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg' 
                              : 'bg-gradient-to-br from-green-400 to-blue-500 group-hover:shadow-md'
                          }`}>
                            <BarChart3 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3 mb-1">
                              Property {cred.property_id}
                              {selectedProperty === cred.property_id && (
                                <span className="px-3 py-1 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-sm animate-pulse">
                                  Active
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">Service Account: {cred.service_account_email}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Created: {new Date(cred.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={cred.is_active ? 'success' : 'danger'}
                            className={`${cred.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} shadow-sm`}
                          >
                            {cred.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCredentials(cred.id);
                            }}
                            className="opacity-70 hover:opacity-100 transition-all duration-200 hover:shadow-md"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                Analytics Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">Configure your analytics dashboard preferences and integrations</p>
            </div>
          </div>

          <div className="grid gap-6">
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
                          All analytics data is processed securely and never shared with third parties. Your Google Analytics credentials are encrypted and stored locally.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export & Integration */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Download className="w-5 h-5 text-purple-500" />
                  Export & Integration
                </h3>
                <p className="text-sm text-gray-600">Configure data export and third-party integrations</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Export Format Preferences</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="exportFormat" value="csv" className="text-blue-600 focus:ring-blue-500" defaultChecked />
                        <div>
                          <span className="text-sm font-medium">CSV</span>
                          <p className="text-xs text-gray-500">Comma-separated values</p>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="exportFormat" value="xlsx" className="text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium">Excel</span>
                          <p className="text-xs text-gray-500">Microsoft Excel format</p>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="exportFormat" value="json" className="text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium">JSON</span>
                          <p className="text-xs text-gray-500">JavaScript Object Notation</p>
                        </div>
                      </label>
                    </div>
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
                    <Button
                      onClick={triggerMetricsCollection}
                      variant="primary"
                      disabled={loading || credentials.length === 0}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'Collecting...' : 'Refresh Metrics'}
                    </Button>
                  </div>

                  {credentials.length === 0 && (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Please add Google Analytics credentials first to collect metrics.</p>
                    </div>
                  )}

                  {metrics.length > 0 && (
                    <div className="text-center py-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">
                        {metrics.length} metrics collected from {new Set(metrics.map(m => m.property_id)).size} properties
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Management */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-500" />
                  Property Management
                </h3>
                <p className="text-sm text-gray-600">Add and manage Google Analytics properties</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Add New Property</h4>
                      <p className="text-xs text-gray-500 mt-1">Connect a new Google Analytics property to your dashboard</p>
                    </div>
                    <Button
                      onClick={() => setShowCredentialForm(true)}
                      variant="primary"
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Property
                    </Button>
                  </div>

                  {credentials.length > 0 && (
                    <div className="text-center py-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        {credentials.length} {credentials.length === 1 ? 'property' : 'properties'} currently connected
                      </p>
                    </div>
                  )}

                  {credentials.length === 0 && (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">No properties connected yet. Add your first Google Analytics property to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Realtime Tab */}
       {activeTab === 'realtime' && selectedProperty && (
         <div className="space-y-6">
           <EnhancedRealtime 
             propertyId={selectedProperty}
           />
         </div>
       )}
 
       {/* Reports Tab */}
       {activeTab === 'reports' && selectedProperty && (
         <div className="space-y-6">
           <EnhancedReports 
             propertyId={selectedProperty}
           />
         </div>
       )}
 
       {/* Pages & Screens Tab */}
       {activeTab === 'pages-screens' && selectedProperty && (
         <div className="space-y-6">
           <PagesAndScreens 
             propertyId={selectedProperty}
           />
         </div>
       )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                Analytics Settings
              </h3>
              <p className="text-sm text-gray-600">Configure your Google Analytics integration</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Property Configuration</h4>
                  <p className="text-sm text-gray-600 mb-3">Manage your connected Google Analytics properties</p>
                  <Button
                    onClick={() => setShowCredentialForm(true)}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Property
                  </Button>
                </div>
                
                {credentials.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Connected Properties</h4>
                    <div className="space-y-2">
                      {credentials.map((cred) => (
                        <div key={cred.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm font-medium">📊 {cred.property_id}</span>
                          <Badge variant="success">Connected</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Property Selected Message for data tabs */}
      {(activeTab === 'realtime' || activeTab === 'reports' || activeTab === 'pages-screens') && !selectedProperty && (
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Property</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please select a Google Analytics property from the dropdown above to view {activeTab} data.
              </p>
              <Button
                onClick={() => setActiveTab('overview')}
                variant="primary"
                className="flex items-center gap-2 mx-auto"
              >
                <BarChart3 className="w-4 h-4" />
                Go to Overview
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;