import { apiClient } from '@/lib/api-client';
import {
  PingRequest,
  TracerouteRequest,
  DNSLookupRequest,
  PingResult,
  TracerouteResult,
  DNSLookupResponse
} from '@/types';

export const networkDiagnosticsService = {
  // Ping operations
  async ping(request: PingRequest): Promise<PingResult> {
    const response = await apiClient.post<PingResult>('/api/v1/network-diagnostics/ping', request, { encrypt: false });
    return response.data;
  },

  // Traceroute operations
  async traceroute(request: TracerouteRequest): Promise<TracerouteResult> {
    const response = await apiClient.post<TracerouteResult>('/api/v1/network-diagnostics/traceroute', request, { encrypt: false });
    return response.data;
  },

  // DNS Lookup operations
  async dnsLookup(request: DNSLookupRequest): Promise<DNSLookupResponse> {
    const response = await apiClient.post<DNSLookupResponse>('/api/v1/network-diagnostics/dns-lookup', request, { encrypt: false });
    return response.data;
  }
};