import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Device,
  DeviceHealth,
  InterfaceStatus,
  SSLCheckResponse,
  UptimeCheckResponse,
  DashboardStats,
  DeviceFilters,
  MonitoringFilters
} from '@/types';

// Device Store
interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  deviceHealth: Record<string, DeviceHealth[]>;
  interfaceStatus: Record<string, InterfaceStatus[]>;
  loading: boolean;
  error: string | null;
  filters: DeviceFilters;
  
  // Actions
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  setSelectedDevice: (device: Device | null) => void;
  setDeviceHealth: (deviceId: string, health: DeviceHealth[]) => void;
  setInterfaceStatus: (deviceId: string, interfaces: InterfaceStatus[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: DeviceFilters) => void;
  clearDeviceData: () => void;
}

export const useDeviceStore = create<DeviceState>()(devtools(
  (set, get) => ({
    devices: [],
    selectedDevice: null,
    deviceHealth: {},
    interfaceStatus: {},
    loading: false,
    error: null,
    filters: {},
    
    setDevices: (devices) => set({ devices }),
    
    addDevice: (device) => set((state) => ({
      devices: [...state.devices, device]
    })),
    
    updateDevice: (id, updatedDevice) => set((state) => ({
      devices: state.devices.map(device => 
        device.id === id ? { ...device, ...updatedDevice } : device
      )
    })),
    
    removeDevice: (id) => set((state) => ({
      devices: state.devices.filter(device => device.id !== id),
      selectedDevice: state.selectedDevice?.id === id ? null : state.selectedDevice
    })),
    
    setSelectedDevice: (device) => set({ selectedDevice: device }),
    
    setDeviceHealth: (deviceId, health) => set((state) => ({
      deviceHealth: {
        ...state.deviceHealth,
        [deviceId]: health
      }
    })),
    
    setInterfaceStatus: (deviceId, interfaces) => set((state) => ({
      interfaceStatus: {
        ...state.interfaceStatus,
        [deviceId]: interfaces
      }
    })),
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setFilters: (filters) => set({ filters }),
    
    clearDeviceData: () => set({
      devices: [],
      selectedDevice: null,
      deviceHealth: {},
      interfaceStatus: {},
      error: null
    })
  }),
  { name: 'device-store' }
));

// SSL Store
interface SSLState {
  sslChecks: SSLCheckResponse[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setSSLChecks: (checks: SSLCheckResponse[]) => void;
  addSSLCheck: (check: SSLCheckResponse) => void;
  updateSSLCheck: (id: string, check: Partial<SSLCheckResponse>) => void;
  removeSSLCheck: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSSLData: () => void;
}

export const useSSLStore = create<SSLState>()(devtools(
  (set) => ({
    sslChecks: [],
    loading: false,
    error: null,
    
    setSSLChecks: (sslChecks) => set({ sslChecks }),
    
    addSSLCheck: (check) => set((state) => ({
      sslChecks: [...state.sslChecks, check]
    })),
    
    updateSSLCheck: (id, updatedCheck) => set((state) => ({
      sslChecks: state.sslChecks.map(check => 
        check.id === id ? { ...check, ...updatedCheck } : check
      )
    })),
    
    removeSSLCheck: (id) => set((state) => ({
      sslChecks: state.sslChecks.filter(check => check.id !== id)
    })),
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    clearSSLData: () => set({
      sslChecks: [],
      error: null
    })
  }),
  { name: 'ssl-store' }
));

// Uptime Store
interface UptimeState {
  uptimeChecks: UptimeCheckResponse[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setUptimeChecks: (checks: UptimeCheckResponse[]) => void;
  addUptimeCheck: (check: UptimeCheckResponse) => void;
  updateUptimeCheck: (id: string, check: Partial<UptimeCheckResponse>) => void;
  removeUptimeCheck: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUptimeData: () => void;
}

export const useUptimeStore = create<UptimeState>()(devtools(
  (set) => ({
    uptimeChecks: [],
    loading: false,
    error: null,
    
    setUptimeChecks: (uptimeChecks) => set({ uptimeChecks }),
    
    addUptimeCheck: (check) => set((state) => ({
      uptimeChecks: [...state.uptimeChecks, check]
    })),
    
    updateUptimeCheck: (id, updatedCheck) => set((state) => ({
      uptimeChecks: state.uptimeChecks.map(check => 
        check.id === id ? { ...check, ...updatedCheck } : check
      )
    })),
    
    removeUptimeCheck: (id) => set((state) => ({
      uptimeChecks: state.uptimeChecks.filter(check => check.id !== id)
    })),
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    
    clearUptimeData: () => set({
      uptimeChecks: [],
      error: null
    })
  }),
  { name: 'uptime-store' }
));

// Dashboard Store
interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (timestamp: string) => void;
  clearDashboardData: () => void;
}

export const useDashboardStore = create<DashboardState>()(devtools(
  (set) => ({
    stats: null,
    loading: false,
    error: null,
    lastUpdated: null,
    
    setStats: (stats) => set({ 
      stats, 
      lastUpdated: new Date().toISOString() 
    }),
    
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setLastUpdated: (lastUpdated) => set({ lastUpdated }),
    
    clearDashboardData: () => set({
      stats: null,
      error: null,
      lastUpdated: null
    })
  }),
  { name: 'dashboard-store' }
));

// Global App Store
interface AppState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
  }>;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(devtools(
  (set) => ({
    sidebarOpen: true,
    theme: 'light',
    notifications: [],
    
    toggleSidebar: () => set((state) => ({ 
      sidebarOpen: !state.sidebarOpen 
    })),
    
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    
    setTheme: (theme) => set({ theme }),
    
    addNotification: (notification) => set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString()
        }
      ]
    })),
    
    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),
    
    clearNotifications: () => set({ notifications: [] })
  }),
  { name: 'app-store' }
));