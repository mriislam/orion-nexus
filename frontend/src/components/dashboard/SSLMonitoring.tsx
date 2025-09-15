'use client';

import React, { useState, useEffect } from 'react';
import { sslService, SSLCheckResponse } from '@/lib/services/ssl';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Shield, AlertTriangle, CheckCircle, Clock, Globe } from 'lucide-react';
import { useSSLStore } from '@/store';

interface SSLCertData {
  id: string;
  domain: string;
  status: 'valid' | 'warning' | 'expired';
  expiresIn: number;
  issuer: string;
  lastChecked: string;
  grade: string;
}

const mapApiSSLToDashboard = (apiSSL: SSLCheckResponse): SSLCertData => {
  const now = new Date();
  const daysUntilExpiry = apiSSL.days_until_expiry || 0;
  
  let status: 'valid' | 'warning' | 'expired' = 'valid';
  if (!apiSSL.is_valid || daysUntilExpiry <= 0) {
    status = 'expired';
  } else if (daysUntilExpiry <= 30) {
    status = 'warning';
  }
  
  return {
    id: apiSSL.id || apiSSL.domain,
    domain: apiSSL.domain,
    status,
    expiresIn: daysUntilExpiry,
    issuer: apiSSL.issuer || 'Unknown',
    lastChecked: new Date(apiSSL.timestamp).toLocaleString(),
    grade: 'N/A' // Grade not available in API response
  };
};

const SSLMonitoring = () => {
  const { sslChecks } = useSSLStore();
  const [sslData, setSslData] = useState<SSLCertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSSLData = async () => {
      try {
        const response = await sslService.getSSLChecks();
        // Group by domain and get latest check for each
        const latestChecks = response.reduce((acc, check) => {
          if (!acc[check.domain] || new Date(check.timestamp) > new Date(acc[check.domain].timestamp)) {
            acc[check.domain] = check;
          }
          return acc;
        }, {} as Record<string, SSLCheckResponse>);
        
        const mappedData = Object.values(latestChecks).map(mapApiSSLToDashboard);
        setSslData(mappedData);
      } catch (error) {
        console.error('Failed to load SSL data:', error);
        setSslData([]);
      } finally {
        setLoading(false);
      }
    };

    loadSSLData();
  }, []);

  // Mock SSL certificate data (fallback)
  const mockSSLData: SSLCertData[] = [
    {
      id: '1',
      domain: 'api.orion-nexus.com',
      status: 'valid',
      expiresIn: 45,
      issuer: 'Let\'s Encrypt',
      lastChecked: '2 minutes ago',
      grade: 'A+'
    },
    {
      id: '2',
      domain: 'dashboard.orion-nexus.com',
      status: 'valid',
      expiresIn: 67,
      issuer: 'DigiCert',
      lastChecked: '1 minute ago',
      grade: 'A'
    },
    {
      id: '3',
      domain: 'mail.orion-nexus.com',
      status: 'warning',
      expiresIn: 15,
      issuer: 'Let\'s Encrypt',
      lastChecked: '3 minutes ago',
      grade: 'B+'
    },
    {
      id: '4',
      domain: 'legacy.orion-nexus.com',
      status: 'expired',
      expiresIn: -5,
      issuer: 'Comodo',
      lastChecked: '1 hour ago',
      grade: 'F'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string, expiresIn: number) => {
    if (status === 'expired') {
      return <Badge variant="danger" size="sm">Expired</Badge>;
    }
    if (expiresIn <= 30) {
      return <Badge variant="warning" size="sm">Expiring Soon</Badge>;
    }
    return <Badge variant="success" size="sm">Valid</Badge>;
  };

  const getGradeBadge = (grade: string) => {
    const gradeColors: { [key: string]: 'success' | 'warning' | 'danger' | 'info' } = {
      'A+': 'success',
      'A': 'success',
      'B+': 'info',
      'B': 'info',
      'C': 'warning',
      'D': 'warning',
      'F': 'danger'
    };
    return <Badge variant={gradeColors[grade] || 'default'} size="sm">{grade}</Badge>;
  };

  const formatExpiryText = (expiresIn: number) => {
    if (expiresIn < 0) {
      return `Expired ${Math.abs(expiresIn)} days ago`;
    }
    if (expiresIn === 0) {
      return 'Expires today';
    }
    return `Expires in ${expiresIn} days`;
  };

  const validCerts = sslData.filter(cert => cert.status === 'valid' && cert.expiresIn > 30).length;
  const expiringSoon = sslData.filter(cert => cert.expiresIn <= 30 && cert.expiresIn > 0).length;
  const expired = sslData.filter(cert => cert.expiresIn <= 0).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">SSL Certificates</h3>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="h-8 w-8 animate-pulse mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading SSL certificates...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">SSL Certificates</h3>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-500">Monitoring</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-700">{validCerts}</p>
            <p className="text-xs text-green-600">Valid</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-700">{expiringSoon}</p>
            <p className="text-xs text-yellow-600">Expiring Soon</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-700">{expired}</p>
            <p className="text-xs text-red-600">Expired</p>
          </div>
        </div>

        {/* Certificate List */}
        <div className="space-y-3">
          {sslData.map((cert) => (
            <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(cert.status)}
                <div>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-3 w-3 text-gray-400" />
                    <h4 className="font-medium text-gray-900">{cert.domain}</h4>
                  </div>
                  <p className="text-sm text-gray-500">Issuer: {cert.issuer}</p>
                  <p className="text-xs text-gray-400">{cert.lastChecked}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  {getStatusBadge(cert.status, cert.expiresIn)}
                  {getGradeBadge(cert.grade)}
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {formatExpiryText(cert.expiresIn)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Certificates:</span>
            <span className="font-medium">{sslData.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Next Expiry:</span>
            <span className="font-medium text-yellow-600">
              {sslData.filter(c => c.expiresIn > 0).length > 0 
                ? `${Math.min(...sslData.filter(c => c.expiresIn > 0).map(c => c.expiresIn))} days`
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SSLMonitoring;