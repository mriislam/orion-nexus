'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { PingRequest, TracerouteRequest, DNSLookupRequest, DNSLookupResponse, TracerouteResult, PingResult } from '@/types';
import { networkDiagnosticsService } from '@/lib/services/network-diagnostics';

interface DiagnosticResult {
  type: 'ping' | 'traceroute' | 'dns';
  timestamp: string;
  data: any;
  success: boolean;
  error?: string;
}

export default function NetworkDiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<'ping' | 'traceroute' | 'dns'>('ping');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  // Ping state
  const [pingTarget, setPingTarget] = useState('');
  const [pingCount, setPingCount] = useState(4);
  const [pingTimeout, setPingTimeout] = useState(5);

  // Traceroute state
  const [tracerouteTarget, setTracerouteTarget] = useState('');
  const [maxHops, setMaxHops] = useState(30);
  const [tracerouteTimeout, setTracerouteTimeout] = useState(5);

  // DNS state
  const [dnsDomain, setDnsDomain] = useState('');
  const [recordType, setRecordType] = useState<'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'ALL'>('ALL');
  const [nameserver, setNameserver] = useState('');
  const [selectedRecordTypeFilter, setSelectedRecordTypeFilter] = useState<string | null>(null);

  const executePing = async () => {
    if (!pingTarget.trim()) return;

    setIsLoading(true);
    try {
      const request: PingRequest = {
        target: pingTarget,
        count: pingCount,
        timeout: pingTimeout
      };

      const data = await networkDiagnosticsService.ping(request);
      
      const result: DiagnosticResult = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data,
        success: true
      };
      setResults(prev => [result, ...prev]);
    } catch (error) {
      const result: DiagnosticResult = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setResults(prev => [result, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTraceroute = async () => {
    if (!tracerouteTarget.trim()) return;

    setIsLoading(true);
    try {
      const request: TracerouteRequest = {
        target: tracerouteTarget,
        max_hops: maxHops,
        timeout: tracerouteTimeout
      };

      const data = await networkDiagnosticsService.traceroute(request);
      
      const result: DiagnosticResult = {
        type: 'traceroute',
        timestamp: new Date().toISOString(),
        data,
        success: true
      };
      setResults(prev => [result, ...prev]);
    } catch (error) {
      const result: DiagnosticResult = {
        type: 'traceroute',
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setResults(prev => [result, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeDNSLookup = async () => {
    if (!dnsDomain.trim()) return;

    setIsLoading(true);
    setSelectedRecordTypeFilter(null); // Reset filter for new query
    try {
      const request: DNSLookupRequest = {
        domain: dnsDomain,
        record_type: recordType,
        nameserver: nameserver || undefined
      };

      const data = await networkDiagnosticsService.dnsLookup(request);
      
      const result: DiagnosticResult = {
        type: 'dns',
        timestamp: new Date().toISOString(),
        data,
        success: true
      };
      setResults(prev => [result, ...prev]);
    } catch (error) {
      const result: DiagnosticResult = {
        type: 'dns',
        timestamp: new Date().toISOString(),
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setResults(prev => [result, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPingResult = (result: DiagnosticResult) => {
    if (!result.success) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-800">Error:</p>
          <p className="text-xs text-red-700">{result.error}</p>
        </div>
      );
    }

    const data = result.data as PingResult;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-700">Packets Sent</p>
            <p className="text-sm font-bold text-green-900">{data.packets_sent}</p>
          </div>
          <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
            <p className="text-xs font-medium text-purple-700">Packets Received</p>
            <p className="text-sm font-bold text-purple-900">{data.packets_received}</p>
          </div>
          <div className={`p-2 rounded-lg border ${
            data.packet_loss_percent > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <p className={`text-xs font-medium ${
              data.packet_loss_percent > 0 ? 'text-red-700' : 'text-green-700'
            }`}>Packet Loss</p>
            <p className={`text-sm font-bold ${
              data.packet_loss_percent > 0 ? 'text-red-900' : 'text-green-900'
            }`}>{data.packet_loss_percent}%</p>
          </div>
          <div className="bg-teal-50 p-2 rounded-lg border border-teal-200">
            <p className="text-xs font-medium text-teal-700">Avg Time</p>
            <p className="text-sm font-bold text-teal-900">{data.avg_time?.toFixed(2)}ms</p>
          </div>
        </div>
        {data.min_time && data.max_time && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
              <p className="text-xs font-medium text-indigo-700">Min Time</p>
              <p className="text-sm font-bold text-indigo-900">{data.min_time.toFixed(2)}ms</p>
            </div>
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
              <p className="text-xs font-medium text-orange-700">Max Time</p>
              <p className="text-sm font-bold text-orange-900">{data.max_time.toFixed(2)}ms</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTracerouteResult = (result: DiagnosticResult) => {
    if (!result.success) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-800">Error:</p>
          <p className="text-xs text-red-700">{result.error}</p>
        </div>
      );
    }

    const data = result.data as TracerouteResult;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-700">Target</p>
            <p className="text-sm font-bold text-blue-900">{data.target}</p>
          </div>
          <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
            <p className="text-xs font-medium text-purple-700">Total Hops</p>
            <p className="text-sm font-bold text-purple-900">{data.total_hops}</p>
          </div>
          <div className={`p-2 rounded-lg border ${
            data.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-xs font-medium ${
              data.success ? 'text-green-700' : 'text-red-700'
            }`}>Status</p>
            <p className={`text-sm font-bold ${
              data.success ? 'text-green-900' : 'text-red-900'
            }`}>{data.success ? 'Success' : 'Failed'}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Route Path:</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {data.hops.map((hop, index) => (
              <div key={index} className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">{hop.hop_number}</span>
                    <span className="font-mono text-gray-800 text-xs font-medium">
                      {hop.hostname || hop.ip_address || '*'}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    hop.is_timeout || hop.timeout ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {hop.is_timeout || hop.timeout ? 'timeout' : 
                      (() => {
                        const rtts = [hop.rtt1, hop.rtt2, hop.rtt3].filter(rtt => rtt !== null && rtt !== undefined);
                        return rtts.length > 0 ? `${rtts.join('ms, ')}ms` : 'timeout';
                      })()
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDNSResult = (result: DiagnosticResult) => {
    if (!result.success) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-800">Error:</p>
          <p className="text-xs text-red-700">{result.error}</p>
        </div>
      );
    }

    const data = result.data as DNSLookupResponse;
    
    // Group records by type
    const recordsByType = data.records.reduce((acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = [];
      }
      acc[record.type].push(record);
      return acc;
    }, {} as Record<string, typeof data.records>);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-600">Domain</p>
            <p className="text-sm font-semibold">{data.domain}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Query Type</p>
            <p className="text-sm font-semibold">{data.record_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Query Time</p>
            <p className="text-sm font-semibold">{data.query_time.toFixed(2)}ms</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Records</p>
            <p className="text-sm font-semibold">{data.total_records}</p>
          </div>
        </div>
        
        {data.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
            <p className="text-yellow-800 text-xs">{data.error}</p>
          </div>
        )}
        
        {data.record_types_found.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Record Types Found (click to filter):</p>
            <div className="flex flex-wrap gap-1">
              <Badge 
                key="all" 
                variant="secondary" 
                className={`cursor-pointer transition-all duration-200 text-xs font-medium ${
                  selectedRecordTypeFilter === null 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-md' 
                    : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 hover:from-blue-200 hover:to-purple-200'
                }`}
                onClick={() => setSelectedRecordTypeFilter(null)}
              >
                ALL
              </Badge>
              {data.record_types_found.map((type) => (
                <Badge 
                  key={type} 
                  variant="secondary" 
                  className={`cursor-pointer transition-all duration-200 text-xs font-medium ${
                    selectedRecordTypeFilter === type 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-md' 
                      : 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 hover:from-blue-200 hover:to-purple-200'
                  }`}
                  onClick={() => setSelectedRecordTypeFilter(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {Object.keys(recordsByType).length > 0 && (
          <div className="space-y-2">
            {Object.entries(recordsByType)
              .filter(([type]) => selectedRecordTypeFilter === null || selectedRecordTypeFilter === type)
              .map(([type, records]) => {
              const typeColors = {
                'A': 'from-blue-500 to-blue-600',
                'AAAA': 'from-indigo-500 to-indigo-600', 
                'CNAME': 'from-green-500 to-green-600',
                'MX': 'from-orange-500 to-orange-600',
                'TXT': 'from-purple-500 to-purple-600',
                'NS': 'from-teal-500 to-teal-600',
                'SOA': 'from-red-500 to-red-600',
                'PTR': 'from-pink-500 to-pink-600'
              };
              const gradientClass = typeColors[type as keyof typeof typeColors] || 'from-gray-500 to-gray-600';
              
              return (
                <div key={type} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-white to-gray-50 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Badge className={`bg-gradient-to-r ${gradientClass} text-white border-0 text-xs font-medium px-2 py-0.5`}>{type}</Badge>
                    <span className="text-xs text-gray-600 font-medium">({records.length} record{records.length !== 1 ? 's' : ''})</span>
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {records.map((record, index) => (
                      <div key={index} className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-mono text-gray-800 text-xs font-medium break-all">{record.value}</span>
                          <div className="flex gap-2 text-xs text-gray-500 ml-2 flex-shrink-0">
                            {record.ttl && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">TTL: {record.ttl}s</span>}
                            {record.priority && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">Priority: {record.priority}</span>}
                          </div>
                        </div>
                        {record.name !== data.domain && (
                          <div className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded mt-1">Name: {record.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">Network Diagnostics</h1>
          <p className="text-sm text-gray-600">Perform network diagnostic tests including PING, TRACEROUTE, and DNS lookups with ease</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gradient-to-r from-blue-50 to-purple-50 p-1 rounded-lg border border-blue-200">
            {(['ping', 'traceroute', 'dns'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Ping Controls */}
          {activeTab === 'ping' && (
            <Card className="p-4 border-blue-100 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-base font-semibold mb-3 text-blue-700">PING Test</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target (IP or hostname)
                  </label>
                  <input
                    type="text"
                    value={pingTarget}
                    onChange={(e) => setPingTarget(e.target.value)}
                    placeholder="e.g., google.com or 8.8.8.8"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Count
                    </label>
                    <input
                      type="number"
                      value={pingCount}
                      onChange={(e) => setPingCount(parseInt(e.target.value) || 4)}
                      min="1"
                      max="20"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      value={pingTimeout}
                      onChange={(e) => setPingTimeout(parseInt(e.target.value) || 5)}
                      min="1"
                      max="30"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={executePing}
                  disabled={isLoading || !pingTarget.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium py-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? 'Running PING...' : 'Run PING Test'}
                </Button>
              </div>
            </Card>
          )}

          {/* Traceroute Controls */}
          {activeTab === 'traceroute' && (
            <Card className="p-4 border-green-100 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-base font-semibold mb-3 text-green-700">TRACEROUTE Test</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target (IP or hostname)
                  </label>
                  <input
                    type="text"
                    value={tracerouteTarget}
                    onChange={(e) => setTracerouteTarget(e.target.value)}
                    placeholder="e.g., google.com or 8.8.8.8"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Hops
                    </label>
                    <input
                      type="number"
                      value={maxHops}
                      onChange={(e) => setMaxHops(parseInt(e.target.value) || 30)}
                      min="1"
                      max="64"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      value={tracerouteTimeout}
                      onChange={(e) => setTracerouteTimeout(parseInt(e.target.value) || 5)}
                      min="1"
                      max="30"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={executeTraceroute}
                  disabled={isLoading || !tracerouteTarget.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-medium py-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? 'Running TRACEROUTE...' : 'Run TRACEROUTE Test'}
                </Button>
              </div>
            </Card>
          )}

          {/* DNS Controls */}
          {activeTab === 'dns' && (
            <Card className="p-4 border-purple-100 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <h3 className="text-base font-semibold mb-3 text-purple-700">DNS Lookup</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={dnsDomain}
                    onChange={(e) => setDnsDomain(e.target.value)}
                    placeholder="e.g., google.com"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Record Type
                    </label>
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Records</option>
                      <option value="A">A (IPv4 Address)</option>
                      <option value="AAAA">AAAA (IPv6 Address)</option>
                      <option value="CNAME">CNAME (Canonical Name)</option>
                      <option value="MX">MX (Mail Exchange)</option>
                      <option value="TXT">TXT (Text Record)</option>
                      <option value="NS">NS (Name Server)</option>
                      <option value="SOA">SOA (Start of Authority)</option>
                      <option value="PTR">PTR (Pointer Record)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nameserver (optional)
                    </label>
                    <input
                      type="text"
                      value={nameserver}
                      onChange={(e) => setNameserver(e.target.value)}
                      placeholder="e.g., 8.8.8.8"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={executeDNSLookup}
                  disabled={isLoading || !dnsDomain.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium py-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? 'Running DNS Lookup...' : 'Run DNS Lookup'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        <div>
          <Card className="p-4 shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">Results</h3>
              {results.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResults([])}
                  className="text-xs py-1 px-2"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {results.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No results yet. Run a diagnostic test to see results here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={result.success ? 'success' : 'danger'} className="text-xs font-medium">
                          {result.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {result.type === 'ping' && renderPingResult(result)}
                    {result.type === 'traceroute' && renderTracerouteResult(result)}
                    {result.type === 'dns' && renderDNSResult(result)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      </div>
    </Layout>
  );
}