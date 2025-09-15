// Device Types
export enum DeviceType {
  ROUTER = 'router',
  SWITCH = 'switch',
  FIREWALL = 'firewall',
  SERVER = 'server',
  ACCESS_POINT = 'access_point',
  OTHER = 'other'
}

export enum SNMPVersion {
  V2C = 'v2c',
  V3 = 'v3'
}

export enum SNMPAuthProtocol {
  MD5 = 'MD5',
  SHA = 'SHA',
  SHA224 = 'SHA224',
  SHA256 = 'SHA256',
  SHA384 = 'SHA384',
  SHA512 = 'SHA512'
}

export enum SNMPPrivProtocol {
  DES = 'DES',
  AES = 'AES',
  AES192 = 'AES192',
  AES256 = 'AES256'
}

export interface DeviceBase {
  name: string;
  ip_address: string;
  device_type: DeviceType;
  location?: string;
  description?: string;
  snmp_version: SNMPVersion;
  snmp_port: number;
  snmp_timeout: number;
  snmp_retries: number;
  // SNMP v2c
  community_string?: string;
  // SNMP v3
  security_name?: string;
  auth_protocol?: SNMPAuthProtocol;
  auth_password?: string;
  priv_protocol?: SNMPPrivProtocol;
  priv_password?: string;
  context_name?: string;
  is_active: boolean;
}

export interface DeviceCreate extends DeviceBase {}

export interface DeviceUpdate extends Partial<DeviceBase> {}

export interface Device extends DeviceBase {
  id: string;
  created_at: string;
  updated_at: string;
  last_seen?: string;
  last_report_time?: string;
  last_successful_poll?: string;
}

export interface DeviceHealth {
  device_id: string;
  timestamp: string;
  is_reachable: boolean;
  response_time?: number;
  system_description?: string;
  system_uptime?: number;
  cpu_usage_1min?: number;
  cpu_usage_5min?: number;
  cpu_usage_15min?: number;
  memory_total?: number;
  memory_used?: number;
  memory_utilization?: number;
  disk_total?: number;
  disk_used?: number;
  disk_utilization?: number;
  error_message?: string;
}

export interface InterfaceStatus {
  device_id: string;
  timestamp: string;
  interface_index: number;
  interface_name: string;
  interface_description?: string;
  admin_status: string;
  oper_status: string;
  speed?: number;
  mtu?: number;
  in_octets?: number;
  out_octets?: number;
  in_errors?: number;
  out_errors?: number;
  in_discards?: number;
  out_discards?: number;
  utilization_in?: number;
  utilization_out?: number;
}

// SSL Certificate Types
export interface SSLCheckBase {
  domain: string;
  port: number;
  check_interval: number;
  alert_days_before_expiry: number;
  is_active: boolean;
}

export interface SSLCheckCreate extends SSLCheckBase {}

export interface SSLCertificateInfo {
  subject: Record<string, any>;
  issuer: Record<string, any>;
  version: number;
  serial_number: string;
  not_before: string;
  not_after: string;
  signature_algorithm: string;
  public_key_algorithm: string;
  public_key_size?: number;
  common_name?: string;
  subject_alt_names: string[];
  is_self_signed: boolean;
  is_ca: boolean;
  key_usage: string[];
  extended_key_usage: string[];
}

export interface SSLCheckResponse extends SSLCheckBase {
  id: string;
  created_at: string;
  updated_at: string;
  last_checked?: string;
  is_valid?: boolean;
  expires_at?: string;
  days_until_expiry?: number;
  certificate_info?: SSLCertificateInfo;
  error_message?: string;
}

// Uptime Check Types
export enum CheckType {
  PING = 'ping',
  HTTP = 'http',
  HTTPS = 'https',
  TCP = 'tcp'
}

export interface UptimeCheckBase {
  name: string;
  target: string;
  check_type: CheckType;
  check_interval: number;
  timeout: number;
  is_active: boolean;
  // HTTP/HTTPS specific
  expected_status_code?: number;
  expected_content?: string;
  follow_redirects?: boolean;
  // TCP specific
  port?: number;
}

