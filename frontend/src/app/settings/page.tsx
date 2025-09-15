'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Users,
  Clock,
  Mail,
  Smartphone,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  alertThresholds: {
    uptimeBelow: number;
    responseTimeAbove: number;
    sslExpiryDays: number;
  };
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
    requireUppercase: boolean;
  };
  apiKeyRotation: number;
}

interface MonitoringSettings {
  defaultCheckInterval: number;
  maxRetries: number;
  timeout: number;
  locations: string[];
  dataRetention: number;
  snmpTimeout: number;
  sslCheckInterval: number;
  uptimeCheckInterval: number;
  devicePollInterval: number;
}

interface SystemSettings {
  timezone: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    alertThresholds: {
      uptimeBelow: 99.0,
      responseTimeAbove: 5000,
      sslExpiryDays: 30
    }
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: true,
    sessionTimeout: 30,
    passwordPolicy: {
      minLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true
    },
    apiKeyRotation: 90
  });

  const [monitoring, setMonitoring] = useState<MonitoringSettings>({
    defaultCheckInterval: 300,
    maxRetries: 3,
    timeout: 30,
    locations: ['US East', 'EU West'],
    dataRetention: 90,
    snmpTimeout: 5,
    sslCheckInterval: 24,
    uptimeCheckInterval: 5,
    devicePollInterval: 1
  });

  const [system, setSystem] = useState<SystemSettings>({
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    theme: 'light',
    language: 'en',
    autoBackup: true,
    backupFrequency: 'daily'
  });

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'monitoring', name: 'Monitoring', icon: Database },
    { id: 'system', name: 'System', icon: Settings }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setHasChanges(true);
    switch (section) {
      case 'notifications':
        setNotifications(prev => ({ ...prev, [field]: value }));
        break;
      case 'security':
        setSecurity(prev => ({ ...prev, [field]: value }));
        break;
      case 'monitoring':
        setMonitoring(prev => ({ ...prev, [field]: value }));
        break;
      case 'system':
        setSystem(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  const handleNestedInputChange = (section: string, parentField: string, field: string, value: any) => {
    setHasChanges(true);
    switch (section) {
      case 'notifications':
        setNotifications(prev => ({
          ...prev,
          [parentField]: { ...(prev[parentField as keyof NotificationSettings] as any), [field]: value }
        }));
        break;
      case 'security':
        setSecurity(prev => ({
          ...prev,
          [parentField]: { ...(prev[parentField as keyof SecuritySettings] as any), [field]: value }
        }));
        break;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure system preferences and monitoring settings
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <Badge variant="warning">
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "w-full flex items-center px-4 py-3 text-sm font-medium text-left transition-colors",
                          activeTab === tab.id
                            ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Notification Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure how and when you receive alerts
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Alert Methods */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Alert Methods
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email Alerts</p>
                            <p className="text-sm text-gray-500">Receive notifications via email</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInputChange('notifications', 'emailAlerts', !notifications.emailAlerts)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            notifications.emailAlerts ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              notifications.emailAlerts ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Smartphone className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">SMS Alerts</p>
                            <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInputChange('notifications', 'smsAlerts', !notifications.smsAlerts)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            notifications.smsAlerts ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              notifications.smsAlerts ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Bell className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                            <p className="text-sm text-gray-500">Receive browser push notifications</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleInputChange('notifications', 'pushNotifications', !notifications.pushNotifications)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            notifications.pushNotifications ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              notifications.pushNotifications ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Alert Thresholds */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Alert Thresholds
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Uptime Below (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={notifications.alertThresholds.uptimeBelow}
                          onChange={(e) => handleNestedInputChange('notifications', 'alertThresholds', 'uptimeBelow', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Response Time Above (ms)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={notifications.alertThresholds.responseTimeAbove}
                          onChange={(e) => handleNestedInputChange('notifications', 'alertThresholds', 'responseTimeAbove', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          SSL Expiry (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={notifications.alertThresholds.sslExpiryDays}
                          onChange={(e) => handleNestedInputChange('notifications', 'alertThresholds', 'sslExpiryDays', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Security Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure authentication and security policies
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Authentication */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Authentication
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <button
                          onClick={() => handleInputChange('security', 'twoFactorAuth', !security.twoFactorAuth)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            security.twoFactorAuth ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              security.twoFactorAuth ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Session Timeout (minutes)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          value={security.sessionTimeout}
                          onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* API Key Management */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      API Key Management
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current API Key
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value="sk-1234567890abcdef1234567890abcdef"
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                          />
                          <Button
                            onClick={() => setShowApiKey(!showApiKey)}
                            variant="outline"
                            size="sm"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="outline" size="sm">
                            Regenerate
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Auto-rotation (days)
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="365"
                          value={security.apiKeyRotation}
                          onChange={(e) => handleInputChange('security', 'apiKeyRotation', parseInt(e.target.value))}
                          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'monitoring' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Monitoring Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure default monitoring parameters
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Default Check Interval (seconds)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="3600"
                        value={monitoring.defaultCheckInterval}
                        onChange={(e) => handleInputChange('monitoring', 'defaultCheckInterval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Retries
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={monitoring.maxRetries}
                        onChange={(e) => handleInputChange('monitoring', 'maxRetries', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={monitoring.timeout}
                        onChange={(e) => handleInputChange('monitoring', 'timeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Data Retention (days)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="1095"
                        value={monitoring.dataRetention}
                        onChange={(e) => handleInputChange('monitoring', 'dataRetention', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SNMP Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={monitoring.snmpTimeout}
                        onChange={(e) => handleInputChange('monitoring', 'snmpTimeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 5 seconds</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SSL Check Interval (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={monitoring.sslCheckInterval}
                        onChange={(e) => handleInputChange('monitoring', 'sslCheckInterval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 24 hours</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Uptime Check Interval (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={monitoring.uptimeCheckInterval}
                        onChange={(e) => handleInputChange('monitoring', 'uptimeCheckInterval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 5 minutes</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Device Poll Interval (minutes)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={monitoring.devicePollInterval}
                        onChange={(e) => handleInputChange('monitoring', 'devicePollInterval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 1 minute</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monitoring Locations
                    </label>
                    <div className="space-y-2">
                      {['US East', 'US West', 'EU West', 'EU Central', 'Asia Pacific', 'Australia'].map((location) => (
                        <div key={location} className="flex items-center">
                          <input
                            type="checkbox"
                            id={location}
                            checked={monitoring.locations.includes(location)}
                            onChange={(e) => {
                              const newLocations = e.target.checked
                                ? [...monitoring.locations, location]
                                : monitoring.locations.filter(l => l !== location);
                              handleInputChange('monitoring', 'locations', newLocations);
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={location} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'system' && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    System Settings
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure general system preferences
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={system.timezone}
                        onChange={(e) => handleInputChange('system', 'timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <select
                        value={system.theme}
                        onChange={(e) => handleInputChange('system', 'theme', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={system.language}
                        onChange={(e) => handleInputChange('system', 'language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date Format
                      </label>
                      <select
                        value={system.dateFormat}
                        onChange={(e) => handleInputChange('system', 'dateFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
                        <option value="MM/DD/YYYY HH:mm:ss">MM/DD/YYYY HH:mm:ss</option>
                        <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  {/* Backup Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Backup Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Automatic Backup</p>
                          <p className="text-sm text-gray-500">Automatically backup system data</p>
                        </div>
                        <button
                          onClick={() => handleInputChange('system', 'autoBackup', !system.autoBackup)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            system.autoBackup ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              system.autoBackup ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>

                      {system.autoBackup && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Backup Frequency
                          </label>
                          <select
                            value={system.backupFrequency}
                            onChange={(e) => handleInputChange('system', 'backupFrequency', e.target.value)}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}