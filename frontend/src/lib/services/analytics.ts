import { apiClient } from '@/lib/api-client';
import {
  GACredentialsCreate,
  GACredentialsResponse,
  GAMetric,
  GADashboardData
} from '@/types';

export const analyticsService = {
  // Credentials operations
  async createCredentials(credentials: GACredentialsCreate): Promise<GACredentialsResponse> {
    const response = await apiClient.post<GACredentialsResponse>('/api/v1/analytics/credentials', credentials, { encrypt: false });
    return response.data;
  },

  async getCredentials(): Promise<GACredentialsResponse[]> {
    const response = await apiClient.get<GACredentialsResponse[]>('/api/v1/analytics/credentials', { encrypt: false });
    return response.data;
  },

  async getCredentialsById(id: string): Promise<GACredentialsResponse> {
    const response = await apiClient.get<GACredentialsResponse>(`/api/v1/analytics/credentials/${id}`, { encrypt: false });
    return response.data;
  },

  async updateCredentials(id: string, credentials: Partial<GACredentialsCreate>): Promise<GACredentialsResponse> {
    const response = await apiClient.put<GACredentialsResponse>(`/api/v1/analytics/credentials/${id}`, credentials, { encrypt: false });
    return response.data;
  },

  async deleteCredentials(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/analytics/credentials/${id}`, { encrypt: false });
  },

  // Metrics operations
  async getMetrics(params?: { 
    property_id?: string; 
    metric_type?: string; 
    start_date?: string; 
    end_date?: string;
    dimensions?: string[];
  }): Promise<GAMetric[]> {
    const queryParams = new URLSearchParams();
    if (params?.property_id) queryParams.append('property_id', params.property_id);
    if (params?.metric_type) queryParams.append('metric_type', params.metric_type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.dimensions) {
      params.dimensions.forEach(dim => queryParams.append('dimensions', dim));
    }
    
    const url = `/api/v1/analytics/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<GAMetric[]>(url, { encrypt: false });
    return response.data;
  },

  async triggerMetricCollection(propertyId: string): Promise<void> {
    await apiClient.post(`/api/v1/analytics/collect-metrics`, {}, { encrypt: false });
  },

  // Reports operations
  async getOverviewReport(propertyId: string, startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/analytics/reports/overview/${propertyId}?start_date=${startDate}&end_date=${endDate}`, { encrypt: false });
    return response.data;
  },

  async getTrafficSourcesReport(propertyId: string, startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/analytics/reports/traffic-sources/${propertyId}?start_date=${startDate}&end_date=${endDate}`, { encrypt: false });
    return response.data;
  },

  async getTopPagesReport(propertyId: string, startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/analytics/reports/top-pages/${propertyId}?start_date=${startDate}&end_date=${endDate}`, { encrypt: false });
    return response.data;
  },

  async getDemographicsReport(propertyId: string, startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/analytics/reports/demographics/${propertyId}?start_date=${startDate}&end_date=${endDate}`, { encrypt: false });
    return response.data;
  },

  // Dashboard data
  async getDashboardData(propertyId: string): Promise<GADashboardData> {
    const response = await apiClient.get<GADashboardData>(`/api/v1/analytics/dashboard/${propertyId}`, { encrypt: false });
    return response.data;
  },

  // Enhanced analytics endpoints
  async getConversions(params: {
    property_id: string;
    start_date?: string;
    end_date?: string;
    conversion_type?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('property_id', params.property_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.conversion_type) queryParams.append('conversion_type', params.conversion_type);
    
    const response = await apiClient.get(`/api/v1/analytics/conversions?${queryParams}`, { encrypt: false });
    return response.data;
  },

  async getEcommerce(params: {
    property_id: string;
    start_date?: string;
    end_date?: string;
    metric_type?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('property_id', params.property_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.metric_type) queryParams.append('metric_type', params.metric_type);
    
    const response = await apiClient.get(`/api/v1/analytics/ecommerce?${queryParams}`, { encrypt: false });
    return response.data;
  },

  async getCustomEvents(params: {
    property_id: string;
    start_date?: string;
    end_date?: string;
    event_name?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('property_id', params.property_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.event_name) queryParams.append('event_name', params.event_name);
    
    const response = await apiClient.get(`/api/v1/analytics/custom-events?${queryParams}`, { encrypt: false });
    return response.data;
  }
};