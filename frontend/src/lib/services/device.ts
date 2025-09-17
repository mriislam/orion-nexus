import { apiClient } from '@/lib/api-client';

export type DeviceType = 'router' | 'switch' | 'firewall' | 'server' | 'access_point' | 'other';

export interface Device {
  id: string;
  name: string;
  ip_address: string;
  device_type: DeviceType;
  location?: string;
  description?: string;
  is_active: boolean;
  snmp_version?: string;
  snmp_port?: number;
  snmp_timeout?: number;
  snmp_retries?: number;
  created_at: string;
  updated_at: string;
  last_report_time?: string;
  last_seen?: string;
  last_successful_poll?: string;
}

export interface DeviceHealth {
  device_id: string;
  status: 'online' | 'offline' | 'warning';
  response_time?: number;
  cpu_usage?: number;
  memory_usage?: number;
  uptime?: number;
  timestamp: string;
  memory_total?: number;
  memory_used?: number;
  disk_total?: number;
  disk_used?: number;
  disk_status?: string;
  disk_error?: string;
  system_uptime?: number;
  is_reachable?: boolean;
  system_description?: string;
}

export interface CreateDeviceRequest {
  name: string;
  ip_address: string;
  device_type: DeviceType;
  location?: string | null;
  description?: string | null;
  snmp_version: 'v2c' | 'v3';
  snmp_port?: number;
  snmp_community?: string | null;
  snmp_username?: string | null;
  snmp_auth_protocol?: string | null;
  snmp_auth_password?: string | null;
  snmp_priv_protocol?: string | null;
  snmp_priv_password?: string | null;
  enabled?: boolean;
  poll_interval?: number;
}

export interface UpdateDeviceRequest {
  name?: string;
  device_type?: DeviceType;
  location?: string;
  description?: string;
  snmp_version?: 'v2c' | 'v3';
  snmp_port?: number;
  snmp_community?: string;
  snmp_username?: string;
  snmp_auth_protocol?: string;
  snmp_auth_password?: string;
  snmp_priv_protocol?: string;
  snmp_priv_password?: string;
  enabled?: boolean;
  poll_interval?: number;
}

export const deviceService = {
  async getDevices(): Promise<Device[]> {
    const response = await apiClient.get('/api/v1/devices');
    return response.data;
  },

  async getDevice(deviceId: string): Promise<Device> {
    const response = await apiClient.get(`/api/v1/devices/${deviceId}`);
    return response.data;
  },

  async createDevice(deviceData: CreateDeviceRequest): Promise<Device> {
    const response = await apiClient.post('/api/v1/devices', deviceData);
    return response.data;
  },

  async updateDevice(deviceId: string, deviceData: UpdateDeviceRequest): Promise<Device> {
    const response = await apiClient.put(`/api/v1/devices/${deviceId}`, deviceData);
    return response.data;
  },

  async deleteDevice(deviceId: string): Promise<void> {
    await apiClient.delete(`/api/v1/devices/${deviceId}`);
  },

  async getDeviceHealth(deviceId: string): Promise<DeviceHealth | null> {
    try {
      const response = await apiClient.get(`/api/v1/devices/${deviceId}/health`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get health for device ${deviceId}:`, error);
      return null;
    }
  },

  async getDevicesWithHealth(): Promise<Array<Device & { health?: DeviceHealth | null }>> {
    const devices = await this.getDevices();
    
    // Get health data for each device
    const devicesWithHealth = await Promise.all(
      devices.map(async (device) => {
        const health = await this.getDeviceHealth(device.id);
        return {
          ...device,
          health
        };
      })
    );
    
    return devicesWithHealth;
  }
};