export interface UptimeCheckCreate extends UptimeCheckBase {}

export interface PingResult {
  packets_sent: number;
  packets_received: number;
  packet_loss_percent: number;
  min_time?: number;
  max_time?: number;
  avg_time?: number;
}

export interface HTTPResult {
  status_code: number;
  response_time: number;
  response_size?: number;
  redirect_count?: number;
  final_url?: string;
  content_match?: boolean;
}

export interface PortResult {
  is_open: boolean;
  response_time: number;
}

export interface TracerouteHop {
  hop_number: number;
  ip_address?: string;
  hostname?: string;
  rtt1?: number;
  rtt2?: number;
  rtt3?: number;
  timeout: boolean;
  is_timeout?: boolean; // Keep for backward compatibility
}

export interface TracerouteResult {
  target: string;
  hops: TracerouteHop[];
  total_hops: number;
  success: boolean;
}

export interface UptimeCheckResponse extends UptimeCheckBase {
  id: string;
  created_at: string;
  updated_at: string;
  last_checked?: string;
  is_up?: boolean;
  response_time?: number;
  status_code?: number;
  error_message?: string;
  ping_result?: PingResult;
  http_result?: HTTPResult;
  port_result?: PortResult;
}

export interface UptimeStats {
  target: string;
  check_type: CheckType;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  uptime_percentage: number;
  avg_response_time?: number;
  min_response_time?: number;
  max_response_time?: number;
  last_check_time?: string;
  last_downtime?: string;
  current_status: string;
}

// Dashboard Types
export interface DashboardStats {
  total_devices: number;
  active_devices: number;
  devices_down: number;
  total_ssl_checks: number;
  ssl_expiring_soon: number;
  ssl_expired: number;
  total_uptime_checks: number;
  uptime_checks_down: number;
  avg_uptime_percentage: number;
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface InterfaceChartData {
  interface_name: string;
  data_in: ChartDataPoint[];
  data_out: ChartDataPoint[];
  utilization_in: ChartDataPoint[];
  utilization_out: ChartDataPoint[];
  errors: ChartDataPoint[];
}

// API Response Types
export interface ApiError {
  detail: string;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Filter and Query Types
export interface DeviceFilters {
  device_type?: DeviceType;
  is_active?: boolean;
  location?: string;
  search?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface MonitoringFilters {
  device_id?: string;
  time_range?: TimeRange;
  limit?: number;
  offset?: number;
}

// Network Diagnostic Types
export interface PingRequest {
  target: string;
  count?: number;
  timeout?: number;
}

export interface TracerouteRequest {
  target: string;
  max_hops?: number;
  timeout?: number;
}

export interface DNSLookupRequest {
  domain: string;
  record_type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'ALL';
  nameserver?: string;
}

export interface DNSRecord {
  name: string;
  type: string;
  value: string;
  ttl?: number;
  priority?: number; // For MX records
}

export interface DNSLookupResponse {
  domain: string;
  record_type: string;
  records: DNSRecord[];
  nameserver_used?: string;
  query_time: number;
  timestamp: string;
  total_records: number;
  record_types_found: string[];
  error?: string;
}

// GCP Integration Types
export enum GCPServiceType {
  // Compute Services
  COMPUTE_ENGINE = 'compute_engine',
  APP_ENGINE = 'app_engine',
  KUBERNETES_ENGINE = 'kubernetes_engine',
  CLOUD_FUNCTIONS = 'cloud_functions',
  CLOUD_RUN = 'cloud_run',
  
  // Storage Services
  CLOUD_STORAGE = 'cloud_storage',
  FILE_STORE = 'file_store',
  
  // Database Services
  CLOUD_SQL = 'cloud_sql',
  FIREBASE_DATABASE = 'firebase_database',
  
  // Networking Services
  CLOUD_LOAD_BALANCER = 'cloud_load_balancer',
  NETWORK_INTERFACE = 'network_interface',
  CLOUD_INTERCONNECT = 'cloud_interconnect',
  CLOUD_DNS = 'cloud_dns',
  VPN_TUNNEL = 'vpn_tunnel',
  CLOUD_ROUTERS = 'cloud_routers',
  
