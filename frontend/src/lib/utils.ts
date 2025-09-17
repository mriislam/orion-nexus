import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChartDataPoint, InterfaceChartData, InterfaceStatus } from '@/types';

// Tailwind CSS class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTimeAgo(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

// Data formatting utilities
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatBitsPerSecond(bps: number, decimals: number = 2): string {
  if (bps === 0) return '0 bps';

  const k = 1000; // Use 1000 for network speeds, not 1024
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];

  const i = Math.floor(Math.log(bps) / Math.log(k));

  return parseFloat((bps / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Status utilities
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'up':
    case 'online':
    case 'active':
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'down':
    case 'offline':
    case 'inactive':
    case 'unhealthy':
      return 'text-red-600 bg-red-100';
    case 'warning':
    case 'degraded':
      return 'text-yellow-600 bg-yellow-100';
    case 'unknown':
    case 'pending':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getUptimePercentageColor(percentage: number): string {
  if (percentage >= 99.9) return 'text-green-600';
  if (percentage >= 99.0) return 'text-yellow-600';
  if (percentage >= 95.0) return 'text-orange-600';
  return 'text-red-600';
}

// Chart data utilities
export function prepareChartData(
  data: any[],
  xField: string,
  yField: string,
  timeRange?: { start: string; end: string }
): ChartDataPoint[] {
  let filteredData = data;

  if (timeRange) {
    const startTime = new Date(timeRange.start).getTime();
    const endTime = new Date(timeRange.end).getTime();
    
    filteredData = data.filter(item => {
      const itemTime = new Date(item[xField]).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
  }

  return filteredData.map(item => ({
    timestamp: item[xField],
    value: item[yField] || 0,
    label: formatDateTime(item[xField])
  }));
}

export function prepareInterfaceChartData(
  interfaceData: InterfaceStatus[],
  timeRange?: { start: string; end: string }
): Record<string, InterfaceChartData> {
  const groupedData: Record<string, InterfaceStatus[]> = {};

  // Group by interface name
  interfaceData.forEach(item => {
    const key = item.interface_name;
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(item);
  });

  // Convert to chart data format
  const chartData: Record<string, InterfaceChartData> = {};

  Object.entries(groupedData).forEach(([interfaceName, data]) => {
    chartData[interfaceName] = {
      interface_name: interfaceName,
      data_in: prepareChartData(data, 'timestamp', 'in_octets', timeRange),
      data_out: prepareChartData(data, 'timestamp', 'out_octets', timeRange),
      utilization_in: prepareChartData(data, 'timestamp', 'utilization_in', timeRange),
      utilization_out: prepareChartData(data, 'timestamp', 'utilization_out', timeRange),
      errors: data.map(item => ({
        timestamp: item.timestamp,
        value: (item.in_errors || 0) + (item.out_errors || 0),
        label: formatDateTime(item.timestamp)
      }))
    };
  });

  return chartData;
}

// Validation utilities
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)?$/;
  return domainRegex.test(domain);
}

export function isValidPort(port: number): boolean {
  return port >= 1 && port <= 65535;
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Local storage utilities
export function getFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

export function setToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}