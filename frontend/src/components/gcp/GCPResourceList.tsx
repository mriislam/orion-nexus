'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { gcpService } from '@/lib/services/gcp';
import { GCPResource, GCPServiceType } from '@/types';
import { ArrowLeft, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GCPResourceListProps {
  serviceType: GCPServiceType;
  title: string;
  description?: string;
  columns: {
    key: string;
    label: string;
    render?: (value: any, resource: GCPResource) => React.ReactNode;
  }[];
  actions?: {
    label: string;
    onClick: (resource: GCPResource) => void;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  }[];
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const GCPResourceList: React.FC<GCPResourceListProps> = ({
  serviceType,
  title,
  description,
  columns,
  actions = [],
  searchPlaceholder = 'Search resources...',
  emptyMessage = 'No resources found'
}) => {
  const router = useRouter();
  const [resources, setResources] = useState<GCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadResources = async () => {
    try {
      setError(null);
      const data = await gcpService.getResources();
      setResources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [serviceType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadResources();
  };

  const filteredResources = resources.filter(resource =>
    (resource.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
      case 'ready':
        return 'success';
      case 'stopped':
      case 'terminated':
      case 'failed':
        return 'danger';
      case 'pending':
      case 'starting':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const renderCellValue = (column: typeof columns[0], resource: GCPResource): React.ReactNode => {
    const value = resource[column.key as keyof GCPResource];
    
    if (column.render) {
      return column.render(value, resource);
    }

    if (column.key === 'status') {
      return (
        <Badge variant={getStatusBadgeVariant(value as string)}>
          {value as string}
        </Badge>
      );
    }

    if (column.key === 'created_at' || column.key === 'updated_at') {
      return value ? new Date(value as string).toLocaleDateString() : '-';
    }

    return String(value || '-');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredResources.length} of {resources.length} resources
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardContent className="p-0">
            {filteredResources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{emptyMessage}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column.label}
                        </th>
                      ))}
                      {actions.length > 0 && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResources.map((resource) => (
                      <tr key={resource.id} className="hover:bg-gray-50">
                        {columns.map((column) => (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{renderCellValue(column, resource)}</div>
                          </td>
                        ))}
                        {actions.length > 0 && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {actions.map((action, index) => {
                                const Icon = action.icon;
                                return (
                                  <Button
                                    key={index}
                                    onClick={() => action.onClick(resource)}
                                    variant={action.variant || 'ghost'}
                                    size="sm"
                                  >
                                    {Icon && <Icon className="w-4 h-4 mr-1" />}
                                    {action.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default GCPResourceList;