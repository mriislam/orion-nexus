import { apiClient } from '@/lib/api-client';
import {
  GCPCredentialsCreate,
  GCPCredentialsResponse,
  GCPResource,
  GCPMetric,
  GCPResourceCountsResponse
} from '@/types';

export const gcpService = {
  // Credentials operations
  async createCredentials(credentials: GCPCredentialsCreate): Promise<GCPCredentialsResponse> {
    const response = await apiClient.post<GCPCredentialsResponse>('/api/v1/gcp/credentials', credentials);
    return response.data;
  },

  async getCredentials(): Promise<GCPCredentialsResponse[]> {
    const response = await apiClient.get<GCPCredentialsResponse[]>('/api/v1/gcp/credentials');
    return response.data;
  },

  async getCredentialsById(id: string): Promise<GCPCredentialsResponse> {
    const response = await apiClient.get<GCPCredentialsResponse>(`/api/v1/gcp/credentials/${id}`);
    return response.data;
  },

  async updateCredentials(id: string, credentials: Partial<GCPCredentialsCreate>): Promise<GCPCredentialsResponse> {
    const response = await apiClient.put<GCPCredentialsResponse>(`/api/v1/gcp/credentials/${id}`, credentials);
    return response.data;
  },

  async deleteCredentials(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/gcp/credentials/${id}`);
  },

  // Resources operations
  async getResources(): Promise<GCPResource[]> {
    const response = await apiClient.get<GCPResource[]>('/api/v1/gcp/resources');
    return response.data;
  },

  async getStorageResourcesWithSize(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/storage-with-size?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/storage-with-size';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  // Service-specific resource operations
  async getComputeEngineResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/compute-engine?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/compute-engine';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getCloudSqlResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-sql?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-sql';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getCloudFunctionsResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-functions?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-functions';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getCloudRunResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-run?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-run';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getKubernetesEngineResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/kubernetes-engine?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/kubernetes-engine';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getPubSubResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/pubsub-topic?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/pubsub-topic';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getCloudDnsResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-dns?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-dns';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getLoadBalancingResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/load-balancing?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/load-balancing';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async getCloudRoutersResources(credentialsId?: string): Promise<GCPResource[]> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-routers?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-routers';
    const response = await apiClient.get<GCPResource[]>(url);
    return response.data;
  },

  async createResource(resource: { credentials_id: string; resource_type: string; resource_id: string }): Promise<GCPResource> {
    const response = await apiClient.post<GCPResource>('/api/v1/gcp/resources', resource);
    return response.data;
  },

  // Metrics operations
  async getMetrics(params?: { resource_id?: string; metric_type?: string; start_time?: string; end_time?: string }): Promise<GCPMetric[]> {
    const queryParams = new URLSearchParams();
    if (params?.resource_id) queryParams.append('resource_id', params.resource_id);
    if (params?.metric_type) queryParams.append('metric_type', params.metric_type);
    if (params?.start_time) queryParams.append('start_time', params.start_time);
    if (params?.end_time) queryParams.append('end_time', params.end_time);
    
    const url = `/api/v1/gcp/metrics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<GCPMetric[]>(url);
    return response.data;
  },

  async triggerMetricCollection(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/metrics/collect?credentials_id=${credentialsId}`
      : '/api/v1/gcp/metrics/collect';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async getAvailableRegions(credentialsId?: string): Promise<{ regions: Array<{ name: string; description: string; status: string; zones: Array<{ name: string; status: string }> }> }> {
    // If no credentials ID provided, try to get the first available one
    if (!credentialsId) {
      try {
        const credentials = await this.getCredentials();
        if (credentials.length > 0) {
          credentialsId = credentials[0].id;
        } else {
          return { regions: [] };
        }
      } catch (error) {
        return { regions: [] };
      }
    }
    
    const response = await apiClient.get(`/api/v1/gcp/regions/${credentialsId}`);
    return response.data;
  },

  async triggerResourceDiscovery(
    credentialsId: string, 
    options?: { regions?: string[]; zones?: string[] }
  ): Promise<{ message: string; status: string }> {
    const params = new URLSearchParams();
    if (options?.regions) {
      options.regions.forEach(region => params.append('regions', region));
    }
    if (options?.zones) {
      options.zones.forEach(zone => params.append('zones', zone));
    }
    
    const url = `/api/v1/gcp/credentials/${credentialsId}/discover-resources${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.post<{ message: string; status: string }>(url, {}, { timeout: 60000 });
    return response.data;
  },

  // Service status
  async getServiceStatus(): Promise<{ status: string; message?: string }> {
    const response = await apiClient.get<{ status: string; message?: string }>('/api/v1/gcp/status');
    return response.data;
  },

  // Resource counts operations
  async getResourceCounts(): Promise<GCPResourceCountsResponse> {
    const response = await apiClient.get<GCPResourceCountsResponse>('/api/v1/gcp/resource-counts');
    return response.data;
  },

  // Service-specific refresh operations
  async refreshComputeEngineResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/compute-engine/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/compute-engine/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshCloudSqlResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-sql/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-sql/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshCloudFunctionsResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-functions/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-functions/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshCloudRunResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-run/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-run/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshKubernetesEngineResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/kubernetes-engine/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/kubernetes-engine/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshPubSubResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/pubsub-topic/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/pubsub-topic/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshCloudDnsResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-dns/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-dns/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshLoadBalancingResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/load-balancing/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/load-balancing/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url, {});
    return response.data;
  },

  async refreshCloudRoutersResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/cloud-routers/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/cloud-routers/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url);
    return response.data;
  },

  async refreshStorageResources(credentialsId?: string): Promise<{ message: string; status: string }> {
    const url = credentialsId 
      ? `/api/v1/gcp/resources/storage/refresh?credentials_id=${credentialsId}`
      : '/api/v1/gcp/resources/storage/refresh';
    const response = await apiClient.post<{ message: string; status: string }>(url);
    return response.data;
  },
};