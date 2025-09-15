'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  BarChart3,
  Users,
  FileText,
  Target,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  Eye,
  MousePointer,
  Globe,
  Clock,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ReportData {
  audience: {
    total_users: number;
    new_users: number;
    returning_users: number;
    sessions: number;
    bounce_rate: number;
    avg_session_duration: string;
    pages_per_session: number;
  };
  content: {
    top_pages: Array<{
      page_path: string;
      page_title: string;
      page_views: number;
      unique_page_views: number;
      avg_time_on_page: string;
      bounce_rate: number;
    }>;
    total_page_views: number;
    unique_page_views: number;
  };
  acquisition: {
    traffic_sources: Array<{
      source: string;
      sessions: number;
      users: number;
      bounce_rate: number;
    }>;
    total_sessions: number;
  };
  behavior: {
    events: Array<{
      event_name: string;
      event_count: number;
      unique_users: number;
    }>;
    total_events: number;
  };
}

interface EnhancedReportsProps {
  propertyId: string;
  onCardClick?: (reportType: string, data: any) => void;
}

const EnhancedReports: React.FC<EnhancedReportsProps> = ({ propertyId, onCardClick }) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<'audience' | 'content' | 'acquisition' | 'behavior'>('audience');
  const [dateRange, setDateRange] = useState('7d');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  // Demo data for when no real data is available
  const demoData: ReportData = {
    audience: {
      total_users: 2847,
      new_users: 1923,
      returning_users: 924,
      sessions: 3456,
      bounce_rate: 42.3,
      avg_session_duration: '2m 34s',
      pages_per_session: 3.2
    },
    content: {
      top_pages: [
        { page_path: '/dashboard', page_title: 'Dashboard', page_views: 1234, unique_page_views: 987, avg_time_on_page: '3m 12s', bounce_rate: 35.2 },
        { page_path: '/analytics', page_title: 'Analytics', page_views: 856, unique_page_views: 723, avg_time_on_page: '4m 23s', bounce_rate: 28.7 },
        { page_path: '/devices', page_title: 'Devices', page_views: 645, unique_page_views: 534, avg_time_on_page: '2m 45s', bounce_rate: 45.1 },
        { page_path: '/ssl', page_title: 'SSL Certificates', page_views: 423, unique_page_views: 367, avg_time_on_page: '1m 56s', bounce_rate: 52.3 },
        { page_path: '/settings', page_title: 'Settings', page_views: 312, unique_page_views: 278, avg_time_on_page: '2m 18s', bounce_rate: 38.9 }
      ],
      total_page_views: 8934,
      unique_page_views: 6745
    },
    acquisition: {
      traffic_sources: [
        { source: 'direct', sessions: 1456, users: 1234, bounce_rate: 38.2 },
        { source: 'google', sessions: 987, users: 823, bounce_rate: 42.1 },
        { source: 'social', sessions: 567, users: 489, bounce_rate: 55.3 },
        { source: 'referral', sessions: 234, users: 198, bounce_rate: 35.7 },
        { source: 'email', sessions: 156, users: 134, bounce_rate: 28.9 }
      ],
      total_sessions: 3456
    },
    behavior: {
      events: [
        { event_name: 'page_view', event_count: 8934, unique_users: 2847 },
        { event_name: 'click', event_count: 4567, unique_users: 1923 },
        { event_name: 'scroll', event_count: 3421, unique_users: 1654 },
        { event_name: 'download', event_count: 234, unique_users: 198 },
        { event_name: 'form_submit', event_count: 156, unique_users: 134 }
      ],
      total_events: 17312
    }
  };

  const fetchReportData = async () => {
    if (propertyId === 'demo') {
      setReportData(demoData);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics/${propertyId}/reports?range=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        // Fallback to demo data if API fails
        setReportData(demoData);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      // Fallback to demo data
      setReportData(demoData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [propertyId, dateRange]);

  const handleCardClick = (reportType: string, data: any) => {
    setModalData({ type: reportType, data });
    setShowModal(true);
    if (onCardClick) {
      onCardClick(reportType, data);
    }
  };

  const generateAudienceChart = () => {
    if (!reportData) return null;

    return {
      labels: ['New Users', 'Returning Users'],
      datasets: [{
        data: [reportData.audience.new_users, reportData.audience.returning_users],
        backgroundColor: ['#3B82F6', '#10B981'],
        borderWidth: 0,
        hoverBackgroundColor: ['#2563EB', '#059669']
      }]
    };
  };

  const generateContentChart = () => {
    if (!reportData) return null;

    return {
      labels: reportData.content.top_pages.slice(0, 5).map(page => page.page_title || page.page_path),
      datasets: [{
        label: 'Page Views',
        data: reportData.content.top_pages.slice(0, 5).map(page => page.page_views),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    };
  };

  const generateAcquisitionChart = () => {
    if (!reportData) return null;

    return {
      labels: reportData.acquisition.traffic_sources.map(source => source.source),
      datasets: [{
        data: reportData.acquisition.traffic_sources.map(source => source.sessions),
        backgroundColor: [
          '#EF4444',
          '#F59E0B',
          '#10B981',
          '#3B82F6',
          '#8B5CF6'
        ],
        borderWidth: 0
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Analytics Reports
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive insights and data analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button
            onClick={fetchReportData}
            disabled={loading}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'audience', label: 'Audience', icon: Users },
          { key: 'content', label: 'Content', icon: FileText },
          { key: 'acquisition', label: 'Acquisition', icon: Target },
          { key: 'behavior', label: 'Behavior', icon: Activity }
        ].map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.key}
              onClick={() => setSelectedReport(report.key as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                selectedReport === report.key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Audience Report */}
      {selectedReport === 'audience' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
              onClick={() => handleCardClick('total_users', reportData.audience.total_users)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Users</p>
                    <p className="text-2xl font-bold text-blue-900">{reportData.audience.total_users.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-green-50 to-green-100 border-green-200"
              onClick={() => handleCardClick('sessions', reportData.audience.sessions)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Sessions</p>
                    <p className="text-2xl font-bold text-green-900">{reportData.audience.sessions.toLocaleString()}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
              onClick={() => handleCardClick('bounce_rate', reportData.audience.bounce_rate)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Bounce Rate</p>
                    <p className="text-2xl font-bold text-yellow-900">{reportData.audience.bounce_rate.toFixed(2)}%</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
              onClick={() => handleCardClick('avg_session_duration', reportData.audience.avg_session_duration)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Avg. Session</p>
                    <p className="text-2xl font-bold text-purple-900">{reportData.audience.avg_session_duration}</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Type Chart */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('user_types', { new: reportData.audience.new_users, returning: reportData.audience.returning_users })}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" />
                User Types
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </h3>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={generateAudienceChart()!} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Report */}
      {selectedReport === 'content' && (
        <div className="space-y-6">
          {/* Content Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200"
              onClick={() => handleCardClick('total_page_views', reportData.content.total_page_views)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Total Page Views</p>
                    <p className="text-2xl font-bold text-indigo-900">{reportData.content.total_page_views.toLocaleString()}</p>
                  </div>
                  <Eye className="w-8 h-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"
              onClick={() => handleCardClick('unique_page_views', reportData.content.unique_page_views)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-600">Unique Views</p>
                    <p className="text-2xl font-bold text-pink-900">{reportData.content.unique_page_views.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-pink-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200"
              onClick={() => handleCardClick('top_pages_count', reportData.content.top_pages.length)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-600">Pages Tracked</p>
                    <p className="text-2xl font-bold text-teal-900">{reportData.content.top_pages.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-teal-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages Chart */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('top_pages', reportData.content.top_pages)}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Top Pages Performance
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </h3>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar data={generateContentChart()!} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Pages List */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Page Details</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.content.top_pages.map((page, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleCardClick('page_detail', page)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{page.page_title || page.page_path}</p>
                      <p className="text-sm text-gray-500">{page.page_path}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 font-semibold">{page.page_views.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{page.bounce_rate.toFixed(2)}% bounce rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Acquisition Report */}
      {selectedReport === 'acquisition' && (
        <div className="space-y-6">
          {/* Acquisition Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
              onClick={() => handleCardClick('total_sessions', reportData.acquisition.total_sessions)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-orange-900">{reportData.acquisition.total_sessions.toLocaleString()}</p>
                  </div>
                  <Globe className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-red-50 to-red-100 border-red-200"
              onClick={() => handleCardClick('traffic_sources_count', reportData.acquisition.traffic_sources.length)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Traffic Sources</p>
                    <p className="text-2xl font-bold text-red-900">{reportData.acquisition.traffic_sources.length}</p>
                  </div>
                  <Target className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Traffic Sources Chart */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('traffic_sources', reportData.acquisition.traffic_sources)}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-500" />
                Traffic Sources Distribution
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </h3>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={generateAcquisitionChart()!} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Behavior Report */}
      {selectedReport === 'behavior' && (
        <div className="space-y-6">
          {/* Behavior Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
              onClick={() => handleCardClick('total_events', reportData.behavior.total_events)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Total Events</p>
                    <p className="text-2xl font-bold text-emerald-900">{reportData.behavior.total_events.toLocaleString()}</p>
                  </div>
                  <MousePointer className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200"
              onClick={() => handleCardClick('event_types', reportData.behavior.events.length)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-violet-600">Event Types</p>
                    <p className="text-2xl font-bold text-violet-900">{reportData.behavior.events.length}</p>
                  </div>
                  <Zap className="w-8 h-8 text-violet-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events List */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCardClick('events', reportData.behavior.events)}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Event Performance
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.behavior.events.map((event, index) => (
                  <div 
                    key={index} 
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleCardClick('event_detail', event)}
                  >
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{event.event_name.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-500">{event.unique_users.toLocaleString()} unique users</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-600 font-semibold">{event.event_count.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">total events</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
              <p className="text-gray-600">Download your analytics data in various formats</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="primary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for detailed view */}
      {showModal && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalData.type.replace('_', ' ').toUpperCase()} Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(modalData.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedReports;