import { apiClient } from '@/lib/api-client';
import { DashboardStats } from '@/types';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  source: string;
}

export const dashboardService = {
  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/api/v1/devices/dashboard/stats', { encrypt: false });
    return response.data;
  },

  // Get recent alerts
  async getRecentAlerts(limit: number = 10): Promise<Alert[]> {
    const response = await apiClient.get<Alert[]>(`/api/v1/devices/alerts/recent?limit=${limit}`, { encrypt: false });
    return response.data;
  }
};