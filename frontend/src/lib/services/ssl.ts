const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export interface SSLCheckResponse {
  id: string;
  domain: string;
  port: number;
  timestamp: string;
  is_valid: boolean;
  expires_at?: string;
  days_until_expiry?: number;
  issuer?: string;
  subject?: string;
  serial_number?: string;
  signature_algorithm?: string;
  error_message?: string;
}

export interface SSLCheckCreate {
  domain: string;
  port?: number;
}

class SSLService {
  private baseUrl = `${API_BASE_URL}/api/v1/ssl`;

  async getSSLChecks(params?: {
    skip?: number;
    limit?: number;
    domain?: string;
    days?: number;
  }): Promise<SSLCheckResponse[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.domain) searchParams.append('domain', params.domain);
    if (params?.days) searchParams.append('days', params.days.toString());

    const response = await fetch(`${this.baseUrl}?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SSL checks: ${response.statusText}`);
    }
    return response.json();
  }

  async getSSLChecksForDomain(domain: string, days?: number): Promise<SSLCheckResponse[]> {
    const searchParams = new URLSearchParams();
    if (days) searchParams.append('days', days.toString());

    const response = await fetch(`${this.baseUrl}/${domain}?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SSL checks for domain: ${response.statusText}`);
    }
    return response.json();
  }

  async getLatestSSLCheck(domain: string): Promise<SSLCheckResponse> {
    const response = await fetch(`${this.baseUrl}/${domain}/latest`);
    if (!response.ok) {
      throw new Error(`Failed to fetch latest SSL check: ${response.statusText}`);
    }
    return response.json();
  }

  async getExpiringCertificates(days: number = 30): Promise<SSLCheckResponse[]> {
    const response = await fetch(`${this.baseUrl}/expiring/soon?days=${days}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch expiring certificates: ${response.statusText}`);
    }
    return response.json();
  }

  async createSSLCheck(sslCheck: SSLCheckCreate): Promise<SSLCheckResponse> {
    const response = await fetch(`${this.baseUrl}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sslCheck),
    });
    if (!response.ok) {
      throw new Error(`Failed to create SSL check: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteSSLChecks(domain: string): Promise<{ deleted_count: number }> {
    const response = await fetch(`${this.baseUrl}/${domain}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete SSL checks: ${response.statusText}`);
    }
    return response.json();
  }
}

export const sslService = new SSLService();
export default sslService;