'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Device {
  name: string;
  ip_address: string;
  device_type: string;
  location?: string;
  description?: string;
  snmp_version: string;
  snmp_port: number;
  snmp_community?: string;
  snmp_username?: string;
  snmp_auth_protocol?: string;
  snmp_auth_password?: string;
  snmp_priv_protocol?: string;
  snmp_priv_password?: string;
  enabled: boolean;
  poll_interval: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (devices: Device[]) => Promise<void>;
}

export default function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedDevices, setParsedDevices] = useState<Device[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/device-import-template.csv';
    link.download = 'device-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateDevice = (device: any, rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const row = rowIndex + 2; // +2 because of header row and 0-based index

    // Required fields validation
    if (!device.name || device.name.trim() === '') {
      errors.push({ row, field: 'name', message: 'Device name is required' });
    }
    if (!device.ip_address || device.ip_address.trim() === '') {
      errors.push({ row, field: 'ip_address', message: 'IP address is required' });
    }
    if (!device.device_type || device.device_type.trim() === '') {
      errors.push({ row, field: 'device_type', message: 'Device type is required' });
    }
    if (!device.snmp_version || device.snmp_version.trim() === '') {
      errors.push({ row, field: 'snmp_version', message: 'SNMP version is required' });
    }

    // IP address format validation
    if (device.ip_address) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(device.ip_address)) {
        errors.push({ row, field: 'ip_address', message: 'Invalid IP address format' });
      }
    }

    // Device type validation
    const validDeviceTypes = ['router', 'switch', 'firewall', 'server', 'access_point', 'other'];
    if (device.device_type && !validDeviceTypes.includes(device.device_type.toLowerCase())) {
      errors.push({ row, field: 'device_type', message: 'Invalid device type. Must be one of: ' + validDeviceTypes.join(', ') });
    }

    // SNMP version validation
    const validSnmpVersions = ['v2c', 'v3'];
    if (device.snmp_version && !validSnmpVersions.includes(device.snmp_version.toLowerCase())) {
      errors.push({ row, field: 'snmp_version', message: 'Invalid SNMP version. Must be v2c or v3' });
    }

    // SNMP port validation
    if (device.snmp_port && (isNaN(device.snmp_port) || device.snmp_port < 1 || device.snmp_port > 65535)) {
      errors.push({ row, field: 'snmp_port', message: 'SNMP port must be between 1 and 65535' });
    }

    // Poll interval validation
    if (device.poll_interval && (isNaN(device.poll_interval) || device.poll_interval < 60 || device.poll_interval > 3600)) {
      errors.push({ row, field: 'poll_interval', message: 'Poll interval must be between 60 and 3600 seconds' });
    }

    return errors;
  };

  const parseFile = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const devices: Device[] = [];
      const errors: ValidationError[] = [];

      jsonData.forEach((row: any, index: number) => {
        const deviceErrors = validateDevice(row, index);
        errors.push(...deviceErrors);

        if (deviceErrors.length === 0) {
          devices.push({
            name: row.name?.trim() || '',
            ip_address: row.ip_address?.trim() || '',
            device_type: row.device_type?.toLowerCase() || '',
            location: row.location?.trim() || '',
            description: row.description?.trim() || '',
            snmp_version: row.snmp_version?.toLowerCase() || 'v2c',
            snmp_port: parseInt(row.snmp_port) || 161,
            snmp_community: row.snmp_community?.trim() || '',
            snmp_username: row.snmp_username?.trim() || '',
            snmp_auth_protocol: row.snmp_auth_protocol?.trim() || '',
            snmp_auth_password: row.snmp_auth_password?.trim() || '',
            snmp_priv_protocol: row.snmp_priv_protocol?.trim() || '',
            snmp_priv_password: row.snmp_priv_password?.trim() || '',
            enabled: row.enabled === 'true' || row.enabled === true || row.enabled === 1,
            poll_interval: parseInt(row.poll_interval) || 300
          });
        }
      });

      setParsedDevices(devices);
      setValidationErrors(errors);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      setValidationErrors([{ row: 0, field: 'file', message: 'Error parsing file. Please check the format.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (parsedDevices.length === 0) return;
    
    setStep('importing');
    try {
      await onImport(parsedDevices);
      onClose();
      resetModal();
    } catch (error) {
      console.error('Import failed:', error);
      setStep('preview');
    }
  };

  const resetModal = () => {
    setFile(null);
    setParsedDevices([]);
    setValidationErrors([]);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Devices
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload CSV or Excel File
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Select a CSV or Excel file containing device information
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Need a template?
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                    Download our sample template to see the required format and columns.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                      Validation Errors ({validationErrors.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto">
                      {validationErrors.map((error, index) => (
                        <p key={index} className="text-red-700 dark:text-red-300 text-sm">
                          Row {error.row}, {error.field}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {parsedDevices.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      Ready to Import ({parsedDevices.length} devices)
                    </h4>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      The following devices will be imported:
                    </p>
                  </div>
                </div>
              </div>
            )}

            {parsedDevices.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">IP Address</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Location</th>
                        <th className="px-4 py-2 text-left">SNMP Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedDevices.map((device, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{device.name}</td>
                          <td className="px-4 py-2">{device.ip_address}</td>
                          <td className="px-4 py-2">{device.device_type}</td>
                          <td className="px-4 py-2">{device.location || '-'}</td>
                          <td className="px-4 py-2">{device.snmp_version}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={parsedDevices.length === 0 || validationErrors.length > 0}
                >
                  Import {parsedDevices.length} Devices
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Importing Devices...
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we import your devices.
            </p>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}