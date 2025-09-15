'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, RotateCcw, ArrowUp, ArrowDown, Plus, Trash2, Grid3X3, Upload, Download, FileSpreadsheet } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import * as XLSX from 'xlsx';
import { streamService } from '@/lib/services/streams';

interface StreamConfig {
  id: string;
  name: string;
  url: string;
  headers?: Record<string, string>;
  cookies?: string;
  order: number;
}

const SettingsPage = () => {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamConfig[]>([]);
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});
  const [currentGridSize, setCurrentGridSize] = useState(4);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importedData, setImportedData] = useState<StreamConfig[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize streams based on current grid size
  useEffect(() => {
    const loadStreamsAndConfig = async () => {
      try {
        // Try to load from API first
        const [apiStreams, gridConfig] = await Promise.all([
          streamService.getStreams(),
          streamService.getGridConfig()
        ]);
        
        let gridSize = gridConfig.grid_size || 4;
        
        // Check URL params for grid size override
        const urlParams = new URLSearchParams(window.location.search);
        const gridSizeParam = urlParams.get('gridSize');
        if (gridSizeParam) {
          gridSize = parseInt(gridSizeParam);
        }
        
        setCurrentGridSize(gridSize);
        
        if (apiStreams.length > 0) {
          // Convert API streams to settings format
          const settingsStreams = apiStreams.map((stream: any) => ({
            id: stream.id,
            name: stream.title || stream.name,
            url: stream.url,
            headers: stream.headers,
            cookies: stream.cookies,
            order: stream.position || stream.order
          }));
          
          // Ensure we have the right number of streams for current grid size
          const adjustedStreams = Array.from({ length: gridSize }, (_, index) => {
            if (index < settingsStreams.length) {
              return settingsStreams[index];
            }
            return {
              id: `stream-${index + 1}`,
              name: `Stream ${index + 1}`,
              url: '',
              order: index + 1
            };
          });
          setStreams(adjustedStreams);
        } else {
          // Create empty streams for the grid size
          const defaultStreams = Array.from({ length: gridSize }, (_, index) => ({
            id: `stream-${index + 1}`,
            name: `Stream ${index + 1}`,
            url: '',
            order: index + 1
          }));
          setStreams(defaultStreams);
        }
      } catch (error) {
        console.error('Failed to load from API, falling back to localStorage:', error);
        
        // Fallback to localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const gridSizeParam = urlParams.get('gridSize');
        const savedGridSize = localStorage.getItem('mosaicGridSize');
        
        let gridSize = 4; // default
        if (gridSizeParam) {
          gridSize = parseInt(gridSizeParam);
        } else if (savedGridSize) {
          gridSize = parseInt(savedGridSize);
        }
        
        setCurrentGridSize(gridSize);
        
        // Try to load existing streams from localStorage
        const savedStreams = localStorage.getItem('mosaicStreams');
        if (savedStreams) {
          const parsedStreams = JSON.parse(savedStreams);
          // Ensure we have the right number of streams for current grid size
          const adjustedStreams = Array.from({ length: gridSize }, (_, index) => {
            if (index < parsedStreams.length) {
              return parsedStreams[index];
            }
            return {
              id: `stream-${index + 1}`,
              name: `Stream ${index + 1}`,
              url: '',
              order: index + 1
            };
          });
          setStreams(adjustedStreams);
        } else {
          // Create default streams for the grid size
          const defaultStreams = Array.from({ length: gridSize }, (_, index) => ({
            id: `stream-${index + 1}`,
            name: `Stream ${index + 1}`,
            url: '',
            order: index + 1
          }));
          setStreams(defaultStreams);
        }
      }
    };
    
    loadStreamsAndConfig();
   }, []);

  const moveStream = (index: number, direction: 'up' | 'down') => {
    const newStreams = [...streams];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newStreams.length) {
      [newStreams[index], newStreams[targetIndex]] = [newStreams[targetIndex], newStreams[index]];
      setStreams(newStreams);
    }
  };

  const addStream = () => {
    const newStream: StreamConfig = {
      id: Date.now().toString(),
      name: `Stream ${streams.length + 1}`,
      url: '',
      order: streams.length + 1
    };
    setStreams([...streams, newStream]);
  };

  const removeStream = (id: string) => {
    setStreams(streams.filter(stream => stream.id !== id));
  };

  const updateStream = (id: string, updates: Partial<StreamConfig>) => {
    setStreams(streams.map(stream => 
      stream.id === id ? { ...stream, ...updates } : stream
    ));
  };

  const toggleAdvanced = (id: string) => {
    setShowAdvanced(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetToDefaults = () => {
    const defaultStreams = Array.from({ length: currentGridSize }, (_, index) => ({
      id: `stream-${index + 1}`,
      name: `Stream ${index + 1}`,
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      order: index + 1
    }));
    setStreams(defaultStreams);
    setShowAdvanced({});
  };

  const saveSettings = async () => {
    // Delete all existing streams first
    await streamService.deleteAllStreams();
    
    // Create new streams via API
    const streamData = streams.map((stream, index) => ({
      name: stream.name,
      url: stream.url,
      headers: stream.headers,
      cookies: stream.cookies,
      order: index + 1
    }));
    
    await streamService.createBulkStreams(streamData);
    
    // Save grid configuration
    await streamService.saveGridConfig({
      grid_size: currentGridSize,
      streams: [] // Will be populated after streams are created
    });
    
    router.push('/stream-monitoring/channel-viewer');
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['Stream Name', 'Stream URL', 'Headers', 'Cookies', 'Order'],
      ['Example Stream 1', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', '{}', '', '1'],
      ['Example Stream 2', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', '{"Authorization": "Bearer token"}', 'session=abc123', '2']
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'stream-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    try {
      // Allow relative URLs starting with //
      if (url.startsWith('//')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateStreamData = (row: any[], rowIndex: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check required fields
    const nameStr = row[0] ? row[0].toString().trim() : '';
    const urlStr = row[1] ? row[1].toString().trim() : '';
    const headersStr = row[2] ? row[2].toString().trim() : '';
    const orderStr = row[4] ? row[4].toString().trim() : '';
    
    if (!nameStr) {
      errors.push(`Row ${rowIndex + 1}: Stream Name is required`);
    }
    
    if (!urlStr) {
      errors.push(`Row ${rowIndex + 1}: Stream URL is required`);
    } else if (!validateUrl(urlStr)) {
      errors.push(`Row ${rowIndex + 1}: Invalid URL format`);
    }
    
    // Validate Headers JSON if provided
    if (headersStr !== '') {
      try {
        JSON.parse(headersStr);
      } catch {
        errors.push(`Row ${rowIndex + 1}: Headers must be valid JSON format`);
      }
    }
    
    // Validate Order if provided
    if (orderStr !== '') {
      const order = parseInt(orderStr);
      if (isNaN(order) || order < 1) {
        errors.push(`Row ${rowIndex + 1}: Order must be a positive number`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleFileUpload = () => {
    setImportErrors([]);
    fileInputRef.current?.click();
  };

  const processImportedFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          setImportErrors(['File must contain at least one data row (plus header row)']);
          setIsImporting(false);
          return;
        }
        
        // Validate all rows and collect errors
        const allErrors: string[] = [];
        const validStreams: StreamConfig[] = [];
        
        for (let i = 1; i < jsonData.length && validStreams.length < currentGridSize; i++) {
          const row = jsonData[i];
          
          // Skip completely empty rows
          if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }
          
          const validation = validateStreamData(row, i);
          
          if (validation.isValid) {
            let headers: Record<string, string> | undefined;
            try {
              const headersStr = row[2] ? row[2].toString().trim() : '';
              headers = headersStr !== '' ? JSON.parse(headersStr) : undefined;
            } catch {
              headers = undefined;
            }

            const cookiesStr = row[3] ? row[3].toString().trim() : '';
            const orderStr = row[4] ? row[4].toString().trim() : '';

            validStreams.push({
              id: `imported-${i}`,
              name: row[0].toString().trim(),
              url: row[1].toString().trim(),
              headers,
              cookies: cookiesStr !== '' ? cookiesStr : undefined,
              order: orderStr !== '' ? parseInt(orderStr) : validStreams.length + 1
            });
          } else {
            allErrors.push(...validation.errors);
          }
        }
        
        if (allErrors.length > 0) {
          setImportErrors(allErrors);
          setIsImporting(false);
          return;
        }
        
        if (validStreams.length === 0) {
          setImportErrors(['No valid streams found in the file']);
          setIsImporting(false);
          return;
        }
        
        // Fill remaining slots with default streams if needed
        while (validStreams.length < currentGridSize) {
          const index = validStreams.length + 1;
          validStreams.push({
            id: `stream-${index}`,
            name: `Stream ${index}`,
            url: '',
            order: index
          });
        }
        
        setImportedData(validStreams);
        setShowImportDialog(true);
        setIsImporting(false);
        
      } catch (error) {
        console.error('Error parsing file:', error);
        setImportErrors(['Error parsing file. Please check the format and try again.']);
        setIsImporting(false);
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Removed handleLoadStreams - all imports now save to database

  const handleSaveAndLoadStreams = async () => {
    try {
      setStreams(importedData);
      await saveSettings();
      setShowImportDialog(false);
      setImportedData([]);
    } catch (error) {
      console.error('Error saving imported streams:', error);
      alert('Failed to save streams to database. Please try again.');
    }
  };

  const handleCancelImport = () => {
    setShowImportDialog(false);
    setImportedData([]);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => router.push('/stream-monitoring/channel-viewer')}
                className="flex items-center gap-2 hover:bg-blue-50 border-blue-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Channel Viewer
              </Button>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mosaic Player Settings
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Configure your stream sources, playback URLs, and advanced options for the mosaic player.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <Grid3X3 className="w-5 h-5" />
              <span className="font-semibold">Current Grid Size: {currentGridSize} streams</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button
              onClick={addStream}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Stream
            </Button>
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={saveSettings}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Apply Settings
            </Button>
          </div>

          {/* Bulk Import Section */}
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <h3 className="text-xl font-semibold text-purple-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Bulk Import Streams
              </h3>
              <p className="text-purple-600">
                Import multiple stream configurations from an Excel/CSV file. Download the template to see the required format.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={isImporting}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import Excel/CSV'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={processImportedFile}
                  className="hidden"
                />
              </div>
              <div className="mt-4 p-4 bg-purple-100 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Import Instructions:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Download the template to see the required format</li>
                  <li>• Columns: Stream Name, Stream URL, Headers (JSON), Cookies, Order</li>
                  <li>• Headers should be in JSON format: {'"Authorization": "Bearer token"'}</li>
                  <li>• Order column is optional (will use row number if empty)</li>
                  <li>• Only the first {currentGridSize} rows will be imported (matching your grid size)</li>
                  <li>• Supports Excel (.xlsx, .xls) and CSV files</li>
                </ul>
              </div>
              
              {/* Import Errors Display */}
              {importErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Import Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Confirmation Dialog */}
          {showImportDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Import Successful!
                </h3>
                <p className="text-gray-600 mb-6">
                  Found {importedData.length} valid streams. This will replace all existing streams in the database.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleSaveAndLoadStreams}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    SAVE STREAMS TO DATABASE
                  </Button>
                  <Button
                    onClick={handleCancelImport}
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Stream Configuration Cards */}
          <div className="grid gap-6">
            {streams.map((stream, index) => (
              <Card key={stream.id} className="overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <h3 className="text-xl font-semibold">{stream.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStream(index, 'up')}
                        disabled={index === 0}
                        className="text-white hover:bg-white/20"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStream(index, 'down')}
                        disabled={index === streams.length - 1}
                        className="text-white hover:bg-white/20"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStream(stream.id)}
                        className="text-red-200 hover:bg-red-500/20 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Configuration */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stream Name
                        </label>
                        <input
                          type="text"
                          value={stream.name}
                          onChange={(e) => updateStream(stream.id, { name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="Enter stream name"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Playback URL *
                        </label>
                        <input
                          type="text"
                          value={stream.url}
                          onChange={(e) => updateStream(stream.id, { url: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                          placeholder="https://example.com/stream.m3u8 or //live/stream"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supports HLS (.m3u8), DASH (.mpd), and other streaming formats
                        </p>
                      </div>
                    </div>

                    {/* Advanced Configuration */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-800">Advanced Options</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAdvanced(stream.id)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          {showAdvanced[stream.id] ? 'Hide' : 'Show'} Advanced
                        </Button>
                      </div>
                      
                      {showAdvanced[stream.id] && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Custom Headers (Optional)
                            </label>
                            <textarea
                              value={stream.headers ? Object.entries(stream.headers).map(([key, value]) => `${key}: ${value}`).join('\n') : ''}
                              onChange={(e) => {
                                const headerLines = e.target.value.split('\n').filter(line => line.trim());
                                const headers: Record<string, string> = {};
                                headerLines.forEach(line => {
                                  const [key, ...valueParts] = line.split(':');
                                  if (key && valueParts.length > 0) {
                                    headers[key.trim()] = valueParts.join(':').trim();
                                  }
                                });
                                updateStream(stream.id, { headers: Object.keys(headers).length > 0 ? headers : undefined });
                              }}
                              placeholder="Authorization: Bearer token123\nUser-Agent: CustomPlayer/1.0\nReferer: https://example.com"
                              rows={4}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter headers in format: Header-Name: Header-Value (one per line). Used for protected content authentication.
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Cookies (Optional)
                            </label>
                            <input
                              type="text"
                              value={stream.cookies || ''}
                              onChange={(e) => updateStream(stream.id, { cookies: e.target.value || undefined })}
                              placeholder="sessionId=abc123; authToken=xyz789"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter cookies in format: name1=value1; name2=value2. Used for session authentication.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
              <p className="text-gray-600 mb-4">
                Configure your mosaic player settings above. Changes will be applied when you save and return to the channel viewer.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => router.push('/stream-monitoring/channel-viewer')}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveSettings}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;