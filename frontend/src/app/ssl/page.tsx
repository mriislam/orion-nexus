'use client';

import React, { useState, useEffect } from 'react';
import { sslService, SSLCheckResponse } from '@/lib/services/ssl';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Clock,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  status: 'valid' | 'expiring' | 'expired' | 'invalid';
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  keySize: number;
  algorithm: string;
  serialNumber: string;
  fingerprint: string;
  subjectAltNames: string[];
  isWildcard: boolean;
  autoRenewal: boolean;
}

// Helper function to map API SSL data to display format
const mapApiSSLToDisplay = (apiSSL: SSLCheckResponse): SSLCertificate => {
  // Determine status based on validity and expiry
  let status: 'valid' | 'expiring' | 'expired' | 'invalid' = 'invalid';
  if (apiSSL.is_valid) {
    if (apiSSL.days_until_expiry !== undefined) {
      if (apiSSL.days_until_expiry <= 0) {
        status = 'expired';
      } else if (apiSSL.days_until_expiry <= 30) {
        status = 'expiring';
      } else {
        status = 'valid';
      }
    } else {
      status = 'valid';
    }
  }

  // Generate a grade based on days until expiry and validity
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (apiSSL.is_valid) {
    if (apiSSL.days_until_expiry !== undefined) {
      if (apiSSL.days_until_expiry > 90) grade = 'A+';
      else if (apiSSL.days_until_expiry > 60) grade = 'A';
      else if (apiSSL.days_until_expiry > 30) grade = 'B';
      else if (apiSSL.days_until_expiry > 7) grade = 'C';
      else if (apiSSL.days_until_expiry > 0) grade = 'D';
    } else {
      grade = 'A';
    }
  }

  return {
    id: apiSSL.id,
    domain: apiSSL.domain,
    issuer: apiSSL.issuer || 'Unknown',
    status,
    validFrom: apiSSL.expires_at ? new Date(new Date(apiSSL.expires_at).getTime() - (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : '',
    validTo: apiSSL.expires_at ? new Date(apiSSL.expires_at).toISOString().split('T')[0] : '',
    daysUntilExpiry: apiSSL.days_until_expiry || 0,
    grade,
    keySize: 2048, // Default, would need additional API data
    algorithm: apiSSL.signature_algorithm || 'RSA',
    serialNumber: apiSSL.serial_number || '',
    fingerprint: '', // Would need additional API data
    subjectAltNames: [], // Would need additional API data
    isWildcard: apiSSL.domain.startsWith('*'),
    autoRenewal: false // Would need additional API data
  };
};

const mockCertificates: SSLCertificate[] = [
  {
    id: '1',
    domain: 'example.com',
    issuer: 'Let\'s Encrypt Authority X3',
    status: 'valid',
    validFrom: '2024-01-15',
    validTo: '2024-04-15',
    daysUntilExpiry: 45,
    grade: 'A+',
    keySize: 2048,
    algorithm: 'RSA',
    serialNumber: '03:A1:B2:C3:D4:E5:F6:07:08:09',
    fingerprint: 'SHA256:1A2B3C4D5E6F7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
    subjectAltNames: ['www.example.com', 'api.example.com'],
    isWildcard: false,
    autoRenewal: true
  },
  {
    id: '2',
    domain: '*.internal.com',
    issuer: 'DigiCert Inc',
    status: 'valid',
    validFrom: '2023-12-01',
    validTo: '2024-12-01',
    daysUntilExpiry: 285,
    grade: 'A',
    keySize: 2048,
    algorithm: 'RSA',
    serialNumber: '04:B1:C2:D3:E4:F5:06:17:28:39',
    fingerprint: 'SHA256:2B3C4D5E6F7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB',
    subjectAltNames: ['*.internal.com'],
    isWildcard: true,
    autoRenewal: false
  },
  {
    id: '3',
    domain: 'legacy.example.com',
    issuer: 'Symantec Class 3 Secure Server CA',
    status: 'expiring',
    validFrom: '2023-02-28',
    validTo: '2024-02-28',
    daysUntilExpiry: 12,
    grade: 'B',
    keySize: 2048,
    algorithm: 'RSA',
    serialNumber: '05:C1:D2:E3:F4:05:16:27:38:49',
    fingerprint: 'SHA256:3C4D5E6F7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCD',
    subjectAltNames: ['legacy.example.com'],
    isWildcard: false,
    autoRenewal: false
  },
  {
    id: '4',
    domain: 'old.example.com',
    issuer: 'GeoTrust Global CA',
    status: 'expired',
    validFrom: '2022-01-01',
    validTo: '2024-01-01',
    daysUntilExpiry: -15,
    grade: 'F',
    keySize: 1024,
    algorithm: 'RSA',
    serialNumber: '06:D1:E2:F3:04:15:26:37:48:59',
    fingerprint: 'SHA256:4D5E6F7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF',
    subjectAltNames: ['old.example.com'],
    isWildcard: false,
    autoRenewal: false
  },
  {
    id: '5',
    domain: 'test.example.com',
    issuer: 'Cloudflare Inc ECC CA-3',
    status: 'valid',
    validFrom: '2024-01-01',
    validTo: '2025-01-01',
    daysUntilExpiry: 320,
    grade: 'A+',
    keySize: 256,
    algorithm: 'ECDSA',
    serialNumber: '07:E1:F2:03:14:25:36:47:58:69',
    fingerprint: 'SHA256:5E6F7890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
    subjectAltNames: ['test.example.com', 'staging.example.com'],
    isWildcard: false,
    autoRenewal: true
  }
];

const getStatusIcon = (status: SSLCertificate['status']) => {
  switch (status) {
    case 'valid':
      return CheckCircle;
    case 'expiring':
      return Clock;
    case 'expired':
      return XCircle;
    case 'invalid':
      return AlertTriangle;
    default:
      return XCircle;
  }
};

const getStatusColor = (status: SSLCertificate['status']) => {
  switch (status) {
    case 'valid':
      return 'success';
    case 'expiring':
      return 'warning';
    case 'expired':
      return 'danger';
    case 'invalid':
      return 'danger';
    default:
      return 'secondary';
  }
};

const getGradeColor = (grade: SSLCertificate['grade']) => {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    case 'B':
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    case 'C':
    case 'D':
      return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    case 'F':
      return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
  }
};

export default function SSLPage() {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    domain: '',
    port: 443
  });
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<SSLCertificate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load certificates on component mount
  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get latest SSL checks for each domain (last 30 days)
      const apiSSLChecks = await sslService.getSSLChecks({ days: 30, limit: 100 });
      
      // Group by domain and get the latest check for each
      const latestChecks = new Map<string, SSLCheckResponse>();
      apiSSLChecks.forEach(check => {
        const existing = latestChecks.get(check.domain);
        if (!existing || new Date(check.timestamp) > new Date(existing.timestamp)) {
          latestChecks.set(check.domain, check);
        }
      });
      
      // Convert to display format
      const displayCertificates = Array.from(latestChecks.values()).map(mapApiSSLToDisplay);
      setCertificates(displayCertificates);
    } catch (err) {
      console.error('Failed to load SSL certificates:', err);
      setError('Failed to load SSL certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cert.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCertificates();
    setIsRefreshing(false);
  };

  const handleAddCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    try {
      await sslService.createSSLCheck({
        domain: addFormData.domain,
        port: addFormData.port
      });
      
      // Reset form and close modal
      setAddFormData({ domain: '', port: 443 });
      setShowAddForm(false);
      
      // Refresh the certificates list
      await loadCertificates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add certificate');
    } finally {
      setIsAdding(false);
    }
  };

  const handleViewDetails = (cert: SSLCertificate) => {
    setSelectedCertificate(cert);
    setShowDetailsModal(true);
  };

  const handleRenewCertificate = async (cert: SSLCertificate) => {
    try {
      // Trigger a new SSL check to refresh certificate data
      await sslService.createSSLCheck({
        domain: cert.domain,
        port: 443
      });
      
      alert(`Renewal check initiated for ${cert.domain}. The certificate data will be refreshed.`);
      
      // Refresh the certificates list
      await loadCertificates();
    } catch (err) {
      alert(`Failed to initiate renewal for ${cert.domain}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSSLTest = (cert: SSLCertificate) => {
    // Open SSL Labs test in a new tab
    const testUrl = `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(cert.domain)}`;
    window.open(testUrl, '_blank', 'noopener,noreferrer');
  };

  const certificateStats = {
    total: certificates.length,
    valid: certificates.filter(c => c.status === 'valid').length,
    expiring: certificates.filter(c => c.status === 'expiring').length,
    expired: certificates.filter(c => c.status === 'expired').length,
    invalid: certificates.filter(c => c.status === 'invalid').length
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading SSL certificates...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            SSL Certificates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor SSL certificate status and expiration dates
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Certificate
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {certificateStats.total}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valid</p>
                <p className="text-2xl font-bold text-green-600">
                  {certificateStats.valid}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expiring</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {certificateStats.expiring}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {certificateStats.expired}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Invalid</p>
                <p className="text-2xl font-bold text-red-600">
                  {certificateStats.invalid}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Certificate Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add SSL Certificate</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitor a new domain's SSL certificate</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCertificate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={addFormData.domain}
                  onChange={(e) => setAddFormData({ ...addFormData, domain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={addFormData.port}
                  onChange={(e) => setAddFormData({ ...addFormData, port: parseInt(e.target.value) || 443 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="65535"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" variant="primary" disabled={isAdding}>
                  {isAdding ? 'Adding...' : 'Add Certificate'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddFormData({ domain: '', port: 443 });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="expiring">Expiring</option>
                <option value="expired">Expired</option>
                <option value="invalid">Invalid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates List */}
      <div className="space-y-4">
        {filteredCertificates.map((cert) => {
          const StatusIcon = getStatusIcon(cert.status);
          
          return (
            <Card key={cert.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {cert.domain}
                          </h3>
                          {cert.isWildcard && (
                            <Badge variant="info">Wildcard</Badge>
                          )}
                          {cert.autoRenewal && (
                            <Badge variant="success">Auto-Renewal</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          Issued by {cert.issuer}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <div className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap',
                        getGradeColor(cert.grade)
                      )}>
                        Grade {cert.grade}
                      </div>
                      <Badge variant={getStatusColor(cert.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {cert.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Certificate Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valid From</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(cert.validFrom).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valid To</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(cert.validTo).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expires In</p>
                      <p className={cn(
                        'text-sm font-medium',
                        cert.daysUntilExpiry < 0 ? 'text-red-600' :
                        cert.daysUntilExpiry < 30 ? 'text-yellow-600' : 'text-green-600'
                      )}>
                        {cert.daysUntilExpiry < 0 ? 'Expired' : `${cert.daysUntilExpiry} days`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Algorithm</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cert.algorithm} {cert.keySize}
                      </p>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Serial Number</p>
                      <p className="text-xs font-mono text-gray-900 dark:text-white break-all">
                        {cert.serialNumber}
                      </p>
                    </div>
                  </div>
                  
                  {/* Subject Alternative Names */}
                  {cert.subjectAltNames.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Subject Alternative Names
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {cert.subjectAltNames.map((name, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Fingerprint */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Fingerprint
                    </p>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      {cert.fingerprint}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-shrink-0"
                      onClick={() => handleViewDetails(cert)}
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-shrink-0"
                      onClick={() => handleRenewCertificate(cert)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Renew
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-shrink-0"
                      onClick={() => handleSSLTest(cert)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      SSL Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredCertificates.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No certificates found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Certificate Details Modal */}
      {showDetailsModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-blue-600" />
                  Certificate Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Domain and Status */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedCertificate.domain}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusColor(selectedCertificate.status)}>
                        {React.createElement(getStatusIcon(selectedCertificate.status), { className: 'w-3 h-3 mr-1' })}
                        {selectedCertificate.status}
                      </Badge>
                      <div className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium',
                        getGradeColor(selectedCertificate.grade)
                      )}>
                        Grade {selectedCertificate.grade}
                      </div>
                    </div>
                  </div>
                  {selectedCertificate.isWildcard && (
                    <Badge variant="info" className="mr-2">Wildcard</Badge>
                  )}
                  {selectedCertificate.autoRenewal && (
                    <Badge variant="success">Auto-Renewal</Badge>
                  )}
                </div>

                {/* Certificate Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Issuer</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedCertificate.issuer}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Algorithm</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedCertificate.algorithm} {selectedCertificate.keySize}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid From</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedCertificate.validFrom).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valid To</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedCertificate.validTo).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expires In</p>
                    <p className={cn(
                      'text-sm font-medium',
                      selectedCertificate.daysUntilExpiry < 0 ? 'text-red-600' :
                      selectedCertificate.daysUntilExpiry < 30 ? 'text-yellow-600' : 'text-green-600'
                    )}>
                      {selectedCertificate.daysUntilExpiry < 0 ? 'Expired' : `${selectedCertificate.daysUntilExpiry} days`}
                    </p>
                  </div>
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Serial Number</p>
                  <p className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                    {selectedCertificate.serialNumber}
                  </p>
                </div>

                {/* Fingerprint */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fingerprint</p>
                  <p className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                    {selectedCertificate.fingerprint}
                  </p>
                </div>

                {/* Subject Alternative Names */}
                {selectedCertificate.subjectAltNames.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Subject Alternative Names
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCertificate.subjectAltNames.map((name, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRenewCertificate(selectedCertificate)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Renew
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSSLTest(selectedCertificate)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    SSL Test
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}