from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum
from .uptime import PyObjectId

class GCPServiceType(str, Enum):
    COMPUTE_ENGINE = "compute_engine"
    CLOUD_SQL = "cloud_sql"
    CLOUD_STORAGE = "cloud_storage"
    CLOUD_LOAD_BALANCER = "cloud_load_balancer"
    KUBERNETES_ENGINE = "kubernetes_engine"
    CLOUD_FUNCTIONS = "cloud_functions"
    APP_ENGINE = "app_engine"
    CLOUD_RUN = "cloud_run"
    CLOUD_DATAFLOW = "cloud_dataflow"
    VPN_TUNNEL = "vpn_tunnel"
    SPANNER = "spanner"
    FIREBASE_DATABASE = "firebase_database"
    NETWORK_INTERFACE = "network_interface"
    REDIS = "redis"
    CLOUD_INTERCONNECT = "cloud_interconnect"
    CERTIFICATE_SERVICE = "certificate_service"
    CLOUD_DNS = "cloud_dns"
    CLOUD_KMS = "cloud_kms"
    FILE_STORE = "file_store"
    PUBSUB_TOPIC = "pubsub_topic"
    CLOUD_ROUTERS = "cloud_routers"
    KUBERNETES_CLUSTER = "kubernetes_cluster"

class GCPMetricType(str, Enum):
    CPU_UTILIZATION = "cpu_utilization"
    MEMORY_UTILIZATION = "memory_utilization"
    DISK_IO_READ = "disk_io_read"
    DISK_IO_WRITE = "disk_io_write"
    NETWORK_IN = "network_in"
    NETWORK_OUT = "network_out"
    REQUEST_COUNT = "request_count"
    ERROR_RATE = "error_rate"
    LATENCY = "latency"
    STORAGE_USAGE = "storage_usage"

