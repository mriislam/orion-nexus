'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { uptimeService, UptimeMonitor, CreateUptimeMonitorRequest } from '@/lib/services/uptime';
import { X, AlertTriangle, Globe, Clock, Activity, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// View Details Modal
interface ViewDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor: UptimeMonitor | null;
}

export function ViewDetailsModal({ open, onOpenChange, monitor }: ViewDetailsModalProps) {
  if (!open || !monitor) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Monitor Details: {monitor.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{monitor.url}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={cn('w-3 h-3 rounded-full', getStatusColor(monitor.current_status || 'down'))} />
                <span className="font-medium">Current Status</span>
              </div>
              <p className="text-lg font-bold mt-1 capitalize">{monitor.current_status || 'Unknown'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-600" />
                <span className="font-medium">Uptime</span>
              </div>
              <p className="text-lg font-bold mt-1 text-green-600">
                {monitor.uptime_percentage ? `${monitor.uptime_percentage.toFixed(2)}%` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Avg Response</span>
              </div>
              <p className="text-lg font-bold mt-1 text-blue-600">
                {monitor.avg_response_time ? `${Math.round(monitor.avg_response_time)}ms` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Configuration Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Method</label>
                  <p className="font-medium">{monitor.method}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Status Code</label>
                  <p className="font-medium">{monitor.expected_status_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Check Interval</label>
                  <p className="font-medium">{Math.round(monitor.check_interval / 60)} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeout</label>
                  <p className="font-medium">{monitor.timeout} seconds</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Max Retries</label>
                  <p className="font-medium">{monitor.max_retries}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Follow Redirects</label>
                  <p className="font-medium">{monitor.follow_redirects ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Verify SSL</label>
                  <p className="font-medium">{monitor.verify_ssl ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Alert on Failure</label>
                  <p className="font-medium">{monitor.alert_on_failure ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Locations */}
          {monitor.locations && monitor.locations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Monitoring Locations</h3>
              <div className="flex flex-wrap gap-2">
                {monitor.locations.map((location, index) => (
                  <Badge key={index} variant="secondary">
                    <Globe className="w-3 h-3 mr-1" />
                    {location}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {monitor.tags && monitor.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {monitor.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Expected Content */}
          {monitor.expected_content && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Expected Content</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <code className="text-sm">{monitor.expected_content}</code>
              </div>
            </div>
          )}

          {/* Headers */}
          {monitor.headers && Object.keys(monitor.headers).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Custom Headers</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                {Object.entries(monitor.headers).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1">
                    <span className="font-medium">{key}:</span>
                    <span className="text-gray-600 dark:text-gray-400">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => window.open(monitor.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit URL
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Edit Monitor Modal
interface EditMonitorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor: UptimeMonitor | null;
  onMonitorUpdated: () => void;
}

export function EditMonitorModal({ open, onOpenChange, monitor, onMonitorUpdated }: EditMonitorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateUptimeMonitorRequest>>({});

  // Initialize form data when monitor changes
  React.useEffect(() => {
    if (monitor) {
      setFormData({
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        expected_status_code: monitor.expected_status_code,
        expected_content: monitor.expected_content,
        check_interval: monitor.check_interval,
        timeout: monitor.timeout,
        max_retries: monitor.max_retries,
        headers: monitor.headers,
        body: monitor.body,
        follow_redirects: monitor.follow_redirects,
        verify_ssl: monitor.verify_ssl,
        alert_on_failure: monitor.alert_on_failure,
        alert_threshold: monitor.alert_threshold,
        locations: monitor.locations,
        tags: monitor.tags
      });
    }
  }, [monitor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monitor) return;
    
    setIsLoading(true);
    try {
      await uptimeService.updateMonitor(monitor.id, formData);
      showToast('Monitor updated successfully', 'success');
      onMonitorUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update monitor:', error);
      showToast('Failed to update monitor. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateUptimeMonitorRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  if (!open || !monitor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Monitor</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monitor Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL *</label>
                <input
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => updateFormData('url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
                <select
                  value={formData.method || 'GET'}
                  onChange={(e) => updateFormData('method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Status Code</label>
                <input
                  type="number"
                  value={formData.expected_status_code || 200}
                  onChange={(e) => updateFormData('expected_status_code', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check Interval (seconds)</label>
                <input
                  type="number"
                  value={formData.check_interval || 300}
                  onChange={(e) => updateFormData('check_interval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="60"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timeout (seconds)</label>
                <input
                  type="number"
                  value={formData.timeout || 30}
                  onChange={(e) => updateFormData('timeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Retries</label>
                <input
                  type="number"
                  value={formData.max_retries || 3}
                  onChange={(e) => updateFormData('max_retries', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Content (optional)</label>
              <input
                type="text"
                value={formData.expected_content || ''}
                onChange={(e) => updateFormData('expected_content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Text that should be present in the response"
              />
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.follow_redirects || false}
                  onChange={(e) => updateFormData('follow_redirects', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow Redirects</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.verify_ssl !== false}
                  onChange={(e) => updateFormData('verify_ssl', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Verify SSL</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.alert_on_failure !== false}
                  onChange={(e) => updateFormData('alert_on_failure', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Alert on Failure</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Monitor'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Delete Confirmation Modal
interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor: UptimeMonitor | null;
  onMonitorDeleted: () => void;
}

export function DeleteConfirmationModal({ open, onOpenChange, monitor, onMonitorDeleted }: DeleteConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<'confirm' | 'type-name'>('confirm');

  const handleFirstConfirm = () => {
    setStep('type-name');
  };

  const handleDelete = async () => {
    if (!monitor || confirmationText !== monitor.name) return;
    
    setIsLoading(true);
    try {
      await uptimeService.deleteMonitor(monitor.id);
      showToast('Monitor deleted successfully', 'success');
      onMonitorDeleted();
      onOpenChange(false);
      setStep('confirm');
      setConfirmationText('');
    } catch (error) {
      console.error('Failed to delete monitor:', error);
      showToast('Failed to delete monitor. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep('confirm');
    setConfirmationText('');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  if (!open || !monitor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-red-600">Delete Monitor</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'confirm' ? (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">
                  Are you sure you want to delete the monitor <strong>"{monitor.name}"</strong>?
                </p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-2">
                  This action cannot be undone. All monitoring data and history will be permanently deleted.
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleFirstConfirm}>
                  Yes, Delete
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                  Final Confirmation Required
                </p>
                <p className="text-red-600 dark:text-red-300 text-sm mb-3">
                  To confirm deletion, please type the monitor name exactly as shown below:
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded border">
                  <code className="text-sm font-mono">{monitor.name}</code>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type monitor name to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter monitor name"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDelete}
                  disabled={isLoading || confirmationText !== monitor.name}
                >
                  {isLoading ? 'Deleting...' : 'Delete Monitor'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}