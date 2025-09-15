'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Radio,
  Play,
  Pause,
  Square,
  Activity,
  Users,
  Clock,
  Signal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamData {
  id: string;
  name: string;
  url: string;
  status: 'live' | 'offline' | 'error';
  viewers: number;
  duration: string;
  bitrate: string;
  resolution: string;
  fps: number;
  lastSeen: string;
}

const mockStreams: StreamData[] = [
  {
    id: '1',
    name: 'Main Conference Stream',
    url: 'rtmp://stream.example.com/live/main',
    status: 'live',
    viewers: 1247,
    duration: '02:34:12',
    bitrate: '2.5 Mbps',
    resolution: '1920x1080',
    fps: 30,
    lastSeen: '2 seconds ago'
  },
  {
    id: '2',
    name: 'Backup Stream',
    url: 'rtmp://stream.example.com/live/backup',
    status: 'offline',
    viewers: 0,
    duration: '00:00:00',
    bitrate: '0 Mbps',
    resolution: '1920x1080',
    fps: 0,
    lastSeen: '5 minutes ago'
  },
  {
    id: '3',
    name: 'Mobile Stream',
    url: 'rtmp://stream.example.com/live/mobile',
    status: 'error',
    viewers: 0,
    duration: '00:15:23',
    bitrate: '1.2 Mbps',
    resolution: '1280x720',
    fps: 24,
    lastSeen: '1 minute ago'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'live':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'offline':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'live':
      return <CheckCircle className="w-4 h-4" />;
    case 'offline':
      return <XCircle className="w-4 h-4" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <XCircle className="w-4 h-4" />;
  }
};

export default function StreamMonitoringPage() {
  const [streams, setStreams] = useState<StreamData[]>(mockStreams);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  const totalStreams = streams.length;
  const liveStreams = streams.filter(s => s.status === 'live').length;
  const totalViewers = streams.reduce((sum, s) => sum + s.viewers, 0);
  const errorStreams = streams.filter(s => s.status === 'error').length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Radio className="w-8 h-8 mr-3 text-blue-600" />
                Stream Monitoring
              </h1>
              <p className="text-gray-600">Monitor live streams, track performance, and manage streaming infrastructure</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Stream
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Streams</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStreams}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Radio className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Live Streams</p>
                  <p className="text-2xl font-bold text-green-600">{liveStreams}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Viewers</p>
                  <p className="text-2xl font-bold text-purple-600">{totalViewers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{errorStreams}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Streams List */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold flex items-center">
              <Signal className="w-5 h-5 mr-2" />
              Active Streams
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {streams.map((stream) => (
                <div
                  key={stream.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md",
                    selectedStream === stream.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  )}
                  onClick={() => setSelectedStream(selectedStream === stream.id ? null : stream.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(stream.status)}
                        <Badge className={getStatusColor(stream.status)}>
                          {stream.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{stream.name}</h3>
                        <p className="text-sm text-gray-500">{stream.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{stream.viewers}</p>
                        <p className="text-xs text-gray-500">Viewers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{stream.duration}</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{stream.bitrate}</p>
                        <p className="text-xs text-gray-500">Bitrate</p>
                      </div>
                      <div className="flex space-x-2">
                        {stream.status === 'live' ? (
                          <Button size="sm" variant="outline">
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Square className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {selectedStream === stream.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Resolution:</span>
                          <span className="ml-2 text-gray-900">{stream.resolution}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">FPS:</span>
                          <span className="ml-2 text-gray-900">{stream.fps}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Last Seen:</span>
                          <span className="ml-2 text-gray-900">{stream.lastSeen}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Stream ID:</span>
                          <span className="ml-2 text-gray-900 font-mono">{stream.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}