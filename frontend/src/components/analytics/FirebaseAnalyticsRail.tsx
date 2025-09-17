'use client';

import React, { useState, useEffect } from 'react';
import { logEvent } from 'firebase/analytics';
import {
  BarChart3,
  Users,
  Globe,
  TrendingUp,
  Eye,
  Clock,
  MousePointer,
  Smartphone,
  Monitor,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AnalyticsData {
  activeUsers: number;
  pageViews: number;
  sessionDuration: string;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  deviceTypes: Array<{ type: string; percentage: number }>;
  realTimeUsers: number;
}

const FirebaseAnalyticsRail = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    activeUsers: 127,
    pageViews: 2847,
    sessionDuration: '3m 42s',
    bounceRate: 34.2,
    topPages: [
      { page: '/dashboard', views: 1247 },
      { page: '/devices', views: 892 },
      { page: '/ssl', views: 456 },
      { page: '/uptime', views: 252 }
    ],
    deviceTypes: [
      { type: 'Desktop', percentage: 68 },
      { type: 'Mobile', percentage: 24 },
      { type: 'Tablet', percentage: 8 }
    ],
    realTimeUsers: 23
  });

  useEffect(() => {
    // Initialize Firebase analytics on client side only
    if (typeof window !== 'undefined') {
      import('@/lib/firebase').then(({ analytics: firebaseAnalytics }) => {
        setAnalytics(firebaseAnalytics);
        
        // Log page view when component mounts
        if (firebaseAnalytics) {
          try {
            logEvent(firebaseAnalytics, 'page_view', {
              page_title: 'Dashboard',
              page_location: window.location.href
            });
          } catch (error) {
            console.warn('Firebase Analytics not configured properly:', error);
          }
        }
      }).catch(error => {
        console.warn('Failed to load Firebase analytics:', error);
      });
    }

    // Simulate real-time data updates
    const interval = setInterval(() => {
      setAnalyticsData(prev => ({
        ...prev,
        realTimeUsers: Math.floor(Math.random() * 50) + 10,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5) - 2
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const trackEvent = (eventName: string, parameters?: any) => {
    if (analytics && typeof window !== 'undefined') {
      try {
        logEvent(analytics, eventName, parameters);
      } catch (error) {
        console.warn('Firebase Analytics not configured properly:', error);
      }
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full z-40">
      {/* Toggle Button */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          trackEvent('analytics_rail_toggle', { expanded: !isExpanded });
        }}
        className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-full bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        <BarChart3 className="h-5 w-5" />
      </button>

      {/* Analytics Rail */}
      <div className={`bg-white border-l border-gray-200 shadow-xl transition-all duration-300 ease-in-out h-full overflow-y-auto ${
        isExpanded ? 'w-80' : 'w-0'
      }`}>
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Analytics</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            {/* Real-time Users */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Live Users</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">{analyticsData.realTimeUsers}</div>
              <div className="text-xs text-green-600">Active now</div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Active Users</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{analyticsData.activeUsers.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-700">Page Views</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{analyticsData.pageViews.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Last 30 days</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-gray-700">Avg. Session</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{analyticsData.sessionDuration}</div>
                <div className="text-xs text-gray-500">Duration</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-gray-700">Bounce Rate</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{analyticsData.bounceRate}%</div>
                <div className="text-xs text-gray-500">Exit rate</div>
              </div>
            </div>

            {/* Top Pages */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Top Pages</h4>
              <div className="space-y-2">
                {analyticsData.topPages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600 truncate">{page.page}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{page.views}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Types */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Device Types</h4>
              <div className="space-y-2">
                {analyticsData.deviceTypes.map((device) => {
                  const Icon = device.type === 'Desktop' ? Monitor : device.type === 'Mobile' ? Smartphone : MousePointer;
                  return (
                    <div key={device.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-3 w-3 text-gray-500" />
                        <span className="text-xs text-gray-600">{device.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${device.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-900 w-8">{device.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => trackEvent('export_analytics_data')}
                  className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                >
                  Export Analytics Data
                </button>
                <button 
                  onClick={() => trackEvent('view_detailed_report')}
                  className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                >
                  View Detailed Report
                </button>
                <button 
                  onClick={() => trackEvent('configure_goals')}
                  className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                >
                  Configure Goals
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirebaseAnalyticsRail;