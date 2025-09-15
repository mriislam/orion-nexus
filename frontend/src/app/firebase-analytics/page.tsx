'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { 
  Flame, 
  Users, 
  Eye, 
  MousePointer, 
  TrendingUp, 
  Clock, 
  Globe,
  Settings,
  BarChart3,
  Activity,
  Smartphone,
  RefreshCw,
  Upload,
  Save,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';

// Simple CardTitle component
const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  subtitle, 
  description 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      icon: 'bg-blue-500 text-white',
      border: 'border-blue-200',
      shadow: 'shadow-blue-100'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-gradient-to-br from-green-50 to-green-100',
      icon: 'bg-green-500 text-white',
      border: 'border-green-200',
      shadow: 'shadow-green-100'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      icon: 'bg-purple-500 text-white',
      border: 'border-purple-200',
      shadow: 'shadow-purple-100'
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600',
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      icon: 'bg-orange-500 text-white',
      border: 'border-orange-200',
      shadow: 'shadow-orange-100'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      icon: 'bg-red-500 text-white',
      border: 'border-red-200',
      shadow: 'shadow-red-100'
    },
    gray: {
      gradient: 'from-gray-500 to-gray-600',
      bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      icon: 'bg-gray-500 text-white',
      border: 'border-gray-200',
      shadow: 'shadow-gray-100'
    }
  };

  const currentColor = colorClasses[color as keyof typeof colorClasses];

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 cursor-pointer group ${
        isHovered 
          ? `shadow-xl ${currentColor.shadow} transform -translate-y-1 scale-105` 
          : 'shadow-md hover:shadow-lg'
      } ${currentColor.bg} ${currentColor.border} border`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${currentColor.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      {/* Decorative corner element */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${currentColor.gradient} opacity-10 rounded-bl-full transform translate-x-6 -translate-y-6`} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
        <div className="flex-1">
          <CardTitle className="text-sm font-semibold text-gray-700 mb-1 group-hover:text-gray-900 transition-colors">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${currentColor.icon} transform transition-all duration-300 ${
          isHovered ? 'scale-110 rotate-3' : ''
        } shadow-lg`}>
          {icon}
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
          {value}
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg transition-all duration-300 ${
            change >= 0 
              ? 'bg-green-50 group-hover:bg-green-100' 
              : 'bg-red-50 group-hover:bg-red-100'
          }`}>
            <div className={`p-1 rounded-full ${
              change >= 0 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <TrendingUp className={`w-3 h-3 text-white transition-transform duration-300 ${
                change < 0 ? 'rotate-180' : ''
              } ${isHovered ? 'scale-110' : ''}`} />
            </div>
            <span className={`text-sm font-semibold ${
              change >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
            <span className="text-xs text-gray-500">vs last period</span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors leading-relaxed">
            {description}
          </p>
        )}
        
        {/* Interactive progress bar */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${currentColor.gradient} transition-all duration-1000 ease-out ${
              isHovered ? 'w-full' : 'w-0'
            }`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default function FirebaseAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isConnected, setIsConnected] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configData, setConfigData] = useState({
    serviceAccountFile: null as File | null,
    firebaseProjectId: '',
    ga4PropertyId: ''
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [existingCredentials, setExistingCredentials] = useState<any[]>([]);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  const fetchAnalyticsData = async () => {
     try {
       setLoading(true);
       const response = await fetch('http://localhost:8001/api/v1/firebase-analytics/metrics');
       if (!response.ok) {
         throw new Error('Failed to fetch analytics data');
       }
       const result = await response.json();
       setAnalyticsData(result.data);
       setIsConnected(result.connected);
       setError(null);
     } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsConnected(false);
     } finally {
       setLoading(false);
     }
   };

  const fetchExistingCredentials = async () => {
    try {
      setCredentialsLoading(true);
      const response = await fetch('http://localhost:8001/api/v1/firebase-analytics/credentials');
      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }
      const result = await response.json();
      if (result && result.length > 0) {
        setExistingCredentials(result);
        // Pre-populate form with active credential data
        const activeCredential = result.find((cred: any) => cred.is_active) || result[0];
        setConfigData(prev => ({
          ...prev,
          firebaseProjectId: activeCredential.project_id || '',
          ga4PropertyId: activeCredential.property_id || ''
        }));
      }
    } catch (err) {
      console.error('Failed to fetch existing credentials:', err);
    } finally {
      setCredentialsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    fetchExistingCredentials();
  }, []);

  const mockData = {
     activeUsers: analyticsData?.overview?.activeUsers || 0,
     screenViews: analyticsData?.overview?.pageViews || 0,
     sessions: analyticsData?.overview?.sessions || 0,
     engagementRate: analyticsData?.overview?.engagementRate ? (analyticsData.overview.engagementRate * 100).toFixed(2) : '0.00',
     avgSessionDuration: analyticsData?.overview?.avgSessionDuration || 0,
     newUsers: analyticsData?.overview?.activeUsers ? Math.floor(analyticsData.overview.activeUsers * 0.3) : 0,
     crashFreeUsers: (99.2).toFixed(2),
     appVersion: '2.1.0'
   };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      )}

      {/* Key Metrics Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Active Users"
          value={mockData.activeUsers.toLocaleString()}
          change={12.50}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Last 30 days"
          description="Users who opened your app"
        />
        
        <MetricCard
          title="Screen Views"
          value={mockData.screenViews.toLocaleString()}
          change={8.30}
          icon={<Smartphone className="w-5 h-5" />}
          color="green"
          subtitle="Last 30 days"
          description="Total screens viewed"
        />
        
        <MetricCard
          title="Sessions"
          value={mockData.sessions.toLocaleString()}
          change={-2.10}
          icon={<MousePointer className="w-5 h-5" />}
          color="purple"
          subtitle="Last 30 days"
          description="App sessions"
        />
        
        <MetricCard
          title="Engagement Rate"
          value={`${mockData.engagementRate}%`}
          change={5.70}
          icon={<Activity className="w-5 h-5" />}
          color="orange"
          subtitle="Last 30 days"
          description="Engaged sessions percentage"
        />
        
        <MetricCard
          title="Avg. Session"
          value={`${Math.floor(mockData.avgSessionDuration / 60)}m ${Math.round(mockData.avgSessionDuration % 60)}s`}
          icon={<Clock className="w-5 h-5" />}
          color="gray"
          subtitle="Duration"
          description="Average time per session"
        />
        
        <MetricCard
          title="New Users"
          value={mockData.newUsers.toLocaleString()}
          change={18.90}
          icon={<Globe className="w-5 h-5" />}
          color="red"
          subtitle="Last 30 days"
          description="First-time app users"
        />
        
        <MetricCard
          title="Crash-Free Users"
          value={`${mockData.crashFreeUsers}%`}
          change={0.30}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle="Last 30 days"
          description="Users without crashes"
        />
        
        <MetricCard
          title="App Version"
          value={mockData.appVersion}
          icon={<Settings className="w-5 h-5" />}
          color="blue"
          subtitle="Current"
          description="Latest app version"
        />
      </div>
      )}

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              User Engagement Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {analyticsData?.topPages && analyticsData.topPages.length > 0 ? (
                <div className="space-y-3">
                  {analyticsData.topPages.slice(0, 8).map((page: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {page.page === '(not set)' ? 'Home Page' : page.page || 'Unknown Page'}
                        </p>
                        <p className="text-xs text-gray-500">{page.views.toLocaleString()} views</p>
                      </div>
                      <div className="text-right">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((page.views / (analyticsData.topPages[0]?.views || 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No page data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Top Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              {analyticsData?.demographics?.countries && analyticsData.demographics.countries.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Top Countries by Users</h4>
                  {analyticsData.demographics.countries.slice(0, 8).map((country: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{country.country}</p>
                        <p className="text-xs text-gray-500">{country.users.toLocaleString()} users</p>
                      </div>
                      <div className="text-right">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((country.users / (analyticsData.demographics.countries[0]?.users || 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No demographics data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Firebase Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Connection Status</h3>
              <p className="text-sm text-gray-600">
                {isConnected ? 'Connected to Firebase Analytics' : 'Not connected to Firebase Analytics'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          
          <Button 
            onClick={() => setIsConnected(!isConnected)}
            className="w-full"
          >
            {isConnected ? 'Disconnect' : 'Connect to Firebase'}
          </Button>
          
          <div className="text-sm text-gray-600">
            <p className="mb-2">To connect Firebase Analytics:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Create a Firebase project in the Firebase Console</li>
              <li>Add your app to the Firebase project</li>
              <li>Download the configuration file</li>
              <li>Install Firebase SDK in your application</li>
              <li>Initialize Firebase Analytics</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout fullHeight={true}>
      <div className="h-full px-6 py-8">
        {/* Enhanced Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 lg:p-6 border border-orange-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="p-2 lg:p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
                  <Flame className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    Firebase Analytics
                  </h1>
                  <p className="text-sm lg:text-base text-gray-600 mt-1">Monitor app performance and user engagement with real-time insights</p>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700 hidden sm:inline">Refresh</span>
                </button>
                
                <button className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="font-medium hidden sm:inline">Export Data</span>
                </button>
                
                <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    isConnected ? 'bg-green-500 shadow-green-200' : 'bg-yellow-500 shadow-yellow-200'
                  } shadow-lg`}></div>
                  <span className="text-xs lg:text-sm font-medium text-gray-700">
                    {isConnected ? 'Live Data' : 'Demo Mode'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
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
                 { key: 'events', label: 'Events', icon: Activity, description: 'User interactions' },
                 { key: 'audiences', label: 'Audiences', icon: Users, description: 'User demographics' },
                 { key: 'funnels', label: 'Funnels', icon: TrendingUp, description: 'Conversion tracking' },
                 { key: 'settings', label: 'Settings', icon: Settings, description: 'Configuration' }
               ].map((tab, index) => {
                 const Icon = tab.icon;
                 const isActive = activeTab === tab.key;
                 return (
                   <button
                     key={tab.key}
                     onClick={() => setActiveTab(tab.key)}
                     className={`group relative flex-1 p-4 text-left transition-all duration-300 ${
                       isActive
                         ? 'bg-gradient-to-r from-orange-50 to-red-50 border-b-4 border-orange-500'
                         : 'hover:bg-gray-50 border-b-4 border-transparent hover:border-gray-200'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg transition-all duration-300 ${
                         isActive 
                           ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                           : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                       }`}>
                         <Icon className="w-5 h-5" />
                       </div>
                       <div>
                         <div className={`font-semibold transition-colors ${
                           isActive ? 'text-orange-600' : 'text-gray-700 group-hover:text-gray-900'
                         }`}>
                           {tab.label}
                         </div>
                         <div className={`text-xs transition-colors ${
                           isActive ? 'text-orange-500' : 'text-gray-500 group-hover:text-gray-600'
                         }`}>
                           {tab.description}
                         </div>
                       </div>
                     </div>
                     
                     {/* Active indicator */}
                     {isActive && (
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                     )}


                     
                     {/* Hover effect */}
                     <div className={`absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
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
                   { key: 'events', label: 'Events', icon: Activity },
                   { key: 'audiences', label: 'Audiences', icon: Users },
                   { key: 'funnels', label: 'Funnels', icon: TrendingUp },
                   { key: 'settings', label: 'Settings', icon: Settings }
                 ].map((tab, index) => {
                   const Icon = tab.icon;
                   const isActive = activeTab === tab.key;
                   return (
                     <button
                       key={tab.key}
                       onClick={() => setActiveTab(tab.key)}
                       className={`group relative p-3 sm:p-4 text-center transition-all duration-300 border-b-4 ${
                         isActive
                           ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-500'
                           : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                       }`}
                     >
                       <div className="flex flex-col items-center gap-2">
                         <div className={`p-2 rounded-lg transition-all duration-300 ${
                           isActive 
                             ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                             : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                         }`}>
                           <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                         </div>
                         <div className={`text-xs sm:text-sm font-medium transition-colors ${
                           isActive ? 'text-orange-600' : 'text-gray-700 group-hover:text-gray-900'
                         }`}>
                           {tab.label}
                         </div>
                       </div>
                       
                       {/* Active indicator */}
                       {isActive && (
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
                       )}
                       
                       {/* Hover effect */}
                       <div className={`absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                         isActive ? 'opacity-100' : ''
                       }`} />
                     </button>
                   );
                 })}
               </div>
             </nav>
           </div>
         </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'events' && (
          <div className="space-y-4 lg:space-y-6">
            {/* Events Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-purple-600">Total Events</p>
                      <p className="text-xl lg:text-2xl font-bold text-purple-900">
                        {analyticsData?.events ? analyticsData.events.reduce((sum: number, event: any) => sum + event.count, 0).toLocaleString() : '0'}
                      </p>
                    </div>
                    <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-blue-600">Event Types</p>
                      <p className="text-xl lg:text-2xl font-bold text-blue-900">
                        {analyticsData?.events ? analyticsData.events.length : '0'}
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-green-600">Top Event</p>
                      <p className="text-base lg:text-lg font-bold text-green-900 truncate">
                        {analyticsData?.events && analyticsData.events.length > 0 ? analyticsData.events[0].event : 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-green-500 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interactive Events Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Event Analytics Dashboard
                </CardTitle>
                <p className="text-purple-100 text-sm mt-1">Interactive visualization of your top performing events</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {analyticsData?.events && analyticsData.events.length > 0 ? (
                    analyticsData.events.map((event: any, index: number) => {
                      const percentage = (event.count / (analyticsData.events[0]?.count || 1)) * 100;
                      const colors = [
                        'from-purple-500 to-purple-600',
                        'from-blue-500 to-blue-600', 
                        'from-green-500 to-green-600',
                        'from-orange-500 to-orange-600',
                        'from-red-500 to-red-600',
                        'from-indigo-500 to-indigo-600'
                      ];
                      const bgColors = [
                        'bg-purple-50 hover:bg-purple-100',
                        'bg-blue-50 hover:bg-blue-100',
                        'bg-green-50 hover:bg-green-100', 
                        'bg-orange-50 hover:bg-orange-100',
                        'bg-red-50 hover:bg-red-100',
                        'bg-indigo-50 hover:bg-indigo-100'
                      ];
                      
                      return (
                        <div 
                          key={index} 
                          className={`group relative p-6 rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-102 hover:shadow-lg ${
                            bgColors[index % bgColors.length]
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${colors[index % colors.length]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                {index + 1}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                                  {event.event}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {event.count.toLocaleString()} events • {percentage.toFixed(1)}% of total
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {event.count.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">events</div>
                            </div>
                          </div>
                          
                          {/* Animated Progress Bar */}
                          <div className="relative">
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-1000 ease-out rounded-full relative overflow-hidden`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 transform -skew-x-12 group-hover:animate-pulse" />
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>0</span>
                              <span>{analyticsData.events[0]?.count.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="relative">
                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 rounded-full blur-xl" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Events Data Available</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Event analytics will appear here once your app starts tracking user interactions and custom events.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'audiences' && (
          <div className="space-y-4 lg:space-y-6">
            {/* Audience Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-blue-600">Total Users</p>
                      <p className="text-xl lg:text-2xl font-bold text-blue-900">
                        {analyticsData?.audience?.devices ? 
                          analyticsData.audience.devices.reduce((sum: number, device: any) => sum + device.users, 0).toLocaleString() : '0'
                        }
                      </p>
                    </div>
                    <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-green-600">Total Sessions</p>
                      <p className="text-xl lg:text-2xl font-bold text-green-900">
                        {analyticsData?.audience?.devices ? 
                          analyticsData.audience.devices.reduce((sum: number, device: any) => sum + device.sessions, 0).toLocaleString() : '0'
                        }
                      </p>
                    </div>
                    <Eye className="w-6 h-6 lg:w-8 lg:h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-purple-600">Device Types</p>
                      <p className="text-xl lg:text-2xl font-bold text-purple-900">
                        {analyticsData?.audience?.devices ? analyticsData.audience.devices.length : '0'}
                      </p>
                    </div>
                    <Smartphone className="w-6 h-6 lg:w-8 lg:h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs lg:text-sm font-medium text-orange-600">User Types</p>
                      <p className="text-xl lg:text-2xl font-bold text-orange-900">
                        {analyticsData?.audience?.userTypes ? 
                          analyticsData.audience.userTypes.filter((ut: any) => ut.type && ut.type !== '(not set)' && ut.type !== '').length : '0'
                        }
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 lg:w-8 lg:h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Enhanced Device Categories */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Device Analytics
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1">User distribution across device categories</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {analyticsData?.audience?.devices && analyticsData.audience.devices.length > 0 ? (
                      analyticsData.audience.devices.map((device: any, index: number) => {
                        const userPercentage = (device.users / (analyticsData.audience.devices.reduce((sum: number, d: any) => sum + d.users, 0) || 1)) * 100;
                        const sessionPercentage = (device.sessions / (analyticsData.audience.devices.reduce((sum: number, d: any) => sum + d.sessions, 0) || 1)) * 100;
                        const colors = [
                          'from-blue-500 to-blue-600',
                          'from-green-500 to-green-600',
                          'from-purple-500 to-purple-600',
                          'from-orange-500 to-orange-600'
                        ];
                        const bgColors = [
                          'bg-blue-50 hover:bg-blue-100',
                          'bg-green-50 hover:bg-green-100',
                          'bg-purple-50 hover:bg-purple-100',
                          'bg-orange-50 hover:bg-orange-100'
                        ];
                        
                        return (
                          <div 
                            key={index} 
                            className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-102 hover:shadow-lg ${
                              bgColors[index % bgColors.length]
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${colors[index % colors.length]} flex items-center justify-center text-white font-bold shadow-lg`}>
                                  <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 capitalize group-hover:text-gray-700 transition-colors">
                                    {device.device}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {userPercentage.toFixed(1)}% of total users
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900">
                                  {device.users.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">users</div>
                              </div>
                            </div>
                            
                            {/* Users Progress Bar */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Users</span>
                                <span>{userPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-1000 ease-out rounded-full`}
                                  style={{ width: `${Math.min(userPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            {/* Sessions Progress Bar */}
                            <div>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Sessions: {device.sessions.toLocaleString()}</span>
                                <span>{sessionPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${colors[index % colors.length]} opacity-70 transition-all duration-1000 ease-out rounded-full`}
                                  style={{ width: `${Math.min(sessionPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="relative">
                          <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 rounded-full blur-xl" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Device Data Available</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          Device analytics will appear here once users start accessing your application from different devices.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced User Types */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Segmentation
                  </CardTitle>
                  <p className="text-green-100 text-sm mt-1">Breakdown of new vs returning users</p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {analyticsData?.audience?.userTypes && analyticsData.audience.userTypes.length > 0 ? (
                      analyticsData.audience.userTypes.filter((userType: any) => userType.type && userType.type !== '(not set)' && userType.type !== '').map((userType: any, index: number) => {
                        const totalUsers = analyticsData.audience.userTypes.filter((ut: any) => ut.type && ut.type !== '(not set)' && ut.type !== '').reduce((sum: number, ut: any) => sum + ut.users, 0);
                        const percentage = (userType.users / (totalUsers || 1)) * 100;
                        const colors = [
                          'from-green-500 to-green-600',
                          'from-blue-500 to-blue-600',
                          'from-purple-500 to-purple-600',
                          'from-orange-500 to-orange-600'
                        ];
                        const bgColors = [
                          'bg-green-50 hover:bg-green-100',
                          'bg-blue-50 hover:bg-blue-100',
                          'bg-purple-50 hover:bg-purple-100',
                          'bg-orange-50 hover:bg-orange-100'
                        ];
                        
                        return (
                          <div 
                            key={index} 
                            className={`group relative p-5 rounded-xl border transition-all duration-300 cursor-pointer transform hover:scale-102 hover:shadow-lg ${
                              bgColors[index % bgColors.length]
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${colors[index % colors.length]} flex items-center justify-center text-white font-bold shadow-lg`}>
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 capitalize group-hover:text-gray-700 transition-colors">
                                    {userType.type}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {percentage.toFixed(1)}% of user base
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900">
                                  {userType.users.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">users</div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="relative">
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-1000 ease-out rounded-full relative overflow-hidden`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                >
                                  {/* Shimmer effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 transform -skew-x-12 group-hover:animate-pulse" />
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                            </div>
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="relative">
                          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 opacity-20 rounded-full blur-xl" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No User Type Data Available</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          User segmentation data will appear here once your application starts tracking user behavior patterns.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {activeTab === 'funnels' && (
          <div className="space-y-6">
            {/* Funnel Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600">Total Views</p>
                      <p className="text-2xl font-bold text-indigo-900">
                        {analyticsData?.funnel?.steps ? 
                          analyticsData.funnel.steps.reduce((sum: number, step: any) => sum + step.views, 0).toLocaleString() : '0'
                        }
                      </p>
                    </div>
                    <Eye className="w-8 h-8 text-indigo-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Conversions</p>
                      <p className="text-2xl font-bold text-green-900">
                        {analyticsData?.funnel?.steps ? 
                          analyticsData.funnel.steps.reduce((sum: number, step: any) => sum + step.conversions, 0).toLocaleString() : '0'
                        }
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Funnel Steps</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {analyticsData?.funnel?.steps ? analyticsData.funnel.steps.length : '0'}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Avg Conversion</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {analyticsData?.funnel?.steps && analyticsData.funnel.steps.length > 0 ? 
                          (analyticsData.funnel.steps.reduce((sum: number, step: any) => sum + parseFloat(step.conversionRate), 0) / analyticsData.funnel.steps.length).toFixed(1) + '%' : '0%'
                        }
                      </p>
                    </div>
                    <MousePointer className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Conversion Funnel */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                 <CardTitle className="flex items-center gap-2">
                   <TrendingUp className="w-5 h-5" />
                   Interactive Conversion Funnel
                 </CardTitle>
                 <p className="text-indigo-100 text-sm mt-1">
                   Track user progression through key conversion steps with detailed analytics
                 </p>
               </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {analyticsData?.funnel?.steps && analyticsData.funnel.steps.length > 0 ? (
                    analyticsData.funnel.steps.map((step: any, index: number) => {
                      const colors = [
                        'from-indigo-500 to-indigo-600',
                        'from-blue-500 to-blue-600',
                        'from-purple-500 to-purple-600',
                        'from-green-500 to-green-600',
                        'from-orange-500 to-orange-600'
                      ];
                      const bgColors = [
                        'bg-indigo-50 hover:bg-indigo-100',
                        'bg-blue-50 hover:bg-blue-100',
                        'bg-purple-50 hover:bg-purple-100',
                        'bg-green-50 hover:bg-green-100',
                        'bg-orange-50 hover:bg-orange-100'
                      ];
                      const borderColors = [
                        'border-indigo-200',
                        'border-blue-200',
                        'border-purple-200',
                        'border-green-200',
                        'border-orange-200'
                      ];
                      
                      return (
                        <div key={index} className="relative">
                          <div className={`group relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-102 hover:shadow-xl ${
                            bgColors[index % bgColors.length]
                          } ${borderColors[index % borderColors.length]}`}>
                            
                            {/* Step Header */}
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${colors[index % colors.length]} flex items-center justify-center text-white font-bold text-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{step.step}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Step {index + 1} of {analyticsData.funnel.steps.length} • {step.views.toLocaleString()} total views
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-gray-900">{step.conversions.toLocaleString()}</div>
                                <div className="text-sm text-gray-500 mb-1">conversions</div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${colors[index % colors.length]} text-white shadow-md`}>
                                  {step.conversionRate}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Enhanced Progress Visualization */}
                            <div className="space-y-4">
                              {/* Main conversion bar */}
                              <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                  <span>Conversion Rate</span>
                                  <span>{step.conversionRate}%</span>
                                </div>
                                <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                                  <div 
                                    className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-1000 ease-out rounded-full relative overflow-hidden`}
                                    style={{ width: `${step.conversionRate}%` }}
                                  >
                                    {/* Animated shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 transform -skew-x-12 group-hover:animate-pulse" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Views vs Conversions comparison */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Views</div>
                                  <div className="bg-gray-100 rounded-lg h-2">
                                    <div className="bg-gray-400 h-2 rounded-lg" style={{ width: '100%' }}></div>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">{step.views.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Conversions</div>
                                  <div className="bg-gray-100 rounded-lg h-2">
                                    <div 
                                      className={`bg-gradient-to-r ${colors[index % colors.length]} h-2 rounded-lg transition-all duration-1000`}
                                      style={{ width: `${(step.conversions / step.views) * 100}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">{step.conversions.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          </div>
                          
                          {/* Enhanced Drop-off indicator */}
                          {index < analyticsData.funnel.steps.length - 1 && (
                            <div className="flex items-center justify-center py-4">
                              <div className="relative">
                                {/* Connecting line */}
                                <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-red-300"></div>
                                
                                {/* Drop-off badge */}
                                <div className="relative bg-white border-2 border-red-200 rounded-full px-4 py-2 shadow-lg">
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                                    <span className="font-semibold text-red-600">
                                      {((step.conversions - analyticsData.funnel.steps[index + 1].conversions) / step.conversions * 100).toFixed(1)}% drop-off
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 text-center mt-1">
                                    {(step.conversions - analyticsData.funnel.steps[index + 1].conversions).toLocaleString()} users lost
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="relative">
                        <TrendingUp className="w-20 h-20 text-gray-300 mx-auto mb-6 animate-pulse" />
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 rounded-full blur-xl" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-700 mb-3">No Funnel Data Available</h3>
                      <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
                        Conversion funnel analytics will appear here once you start tracking user progression through your application's key conversion steps. Set up event tracking to see detailed funnel performance.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeTab === 'settings' && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-6 h-6 text-orange-500" />
                  Firebase Configuration
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Configure your Firebase Analytics connection by uploading your Service Account JSON file and providing project details.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Credentials Table */}
                {existingCredentials.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Saved Firebase Configurations
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Account</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GA4 Property</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {existingCredentials.map((credential, index) => (
                             <tr key={credential.id || index} className="hover:bg-gray-50">
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm font-medium text-gray-900">
                                   {credential.service_account_email}
                                 </div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">{credential.project_id}</div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">{credential.property_id}</div>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                   credential.is_active 
                                     ? 'bg-green-100 text-green-800' 
                                     : 'bg-red-100 text-red-800'
                                 }`}>
                                   {credential.is_active ? 'Active' : 'Inactive'}
                                 </span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                 {new Date(credential.created_at).toLocaleDateString()}
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                 <div className="flex items-center space-x-2">
                                   <button
                                     className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                                     title="View Details"
                                     onClick={() => {
                                       // TODO: Implement view details modal
                                       console.log('View credential:', credential);
                                     }}
                                   >
                                     <Eye className="w-4 h-4" />
                                   </button>
                                   <button
                                     className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                                     title="Edit Configuration"
                                     onClick={() => {
                                       // Pre-populate form with selected credential
                                       setConfigData({
                                         serviceAccountFile: null,
                                         firebaseProjectId: credential.project_id || '',
                                         ga4PropertyId: credential.property_id || ''
                                       });
                                     }}
                                   >
                                     <Edit className="w-4 h-4" />
                                   </button>
                                   <button
                                     className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                                     title="Delete Configuration"
                                     onClick={() => {
                                       // TODO: Implement delete confirmation and API call
                                       if (window.confirm('Are you sure you want to delete this configuration?')) {
                                         console.log('Delete credential:', credential);
                                       }
                                     }}
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {credentialsLoading && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-gray-600">Loading existing configuration...</span>
                    </div>
                  </div>
                )}

                {existingCredentials.length === 0 && !credentialsLoading && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-yellow-800 font-medium">No Firebase configuration found. Please upload your credentials below.</span>
                    </div>
                  </div>
                )}

                {configSuccess && (
                   <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                     <div className="flex items-center">
                       <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                       <span className="text-green-800 font-medium">Configuration saved successfully!</span>
                     </div>
                   </div>
                 )}
                 
                 {error && (
                   <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                     <div className="flex items-center">
                       <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                       <span className="text-red-800 font-medium">{error}</span>
                     </div>
                   </div>
                 )}

                {/* Configuration Upload Section */}
                {existingCredentials.length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Update Configuration</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload new credentials to update your Firebase configuration. This will replace the current configuration.
                    </p>
                  </div>
                )}

                {/* Service Account JSON Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Account JSON File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors relative">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600">
                      {configData.serviceAccountFile ? (
                        <span className="text-green-600 font-medium">
                          {configData.serviceAccountFile.name}
                        </span>
                      ) : (
                        <>
                          <span className="font-medium">Click to upload</span> or drag and drop
                          <br />
                          JSON files only
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setConfigData(prev => ({ ...prev, serviceAccountFile: file }));
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload the JSON file downloaded from your Google Cloud Console Service Account.
                  </p>
                </div>

                {/* Firebase Project ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firebase Project ID
                  </label>
                  <input
                    type="text"
                    value={configData.firebaseProjectId}
                    onChange={(e) => setConfigData(prev => ({ ...prev, firebaseProjectId: e.target.value }))}
                    placeholder="your-firebase-project-id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your Firebase Console under Project Settings.
                  </p>
                </div>

                {/* GA4 Property ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GA4 Property ID
                  </label>
                  <input
                    type="text"
                    value={configData.ga4PropertyId}
                    onChange={(e) => setConfigData(prev => ({ ...prev, ga4PropertyId: e.target.value }))}
                    placeholder="123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Google Analytics 4 Property ID (numeric value).
                  </p>
                </div>

                {/* Test Result Display */}
                 {testResult && (
                   <div className={`border rounded-lg p-4 ${
                     testResult.data?.test_result?.connection_status === 'success' 
                       ? 'bg-green-50 border-green-200' 
                       : testResult.data?.test_result?.connection_status === 'warning'
                       ? 'bg-yellow-50 border-yellow-200'
                       : 'bg-blue-50 border-blue-200'
                   }`}>
                     <h4 className="font-medium mb-2">Configuration Test Results</h4>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span>Service Account Valid:</span>
                         <span className={testResult.data?.service_account_valid ? 'text-green-600' : 'text-red-600'}>
                           {testResult.data?.service_account_valid ? '✓ Valid' : '✗ Invalid'}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span>Project ID Match:</span>
                         <span className={testResult.data?.project_id_match ? 'text-green-600' : 'text-yellow-600'}>
                           {testResult.data?.project_id_match ? '✓ Match' : '⚠ Mismatch'}
                         </span>
                       </div>
                       {testResult.data?.test_result?.message && (
                         <p className="text-gray-600 mt-2">{testResult.data.test_result.message}</p>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Action Buttons */}
                 <div className="flex justify-end gap-3 pt-4">
                   <Button
                     onClick={async () => {
                       if (!configData.serviceAccountFile || !configData.firebaseProjectId || !configData.ga4PropertyId) {
                         return;
                       }
                       
                       setTestLoading(true);
                       setTestResult(null);
                       try {
                         const formData = new FormData();
                         formData.append('service_account_file', configData.serviceAccountFile);
                         formData.append('firebase_project_id', configData.firebaseProjectId);
                         formData.append('ga4_property_id', configData.ga4PropertyId);
                         
                         const response = await fetch('http://localhost:8001/api/v1/firebase-analytics/config/test', {
                           method: 'POST',
                           body: formData
                         });
                         
                         if (!response.ok) {
                           const errorData = await response.json();
                           throw new Error(errorData.detail || 'Failed to test configuration');
                         }
                         
                         const result = await response.json();
                         setTestResult(result);
                         
                       } catch (err) {
                         setError(err instanceof Error ? err.message : 'Failed to test configuration');
                       } finally {
                         setTestLoading(false);
                       }
                     }}
                     disabled={!configData.serviceAccountFile || !configData.firebaseProjectId || !configData.ga4PropertyId || testLoading}
                     className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                   >
                     {testLoading ? (
                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                     ) : (
                       <Eye className="w-4 h-4 mr-2" />
                     )}
                     {testLoading ? 'Testing...' : 'Test Configuration'}
                   </Button>
                   
                   <Button
                     onClick={async () => {
                       if (!configData.serviceAccountFile || !configData.firebaseProjectId || !configData.ga4PropertyId) {
                         return;
                       }
                       
                       setConfigLoading(true);
                       try {
                         const formData = new FormData();
                         formData.append('service_account_file', configData.serviceAccountFile);
                         formData.append('firebase_project_id', configData.firebaseProjectId);
                         formData.append('ga4_property_id', configData.ga4PropertyId);
                         
                         const response = await fetch('http://localhost:8001/api/v1/firebase-analytics/config', {
                           method: 'POST',
                           body: formData
                         });
                         
                         if (!response.ok) {
                           const errorData = await response.json();
                           throw new Error(errorData.detail || 'Failed to save configuration');
                         }
                         
                         const result = await response.json();
                         setConfigSuccess(true);
                         setTimeout(() => setConfigSuccess(false), 5000);
                         
                         // Refresh analytics data to check new connection
                         fetchAnalyticsData();
                         // Refresh existing credentials to show updated info
                         fetchExistingCredentials();
                         
                       } catch (err) {
                         setError(err instanceof Error ? err.message : 'Failed to save configuration');
                       } finally {
                         setConfigLoading(false);
                       }
                     }}
                     disabled={!configData.serviceAccountFile || !configData.firebaseProjectId || !configData.ga4PropertyId || configLoading}
                     className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                   >
                     {configLoading ? (
                       <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                     ) : (
                       <Save className="w-4 h-4 mr-2" />
                     )}
                     {configLoading ? 'Saving...' : 'Save Configuration'}
                   </Button>
                 </div>

                {/* Help Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Create a Service Account in Google Cloud Console</p>
                    <p>• Download the JSON key file</p>
                    <p>• Enable Firebase Analytics API</p>
                    <p>• Grant necessary permissions to the Service Account</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Refer to the FIREBASE_SETUP.md file for detailed instructions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}