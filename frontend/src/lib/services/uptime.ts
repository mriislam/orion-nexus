// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface UptimeMonitor {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE';
  expected_status_code: number;
  expected_content?: string;
  check_interval: number;
  timeout: number;
  max_retries: number;
  headers: Record<string, string>;
  body?: string;
  follow_redirects: boolean;
  verify_ssl: boolean;
  alert_on_failure: boolean;
  alert_threshold: number;
  locations: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  current_status?: 'up' | 'down' | 'degraded' | 'maintenance';
  uptime_percentage?: number;
  avg_response_time?: number;
  last_check_at?: string;
}

export interface UptimeCheckResult {
  id: string;
  monitor_id: string;
  location: string;
  status: 'up' | 'down' | 'degraded' | 'maintenance';
  response_time?: number;
  status_code?: number;
  content_match?: boolean;
  error_message?: string;
  response_headers: Record<string, string>;
  response_size?: number;
  ssl_expiry?: string;
  dns_resolution_time?: number;
  tcp_connection_time?: number;
  tls_handshake_time?: number;
  redirect_count?: number;
  checked_at: string;
  retry_count: number;
}

export interface UptimeStats {
  monitor_id: string;
  period_start: string;
  period_end: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  current_status: string;
  last_check_at?: string;
  consecutive_failures: number;
}

export interface CreateUptimeMonitorRequest {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE';
  expected_status_code?: number;
  expected_content?: string;
  check_interval?: number;
  timeout?: number;
  max_retries?: number;
  headers?: Record<string, string>;
  body?: string;
  follow_redirects?: boolean;
  verify_ssl?: boolean;
  alert_on_failure?: boolean;
  alert_threshold?: number;
  locations?: string[];
  tags?: string[];
}

class UptimeService {
  private baseUrl = `${API_BASE_URL}/api/v1`;

  async getMonitors(params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
    tags?: string[];
  }): Promise<UptimeMonitor[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.active_only !== undefined) searchParams.append('active_only', params.active_only.toString());
    if (params?.tags) {
      params.tags.forEach(tag => searchParams.append('tags', tag));
    }

    const url = `${this.baseUrl}/monitors${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monitors: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getMonitor(id: string): Promise<UptimeMonitor> {
    const response = await fetch(`${this.baseUrl}/monitors/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monitor: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createMonitor(data: CreateUptimeMonitorRequest): Promise<UptimeMonitor> {
    const response = await fetch(`${this.baseUrl}/monitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create monitor: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateMonitor(id: string, data: Partial<CreateUptimeMonitorRequest>): Promise<UptimeMonitor> {
    const response = await fetch(`${this.baseUrl}/monitors/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update monitor: ${response.statusText}`);
    }
    
    return response.json();
  }

  async deleteMonitor(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/monitors/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete monitor: ${response.statusText}`);
    }
  }

  async getMonitorResults(id: string, params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
    location?: string;
  }): Promise<UptimeCheckResult[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.location) searchParams.append('location', params.location);

    const url = `${this.baseUrl}/monitors/${id}/results${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monitor results: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getMonitorStats(id: string, periodDays: number = 30): Promise<UptimeStats> {
    const response = await fetch(`${this.baseUrl}/monitors/${id}/stats?period_days=${periodDays}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monitor stats: ${response.statusText}`);
    }
    
    return response.json();
  }

  async testMonitor(id: string): Promise<{ message: string; result: any }> {
    const response = await fetch(`${this.baseUrl}/monitors/${id}/test`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to test monitor: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getMonitorsWithStats(): Promise<Array<UptimeMonitor & { stats?: UptimeStats }>> {
    const monitors = await this.getMonitors();
    
    const monitorsWithStats = await Promise.all(
      monitors.map(async (monitor) => {
        try {
          const stats = await this.getMonitorStats(monitor.id);
          return { ...monitor, stats };
        } catch (error) {
          console.warn(`Failed to fetch stats for monitor ${monitor.id}:`, error);
          return { ...monitor, stats: undefined };
        }
      })
    );
    
    return monitorsWithStats;
  }
}

export const uptimeService = new UptimeService();
export default uptimeService;