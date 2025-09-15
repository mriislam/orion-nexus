'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { deviceService, CreateDeviceRequest, DeviceType } from '@/lib/services/device';
import { X } from 'lucide-react';

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceAdded: () => void;
}

export default AddDeviceModal;
export function AddDeviceModal({ open, onOpenChange, onDeviceAdded }: AddDeviceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDeviceRequest>({
    name: '',
    ip_address: '',
    device_type: 'router',
    location: '',
    description: '',
    snmp_version: 'v2c',
    snmp_port: 161,
    snmp_community: 'public',
    snmp_username: '',
    snmp_auth_protocol: '',
    snmp_auth_password: '',
    snmp_priv_protocol: '',
    snmp_priv_password: '',
    enabled: true,
    poll_interval: 300
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare data with proper null handling for optional enum fields
      const deviceData = {
        ...formData,
        snmp_auth_protocol: formData.snmp_auth_protocol === '' ? null : formData.snmp_auth_protocol,
        snmp_priv_protocol: formData.snmp_priv_protocol === '' ? null : formData.snmp_priv_protocol,
        location: formData.location === '' ? null : formData.location,
        description: formData.description === '' ? null : formData.description,
        snmp_community: formData.snmp_community === '' ? null : formData.snmp_community,
        snmp_username: formData.snmp_username === '' ? null : formData.snmp_username,
        snmp_auth_password: formData.snmp_auth_password === '' ? null : formData.snmp_auth_password,
        snmp_priv_password: formData.snmp_priv_password === '' ? null : formData.snmp_priv_password
      };
      
      await deviceService.createDevice(deviceData);
      showToast('Device added successfully', 'success');
      onDeviceAdded();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        ip_address: '',
        device_type: 'router',
        location: '',
        description: '',
        snmp_version: 'v2c',
        snmp_port: 161,
        snmp_community: 'public',
        snmp_username: '',
        snmp_auth_protocol: '',
        snmp_auth_password: '',
        snmp_priv_protocol: '',
        snmp_priv_password: '',
        enabled: true,
        poll_interval: 300
      });
    } catch (error) {
      // Failed to add device
      showToast('Failed to add device. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateDeviceRequest, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation - you can replace with a proper toast library
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold">Add New Device</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent>
        
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Device Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('name', e.target.value)}
                  placeholder="Enter device name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700">IP Address *</label>
                <input
                  id="ip_address"
                  type="text"
                  value={formData.ip_address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('ip_address', e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="device_type" className="block text-sm font-medium text-gray-700">Device Type *</label>
                <select
                  id="device_type"
                  value={formData.device_type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('device_type', e.target.value as DeviceType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="router">Router</option>
                  <option value="switch">Switch</option>
                  <option value="firewall">Firewall</option>
                  <option value="server">Server</option>
                  <option value="printer">Printer</option>
                  <option value="access_point">Access Point</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  id="location"
                  type="text"
                  value={formData.location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('location', e.target.value)}
                  placeholder="Building, Floor, Room"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormData('description', e.target.value)}
                placeholder="Device description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SNMP Configuration */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">SNMP Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="snmp_version" className="block text-sm font-medium text-gray-700">SNMP Version *</label>
                  <select
                    id="snmp_version"
                    value={formData.snmp_version}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('snmp_version', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="v2c">v2c</option>
                    <option value="v3">v3</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="snmp_port" className="block text-sm font-medium text-gray-700">SNMP Port</label>
                  <input
                    id="snmp_port"
                    type="number"
                    value={formData.snmp_port || 161}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('snmp_port', parseInt(e.target.value))}
                    placeholder="161"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {formData.snmp_version === 'v2c' && (
                <div className="space-y-2 mt-4">
                  <label htmlFor="snmp_community" className="block text-sm font-medium text-gray-700">Community String</label>
                  <input
                    id="snmp_community"
                    type="text"
                    value={formData.snmp_community || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('snmp_community', e.target.value)}
                    placeholder="public"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.snmp_version === 'v3' && (
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label htmlFor="snmp_username" className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                      id="snmp_username"
                      type="text"
                      value={formData.snmp_username || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('snmp_username', e.target.value)}
                      placeholder="SNMP v3 username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="snmp_auth_protocol" className="block text-sm font-medium text-gray-700">Auth Protocol</label>
                      <select
                        id="snmp_auth_protocol"
                        value={formData.snmp_auth_protocol || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('snmp_auth_protocol', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        <option value="MD5">MD5</option>
                        <option value="SHA">SHA</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="snmp_auth_password" className="block text-sm font-medium text-gray-700">Auth Password</label>
                      <input
                        id="snmp_auth_password"
                        type="password"
                        value={formData.snmp_auth_password || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('snmp_auth_password', e.target.value)}
                        placeholder="Authentication password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="snmp_priv_protocol" className="block text-sm font-medium text-gray-700">Privacy Protocol</label>
                      <select
                        id="snmp_priv_protocol"
                        value={formData.snmp_priv_protocol || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData('snmp_priv_protocol', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        <option value="DES">DES</option>
                        <option value="AES">AES</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="snmp_priv_password" className="block text-sm font-medium text-gray-700">Privacy Password</label>
                      <input
                        id="snmp_priv_password"
                        type="password"
                        value={formData.snmp_priv_password || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('snmp_priv_password', e.target.value)}
                        placeholder="Privacy password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Advanced Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="poll_interval" className="block text-sm font-medium text-gray-700">Poll Interval (seconds)</label>
                  <input
                    id="poll_interval"
                    type="number"
                    value={formData.poll_interval || 300}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('poll_interval', parseInt(e.target.value))}
                    placeholder="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    id="enabled"
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium text-gray-700">Enable monitoring</label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
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
                {isLoading ? 'Adding...' : 'Add Device'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}