class GCPCredentials(BaseModel):
    """GCP Service Account credentials model"""
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., description="Friendly name for this GCP configuration")
    project_id: str = Field(..., description="GCP Project ID")
    service_account_key: Dict[str, Any] = Field(..., description="Service Account JSON key (encrypted)")
    enabled: bool = Field(True, description="Whether this configuration is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None
    
    @validator('project_id')
    def validate_project_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Project ID cannot be empty')
        return v.strip()
    
    @validator('service_account_key')
    def validate_service_account_key(cls, v):
        if v is None:
            raise ValueError('Service account key cannot be None')
        if not isinstance(v, dict):
            raise ValueError('Service account key must be a dictionary')
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in v:
                raise ValueError(f'Service account key missing required field: {field}')
        if v.get('type') != 'service_account':
            raise ValueError('Invalid service account key type')
        return v
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPResource(BaseModel):
    """Base GCP Resource model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="GCP resource ID")
    resource_name: str = Field(..., description="Human-readable resource name")
    service_type: GCPServiceType = Field(..., description="Type of GCP service")
    zone: Optional[str] = Field(None, description="GCP zone")
    region: Optional[str] = Field(None, description="GCP region")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPComputeEngine(BaseModel):
    """GCP Compute Engine VM Instance model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="GCP instance ID")
    resource_name: str = Field(..., description="Instance name")
    zone: str = Field(..., description="GCP zone")
    region: str = Field(..., description="GCP region")
    machine_type: str = Field(..., description="Machine type (e.g., n1-standard-1)")
    status: str = Field(..., description="Instance status (RUNNING, STOPPED, etc.)")
    internal_ip: Optional[str] = Field(None, description="Internal IP address")
    external_ip: Optional[str] = Field(None, description="External IP address")
    network_interfaces: List[Dict[str, Any]] = Field(default_factory=list, description="Network interfaces")
    disks: List[Dict[str, Any]] = Field(default_factory=list, description="Attached disks")
    service_accounts: List[Dict[str, Any]] = Field(default_factory=list, description="Service accounts")
    tags: List[str] = Field(default_factory=list, description="Network tags")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Instance metadata")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPCloudSQL(BaseModel):
    """GCP Cloud SQL Instance model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="Cloud SQL instance ID")
    resource_name: str = Field(..., description="Instance name")
    region: str = Field(..., description="GCP region")
    database_version: str = Field(..., description="Database version (e.g., MYSQL_8_0)")
    tier: str = Field(..., description="Machine tier (e.g., db-n1-standard-1)")
    state: str = Field(..., description="Instance state (RUNNABLE, SUSPENDED, etc.)")
    ip_addresses: List[Dict[str, Any]] = Field(default_factory=list, description="IP addresses")
    connection_name: str = Field(..., description="Connection name for Cloud SQL Proxy")
    backend_type: str = Field(..., description="Backend type (SECOND_GEN, etc.)")
    instance_type: str = Field(..., description="Instance type (CLOUD_SQL_INSTANCE, etc.)")
    storage_size_gb: Optional[int] = Field(None, description="Storage size in GB")
    storage_type: Optional[str] = Field(None, description="Storage type (SSD, HDD)")
    backup_enabled: bool = Field(False, description="Whether backup is enabled")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Instance settings")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPCloudStorage(BaseModel):
    """GCP Cloud Storage Bucket model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="Bucket name")
    resource_name: str = Field(..., description="Bucket name")
    location: str = Field(..., description="Bucket location")
    location_type: str = Field(..., description="Location type (region, multi-region, dual-region)")
    storage_class: str = Field(..., description="Storage class (STANDARD, NEARLINE, etc.)")
    versioning_enabled: bool = Field(False, description="Whether versioning is enabled")
    lifecycle_rules: List[Dict[str, Any]] = Field(default_factory=list, description="Lifecycle rules")
    cors_config: List[Dict[str, Any]] = Field(default_factory=list, description="CORS configuration")
    encryption: Optional[Dict[str, Any]] = Field(None, description="Encryption configuration")
    iam_policy: Optional[Dict[str, Any]] = Field(None, description="IAM policy")
    website_config: Optional[Dict[str, Any]] = Field(None, description="Website configuration")
    logging_config: Optional[Dict[str, Any]] = Field(None, description="Logging configuration")
    retention_policy: Optional[Dict[str, Any]] = Field(None, description="Retention policy")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPLoadBalancer(BaseModel):
    """GCP Load Balancer model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="Load balancer ID")
    resource_name: str = Field(..., description="Load balancer name")
    region: Optional[str] = Field(None, description="GCP region (for regional LBs)")
    load_balancing_scheme: str = Field(..., description="Load balancing scheme (EXTERNAL, INTERNAL, etc.)")
    ip_address: Optional[str] = Field(None, description="IP address")
    ip_protocol: str = Field(..., description="IP protocol (TCP, UDP, etc.)")
    port_range: Optional[str] = Field(None, description="Port range")
    backend_service: Optional[str] = Field(None, description="Backend service")
    url_map: Optional[str] = Field(None, description="URL map")
    target_proxy: Optional[str] = Field(None, description="Target proxy")
    forwarding_rules: List[Dict[str, Any]] = Field(default_factory=list, description="Forwarding rules")
    health_checks: List[Dict[str, Any]] = Field(default_factory=list, description="Health checks")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPKubernetesEngine(BaseModel):
    """GCP Kubernetes Engine Cluster model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="Cluster ID")
    resource_name: str = Field(..., description="Cluster name")
    zone: Optional[str] = Field(None, description="GCP zone (for zonal clusters)")
    region: Optional[str] = Field(None, description="GCP region (for regional clusters)")
    status: str = Field(..., description="Cluster status (RUNNING, STOPPING, etc.)")
    current_master_version: str = Field(..., description="Current master version")
    current_node_version: str = Field(..., description="Current node version")
    initial_node_count: int = Field(..., description="Initial node count")
    current_node_count: int = Field(..., description="Current node count")
    endpoint: str = Field(..., description="Cluster endpoint")
    network: str = Field(..., description="Network")
    subnetwork: Optional[str] = Field(None, description="Subnetwork")
    node_pools: List[Dict[str, Any]] = Field(default_factory=list, description="Node pools")
    addons_config: Dict[str, Any] = Field(default_factory=dict, description="Addons configuration")
    master_auth: Dict[str, Any] = Field(default_factory=dict, description="Master authentication")
    logging_service: Optional[str] = Field(None, description="Logging service")
    monitoring_service: Optional[str] = Field(None, description="Monitoring service")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPCloudFunctions(BaseModel):
    """GCP Cloud Functions model"""
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: PyObjectId = Field(..., description="Reference to GCP credentials")
    resource_id: str = Field(..., description="Function ID")
    resource_name: str = Field(..., description="Function name")
    region: str = Field(..., description="GCP region")
    status: str = Field(..., description="Function status (ACTIVE, OFFLINE, etc.)")
    runtime: str = Field(..., description="Runtime (python39, nodejs16, etc.)")
    entry_point: str = Field(..., description="Entry point function")
    source_archive_url: Optional[str] = Field(None, description="Source archive URL")
    source_repository: Optional[Dict[str, Any]] = Field(None, description="Source repository")
    https_trigger: Optional[Dict[str, Any]] = Field(None, description="HTTPS trigger")
    event_trigger: Optional[Dict[str, Any]] = Field(None, description="Event trigger")
    timeout: Optional[str] = Field(None, description="Function timeout")
    available_memory_mb: Optional[int] = Field(None, description="Available memory in MB")
    max_instances: Optional[int] = Field(None, description="Maximum instances")
    min_instances: Optional[int] = Field(None, description="Minimum instances")
    environment_variables: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    build_environment_variables: Dict[str, str] = Field(default_factory=dict, description="Build environment variables")
    labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPMetric(BaseModel):
    """GCP Metric data model"""
    id: Optional[str] = Field(None, alias="_id")
    resource_id: PyObjectId = Field(..., description="Reference to GCP resource")
    metric_type: GCPMetricType = Field(..., description="Type of metric")
    metric_name: str = Field(..., description="Full GCP metric name")
    value: float = Field(..., description="Metric value")
    unit: str = Field(..., description="Metric unit")
    timestamp: datetime = Field(..., description="Metric timestamp")
    labels: Dict[str, str] = Field(default_factory=dict, description="Metric labels")
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPAlert(BaseModel):
    """GCP Alert model"""
    id: Optional[str] = Field(None, alias="_id")
    resource_id: PyObjectId = Field(..., description="Reference to GCP resource")
    metric_type: GCPMetricType = Field(..., description="Metric that triggered the alert")
    alert_type: str = Field(..., description="Type of alert (threshold, anomaly, etc.)")
    severity: str = Field(..., description="Alert severity (critical, warning, info)")
    message: str = Field(..., description="Alert message")
    threshold_value: Optional[float] = Field(None, description="Threshold value that was exceeded")
    current_value: float = Field(..., description="Current metric value")
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    is_resolved: bool = Field(False, description="Whether the alert is resolved")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional alert metadata")
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

