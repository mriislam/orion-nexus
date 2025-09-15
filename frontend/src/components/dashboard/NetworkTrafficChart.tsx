'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
  pointRadius: number;
  pointHoverRadius: number;
  borderWidth: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

const NetworkTrafficChart = () => {
  const [trafficData, setTrafficData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  const [stats, setStats] = useState({
    currentIn: 0,
    currentOut: 0,
    peakIn: 0,
    peakOut: 0,
    avgIn: 0,
    avgOut: 0
  });

  useEffect(() => {
    // Generate mock real-time data
    const generateData = () => {
      const now = new Date();
      const labels = [];
      const inboundData = [];
      const outboundData = [];

      for (let i = 29; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
        labels.push(time.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }));
        
        // Generate realistic network traffic patterns
        const baseIn = 50 + Math.sin(i * 0.1) * 20;
        const baseOut = 30 + Math.cos(i * 0.15) * 15;
        const noiseIn = (Math.random() - 0.5) * 10;
        const noiseOut = (Math.random() - 0.5) * 8;
        
        const inbound = Math.max(0, baseIn + noiseIn);
        const outbound = Math.max(0, baseOut + noiseOut);
        
        inboundData.push(inbound);
        outboundData.push(outbound);
      }

      const currentIn = inboundData[inboundData.length - 1];
      const currentOut = outboundData[outboundData.length - 1];
      const peakIn = Math.max(...inboundData);
      const peakOut = Math.max(...outboundData);
      const avgIn = inboundData.reduce((a, b) => a + b, 0) / inboundData.length;
      const avgOut = outboundData.reduce((a, b) => a + b, 0) / outboundData.length;

      setStats({
        currentIn: Math.round(currentIn * 100) / 100,
        currentOut: Math.round(currentOut * 100) / 100,
        peakIn: Math.round(peakIn * 100) / 100,
        peakOut: Math.round(peakOut * 100) / 100,
        avgIn: Math.round(avgIn * 100) / 100,
        avgOut: Math.round(avgOut * 100) / 100
      });

      setTrafficData({
        labels,
        datasets: [
          {
            label: 'Inbound (Mbps)',
            data: inboundData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2
          },
          {
            label: 'Outbound (Mbps)',
            data: outboundData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2
          }
        ]
      });
    };

    generateData();
    const interval = setInterval(generateData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 6
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return value + ' Mbps';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Network Traffic</h3>
            <p className="text-sm text-gray-500">Real-time bandwidth monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">IN</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 mb-1">{stats.currentIn}</div>
          <div className="text-xs text-blue-600">Mbps current</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">OUT</span>
          </div>
          <div className="text-2xl font-bold text-green-700 mb-1">{stats.currentOut}</div>
          <div className="text-xs text-green-600">Mbps current</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded-full">PEAK</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mb-1">{Math.max(stats.peakIn, stats.peakOut)}</div>
          <div className="text-xs text-purple-600">Mbps peak</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded-full">AVG</span>
          </div>
          <div className="text-2xl font-bold text-gray-700 mb-1">{Math.round((stats.avgIn + stats.avgOut) / 2 * 100) / 100}</div>
          <div className="text-xs text-gray-600">Mbps average</div>
        </div>
      </div>

      {/* Enhanced Chart */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 mb-6">
        <div className="h-64">
          <Line data={trafficData} options={chartOptions} />
        </div>
      </div>

      {/* Enhanced Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingDown className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Inbound Traffic</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Current:</span>
              <span className="font-medium text-blue-700">{stats.currentIn} Mbps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Peak:</span>
              <span className="font-medium text-blue-700">{stats.peakIn} Mbps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Average:</span>
              <span className="font-medium text-blue-700">{stats.avgIn} Mbps</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Outbound Traffic</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Current:</span>
              <span className="font-medium text-green-700">{stats.currentOut} Mbps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Peak:</span>
              <span className="font-medium text-green-700">{stats.peakOut} Mbps</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Average:</span>
              <span className="font-medium text-green-700">{stats.avgOut} Mbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTrafficChart;