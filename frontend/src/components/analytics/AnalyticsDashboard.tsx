'use client';

import React from 'react';
import AnalyticsChart from './AnalyticsChart';
import MetricsCard from './MetricsCard';
import { Users, Eye, MousePointer, Clock, Globe, TrendingUp } from 'lucide-react';

interface DashboardData {
  metrics: {
    activeUsers: number;
    pageViews: number;
    sessions: number;
    bounceRate: number;
    avgSessionDuration: number;
    newUsers: number;
  };
  trends: {
    activeUsersChange: number;
    pageViewsChange: number;
    sessionsChange: number;
    bounceRateChange: number;
  };
  chartData: {
    timeline: {
      labels: string[];
      users: number[];
      pageViews: number[];
      sessions: number[];
    };
    trafficSources: {
      labels: string[];
      data: number[];
    };
    topPages: {
      labels: string[];
      data: number[];
    };
  };
}

interface AnalyticsDashboardProps {
  data: DashboardData;
  loading?: boolean;
  timeRange?: string;
  onMetricClick?: (metric: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  loading = false,
  timeRange = 'Last 7 days',
  onMetricClick
}) => {
  // Prepare chart data
  const timelineChartData = {
    labels: data.chartData.timeline.labels,
    datasets: [
      {
        label: 'Users',
        data: data.chartData.timeline.users,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Page Views',
        data: data.chartData.timeline.pageViews,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Sessions',
        data: data.chartData.timeline.sessions,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const trafficSourcesChartData = {
    labels: data.chartData.trafficSources.labels,
    datasets: [
      {
        label: 'Traffic Sources',
        data: data.chartData.trafficSources.data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const topPagesChartData = {
    labels: data.chartData.topPages.labels,
    datasets: [
      {
        label: 'Page Views',
        data: data.chartData.topPages.data,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <MetricsCard
          title="Active Users"
          value={data.metrics.activeUsers}
          change={data.trends.activeUsersChange}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle={timeRange}
          description="Users who visited your site"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('activeUsers')}
        />
        
        <MetricsCard
          title="Page Views"
          value={data.metrics.pageViews}
          change={data.trends.pageViewsChange}
          icon={<Eye className="w-5 h-5" />}
          color="green"
          subtitle={timeRange}
          description="Total pages viewed"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('pageViews')}
        />
        
        <MetricsCard
          title="Sessions"
          value={data.metrics.sessions}
          change={data.trends.sessionsChange}
          icon={<MousePointer className="w-5 h-5" />}
          color="purple"
          subtitle={timeRange}
          description="User sessions on your site"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('sessions')}
        />
        
        <MetricsCard
          title="Bounce Rate"
          value={`${(data.metrics.bounceRate * 100).toFixed(1)}%`}
          change={data.trends.bounceRateChange}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
          subtitle={timeRange}
          description="Single-page sessions"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('bounceRate')}
        />
        
        <MetricsCard
          title="Avg. Session"
          value={`${Math.floor(data.metrics.avgSessionDuration / 60)}m ${Math.round(data.metrics.avgSessionDuration % 60)}s`}
          icon={<Clock className="w-5 h-5" />}
          color="gray"
          subtitle="Duration"
          description="Average time per session"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('sessionDuration')}
        />
        
        <MetricsCard
          title="New Users"
          value={data.metrics.newUsers}
          icon={<Globe className="w-5 h-5" />}
          color="red"
          subtitle={timeRange}
          description="First-time visitors"
          loading={loading}
          clickable={!!onMetricClick}
          onClick={() => onMetricClick?.('newUsers')}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2">
          <AnalyticsChart
            title={`Traffic Overview - ${timeRange}`}
            type="line"
            data={timelineChartData}
            height={350}
          />
        </div>
        
        {/* Traffic Sources */}
        <AnalyticsChart
          title="Traffic Sources"
          type="doughnut"
          data={trafficSourcesChartData}
          height={300}
        />
        
        {/* Top Pages */}
        <AnalyticsChart
          title="Top Pages"
          type="bar"
          data={topPagesChartData}
          height={300}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;