# Request/Response Models for API
class GCPCredentialsCreate(BaseModel):
    """Request model for creating GCP credentials"""
    name: str = Field(..., description="Friendly name for this GCP configuration")
    project_id: str = Field(..., description="GCP Project ID")
    service_account_key: Dict[str, Any] = Field(..., description="Service Account JSON key")
    selected_regions: Optional[List[str]] = Field(None, description="Selected regions for resource discovery")
    
    @validator('project_id')
    def validate_project_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Project ID cannot be empty')
        return v.strip()

class GCPCredentialsUpdate(BaseModel):
    """Request model for updating GCP credentials"""
    name: Optional[str] = None
    project_id: Optional[str] = None
    service_account_key: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class GCPCredentialsResponse(BaseModel):
    """Response model for GCP credentials (without sensitive data)"""
    id: str
    name: str
    project_id: str
    enabled: bool
    created_at: datetime
    updated_at: datetime
    last_used: Optional[datetime]
    has_service_account_key: bool = True
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPResourceCount(BaseModel):
    """GCP Resource count by service type"""
    service_type: GCPServiceType = Field(..., description="Type of GCP service")
    count: int = Field(..., description="Number of resources of this type")
    
class GCPResourceCountsResponse(BaseModel):
    """Response model for resource counts by service type"""
    resource_counts: List[GCPResourceCount] = Field(..., description="List of resource counts by service type")
    total_resources: int = Field(..., description="Total number of resources across all services")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="When the counts were last updated")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPResourceCreate(BaseModel):
    """Request model for creating GCP resource"""
    credentials_id: str = Field(..., description="GCP credentials ID")
    resource_id: str = Field(..., description="GCP resource ID")
    resource_name: str = Field(..., description="Human-readable resource name")
    service_type: GCPServiceType = Field(..., description="Type of GCP service")
    zone: Optional[str] = None
    region: Optional[str] = None
    labels: Dict[str, str] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GCPResourceUpdate(BaseModel):
    """Request model for updating GCP resource"""
    resource_name: Optional[str] = None
    zone: Optional[str] = None
    region: Optional[str] = None
    labels: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None
    monitoring_enabled: Optional[bool] = None