  // Data Services
  CLOUD_DATAFLOW = 'cloud_dataflow',
  REDIS = 'redis',
  
  // Security Services
  CERTIFICATE_SERVICE = 'certificate_service',
  CLOUD_KMS = 'cloud_kms',
  
  // Messaging Services
  PUBSUB_TOPIC = 'pubsub_topic',
  
  // Monitoring Services
  SPANNER = 'spanner'
}

export enum GCPMetricType {
  CPU_UTILIZATION = 'cpu_utilization',
  MEMORY_UTILIZATION = 'memory_utilization',
  DISK_IO = 'disk_io',
  NETWORK_IO = 'network_io',
  REQUEST_COUNT = 'request_count',
  ERROR_RATE = 'error_rate'
}

export interface GCPCredentialsCreate {
  name: string;
  project_id: string;
  service_account_key: Record<string, any>;
  description?: string;
}

export interface GCPCredentialsResponse {
  id: string;
  name: string;
  project_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_used?: string;
  has_service_account_key: boolean;
}

export interface GCPResource {
  id: string;
  credentials_id: string;
  resource_id: string;
  resource_name: string;
  name?: string; // Alternative name field from database
  service_type: GCPServiceType;
  zone?: string;
  region?: string;
  labels?: Record<string, string>;
  metadata: Record<string, any>;
  monitoring_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_synced?: string;
  is_active: boolean;
}

export interface GCPMetric {
  id: string;
  resource_id: string;
  metric_type: GCPMetricType;
  metric_name: string;
  value: number;
  unit?: string;
  labels?: Record<string, string>;
  timestamp: string;
  collected_at: string;
}

export interface GCPResourceCount {
  service_type: GCPServiceType;
  count: number;
}

export interface GCPResourceCountsResponse {
  resource_counts: GCPResourceCount[];
  total_resources: number;
  last_updated: string;
}

// Google Analytics Types
export enum GAMetricType {
  ACTIVE_USERS = 'active_users',
  SESSIONS = 'sessions',
  PAGE_VIEWS = 'page_views',
  BOUNCE_RATE = 'bounce_rate',
  SESSION_DURATION = 'session_duration',
  CONVERSIONS = 'conversions',
  REVENUE = 'revenue'
}

export interface GACredentialsCreate {
  property_id: string;
  service_account_json: string;
}

export interface GACredentialsResponse {
  id: string;
  property_id: string;
  service_account_email: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface GAMetric {
  id: string;
  property_id: string;
  metric_type: GAMetricType;
  metric_name: string;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  dimensions?: Record<string, any>;
  date_range_start: string;
  date_range_end: string;
  collected_at: string;
}

export interface GADashboardData {
  property_id: string;
  active_users?: number;
  sessions?: number;
  page_views?: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  top_pages?: Array<{
    page_path: string;
    page_views: number;
    users: number;
  }>;
  traffic_sources?: Array<{
    source: string;
    sessions: number;
    users: number;
  }>;
  device_categories?: Array<{
    category: string;
    users: number;
  }>;
  geographic_data?: Array<{
    country: string;
    users: number;
  }>;
  date_range_start: string;
  date_range_end: string;
  last_updated: string;
}

// Uptime Monitoring Types (Enhanced)
export enum MonitorStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown'
}

export interface UptimeMonitorConfig {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: string;
  expected_status_code: number;
  expected_content?: string;
  check_interval: number;
  timeout: number;
  max_redirects: number;
  verify_ssl: boolean;
  headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UptimeCheckResult {
  id: string;
  monitor_id: string;
  status: MonitorStatus;
  response_time: number;
  status_code?: number;
  error_message?: string;
  ssl_info?: {
    valid: boolean;
    expires_at?: string;
    issuer?: string;
    subject?: string;
  };
  checked_at: string;
}

export interface UptimeAlert {
  id: string;
  monitor_id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
  resolved_at?: string;
  is_resolved: boolean;
}