class GCPResourceResponse(BaseModel):
    """Response model for GCP resource"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    service_type: GCPServiceType
    zone: Optional[str]
    region: Optional[str]
    labels: Dict[str, str]
    metadata: Dict[str, Any]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPComputeEngineResponse(BaseModel):
    """Response model for GCP Compute Engine instances"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    zone: str
    region: str
    machine_type: str
    status: str
    internal_ip: Optional[str]
    external_ip: Optional[str]
    network_interfaces: List[Dict[str, Any]]
    disks: List[Dict[str, Any]]
    service_accounts: List[Dict[str, Any]]
    tags: List[str]
    labels: Dict[str, str]
    metadata: Dict[str, Any]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPCloudSQLResponse(BaseModel):
    """Response model for GCP Cloud SQL instances"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    region: str
    database_version: str
    tier: str
    state: str
    ip_addresses: List[Dict[str, Any]]
    connection_name: str
    backend_type: str
    instance_type: str
    storage_size_gb: Optional[int]
    storage_type: Optional[str]
    backup_enabled: bool
    labels: Dict[str, str]
    settings: Dict[str, Any]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPCloudStorageResponse(BaseModel):
    """Response model for GCP Cloud Storage buckets"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    location: str
    location_type: str
    storage_class: str
    versioning_enabled: bool
    lifecycle_rules: List[Dict[str, Any]]
    cors_config: List[Dict[str, Any]]
    encryption: Optional[Dict[str, Any]]
    iam_policy: Optional[Dict[str, Any]]
    website_config: Optional[Dict[str, Any]]
    logging_config: Optional[Dict[str, Any]]
    retention_policy: Optional[Dict[str, Any]]
    labels: Dict[str, str]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPLoadBalancerResponse(BaseModel):
    """Response model for GCP Load Balancers"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    region: Optional[str]
    load_balancing_scheme: str
    ip_address: Optional[str]
    ip_protocol: str
    port_range: Optional[str]
    backend_service: Optional[str]
    url_map: Optional[str]
    target_proxy: Optional[str]
    forwarding_rules: List[Dict[str, Any]]
    health_checks: List[Dict[str, Any]]
    labels: Dict[str, str]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPKubernetesEngineResponse(BaseModel):
    """Response model for GCP Kubernetes Engine clusters"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    zone: Optional[str]
    region: Optional[str]
    status: str
    current_master_version: str
    current_node_version: str
    initial_node_count: int
    current_node_count: int
    endpoint: str
    network: str
    subnetwork: Optional[str]
    node_pools: List[Dict[str, Any]]
    addons_config: Dict[str, Any]
    master_auth: Dict[str, Any]
    logging_service: Optional[str]
    monitoring_service: Optional[str]
    labels: Dict[str, str]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPCloudFunctionsResponse(BaseModel):
    """Response model for GCP Cloud Functions"""
    id: str
    credentials_id: str
    resource_id: str
    resource_name: str
    region: str
    status: str
    runtime: str
    entry_point: str
    source_archive_url: Optional[str]
    source_repository: Optional[Dict[str, Any]]
    https_trigger: Optional[Dict[str, Any]]
    event_trigger: Optional[Dict[str, Any]]
    timeout: Optional[str]
    available_memory_mb: Optional[int]
    max_instances: Optional[int]
    min_instances: Optional[int]
    environment_variables: Dict[str, str]
    build_environment_variables: Dict[str, str]
    labels: Dict[str, str]
    monitoring_enabled: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPMetricResponse(BaseModel):
    """Response model for GCP metric"""
    id: str
    resource_id: str
    metric_type: GCPMetricType
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    labels: Dict[str, str]
    collected_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPMetricsQuery(BaseModel):
    """Request model for querying GCP metrics"""
    resource_ids: Optional[List[str]] = None
    metric_types: Optional[List[GCPMetricType]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(100, ge=1, le=1000)
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        if v and values is not None and 'start_time' in values and values['start_time']:
            if v <= values['start_time']:
                raise ValueError('end_time must be after start_time')
        return v

class GCPAlertResponse(BaseModel):
    """Response model for GCP alert"""
    id: str
    resource_id: str
    metric_type: GCPMetricType
    alert_type: str
    severity: str
    message: str
    threshold_value: Optional[float]
    current_value: float
    triggered_at: datetime
    resolved_at: Optional[datetime]
    is_resolved: bool
    metadata: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPServiceStatus(BaseModel):
    """GCP Service status model"""
    credentials_count: int
    resources_count: int
    active_resources_count: int
    last_collection_time: Optional[datetime]
    collection_errors: List[str] = Field(default_factory=list)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# GCP Cloud Monitoring API Models
class GCPTimeSeriesPoint(BaseModel):
    """Time series data point"""
    timestamp: datetime
    value: float
    
class GCPTimeSeries(BaseModel):
    """GCP Time Series model for Cloud Monitoring API"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="GCP Project ID")
    metric_type: str = Field(..., description="Metric type (e.g., compute.googleapis.com/instance/cpu/utilization)")
    resource_type: str = Field(..., description="Resource type (e.g., gce_instance)")
    resource_labels: Dict[str, str] = Field(default_factory=dict, description="Resource labels")
    metric_labels: Dict[str, str] = Field(default_factory=dict, description="Metric labels")
    points: List[GCPTimeSeriesPoint] = Field(default_factory=list, description="Time series data points")
    unit: str = Field("", description="Metric unit")
    value_type: str = Field("DOUBLE", description="Value type (DOUBLE, INT64, BOOL, STRING)")
    metric_kind: str = Field("GAUGE", description="Metric kind (GAUGE, DELTA, CUMULATIVE)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPMetricDescriptor(BaseModel):
    """GCP Metric Descriptor model"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="GCP Project ID")
    name: str = Field(..., description="Metric name")
    type: str = Field(..., description="Metric type")
    display_name: str = Field("", description="Display name")
    description: str = Field("", description="Metric description")
    unit: str = Field("", description="Metric unit")
    value_type: str = Field("DOUBLE", description="Value type")
    metric_kind: str = Field("GAUGE", description="Metric kind")
    labels: List[Dict[str, str]] = Field(default_factory=list, description="Metric labels")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPAlertPolicy(BaseModel):
    """GCP Alert Policy model"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="GCP Project ID")
    name: str = Field(..., description="Alert policy name")
    display_name: str = Field(..., description="Display name")
    documentation: Optional[str] = Field(None, description="Alert policy documentation")
    conditions: List[Dict[str, Any]] = Field(default_factory=list, description="Alert conditions")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channel IDs")
    enabled: bool = Field(True, description="Whether the policy is enabled")
    combiner: str = Field("OR", description="How to combine multiple conditions (OR, AND)")
    creation_record: Optional[Dict[str, Any]] = Field(None, description="Creation record")
    mutation_record: Optional[Dict[str, Any]] = Field(None, description="Last mutation record")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class GCPNotificationChannel(BaseModel):
    """GCP Notification Channel model"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str = Field(..., description="GCP Project ID")
    name: str = Field(..., description="Notification channel name")
    display_name: str = Field(..., description="Display name")
    description: str = Field("", description="Channel description")
    type: str = Field(..., description="Channel type (email, sms, slack, etc.)")
    labels: Dict[str, str] = Field(default_factory=dict, description="Channel labels")
    user_labels: Dict[str, str] = Field(default_factory=dict, description="User-defined labels")
    verification_status: str = Field("UNVERIFIED", description="Verification status")
    enabled: bool = Field(True, description="Whether the channel is enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

# Request/Response Models for Cloud Monitoring API
class GCPTimeSeriesQuery(BaseModel):
    """Request model for querying time series data"""
    project_id: str = Field(..., description="GCP Project ID")
    filter: str = Field(..., description="Monitoring filter string")
    interval_start_time: datetime = Field(..., description="Start time for the query")
    interval_end_time: datetime = Field(..., description="End time for the query")
    aggregation: Optional[Dict[str, Any]] = Field(None, description="Aggregation parameters")
    page_size: int = Field(1000, ge=1, le=100000, description="Maximum number of results")
    
class GCPTimeSeriesResponse(BaseModel):
    """Response model for time series data"""
    id: str
    project_id: str
    metric_type: str
    resource_type: str
    resource_labels: Dict[str, str]
    metric_labels: Dict[str, str]
    points: List[GCPTimeSeriesPoint]
    unit: str
    value_type: str
    metric_kind: str
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPAlertPolicyCreate(BaseModel):
    """Request model for creating alert policies"""
    project_id: str = Field(..., description="GCP Project ID")
    display_name: str = Field(..., description="Display name")
    documentation: Optional[str] = None
    conditions: List[Dict[str, Any]] = Field(..., description="Alert conditions")
    notification_channels: List[str] = Field(default_factory=list)
    enabled: bool = Field(True)
    combiner: str = Field("OR")

class GCPAlertPolicyResponse(BaseModel):
    """Response model for alert policies"""
    id: str
    project_id: str
    name: str
    display_name: str
    documentation: Optional[str]
    conditions: List[Dict[str, Any]]
    notification_channels: List[str]
    enabled: bool
    combiner: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GCPMetricDescriptorResponse(BaseModel):
    """Response model for metric descriptors"""
    id: str
    project_id: str
    name: str
    type: str
    display_name: str
    description: str
    unit: str
    value_type: str
    metric_kind: str
    labels: List[Dict[str, str]]
    created_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }