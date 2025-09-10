from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class DeviceType(str, Enum):
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    SERVER = "server"
    ACCESS_POINT = "access_point"
    OTHER = "other"


class SNMPVersion(str, Enum):
    V2C = "v2c"
    V3 = "v3"


class SNMPAuthProtocol(str, Enum):
    MD5 = "MD5"
    SHA = "SHA"
    SHA224 = "SHA224"
    SHA256 = "SHA256"
    SHA384 = "SHA384"
    SHA512 = "SHA512"


class SNMPPrivProtocol(str, Enum):
    DES = "DES"
    AES = "AES"
    AES192 = "AES192"
    AES256 = "AES256"
    TRIPLE_DES = "3DES"


class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Device name")
    ip_address: str = Field(..., description="Device IP address")
    device_type: DeviceType = Field(..., description="Type of device")
    location: Optional[str] = Field(None, max_length=200, description="Physical location")
    description: Optional[str] = Field(None, max_length=500, description="Device description")
    
    # SNMP Configuration
    snmp_version: SNMPVersion = Field(..., description="SNMP version")
    snmp_port: int = Field(161, ge=1, le=65535, description="SNMP port")
    
    # SNMP v2c fields
    snmp_community: Optional[str] = Field(None, description="SNMP community string (v2c)")
    
    # SNMP v3 fields
    snmp_username: Optional[str] = Field(None, description="SNMP v3 username")
    snmp_auth_protocol: Optional[SNMPAuthProtocol] = Field(None, description="SNMP v3 auth protocol")
    snmp_auth_password: Optional[str] = Field(None, description="SNMP v3 auth password")
    snmp_priv_protocol: Optional[SNMPPrivProtocol] = Field(None, description="SNMP v3 privacy protocol")
    snmp_priv_password: Optional[str] = Field(None, description="SNMP v3 privacy password")
    
    # Monitoring settings
    enabled: bool = Field(True, description="Whether monitoring is enabled")
    poll_interval: int = Field(300, ge=60, le=3600, description="Polling interval in seconds")
    
    @validator('ip_address')
    def validate_ip_address(cls, v):
        import ipaddress
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError('Invalid IP address format')
    
    @validator('snmp_community')
    def validate_snmp_v2c(cls, v, values):
        if values.get('snmp_version') == SNMPVersion.V2C and not v:
            raise ValueError('SNMP community is required for SNMP v2c')
        return v
    
    @validator('snmp_username')
    def validate_snmp_v3_username(cls, v, values):
        if values.get('snmp_version') == SNMPVersion.V3 and not v:
            raise ValueError('SNMP username is required for SNMP v3')
        return v
    
    @validator('snmp_auth_password')
    def validate_snmp_v3_auth(cls, v, values):
        if (values.get('snmp_version') == SNMPVersion.V3 and 
            values.get('snmp_auth_protocol') and not v):
            raise ValueError('SNMP auth password is required when auth protocol is specified')
        return v
    
    @validator('snmp_priv_password')
    def validate_snmp_v3_priv(cls, v, values):
        if (values.get('snmp_version') == SNMPVersion.V3 and 
            values.get('snmp_priv_protocol') and not v):
            raise ValueError('SNMP privacy password is required when privacy protocol is specified')
        return v


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    device_type: Optional[DeviceType] = None
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    
    # SNMP Configuration
    snmp_version: Optional[SNMPVersion] = None
    snmp_port: Optional[int] = Field(None, ge=1, le=65535)
    
    # SNMP v2c fields
    snmp_community: Optional[str] = None
    
    # SNMP v3 fields
    snmp_username: Optional[str] = None
    snmp_auth_protocol: Optional[SNMPAuthProtocol] = None
    snmp_auth_password: Optional[str] = None
    snmp_priv_protocol: Optional[SNMPPrivProtocol] = None
    snmp_priv_password: Optional[str] = None
    
    # Monitoring settings
    enabled: Optional[bool] = None
    poll_interval: Optional[int] = Field(None, ge=60, le=3600)


class DeviceResponse(DeviceBase):
    id: str = Field(..., description="Device ID")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    last_seen: Optional[datetime] = Field(None, description="Last successful poll")
    last_health_check: Optional[datetime] = Field(None, description="Last health check timestamp")
    last_report_time: Optional[datetime] = Field(None, description="Last report timestamp")
    last_poll_attempt: Optional[datetime] = Field(None, description="Last polling attempt timestamp")
    last_poll_completion: Optional[datetime] = Field(None, description="Last polling completion timestamp")
    last_successful_poll: Optional[datetime] = Field(None, description="Last successful polling timestamp")
    status: Optional[Literal["online", "offline", "unknown"]] = Field("unknown", description="Device status")
    is_active: bool = Field(True, description="Whether device is active for monitoring")
    
    class Config:
        from_attributes = True


class Device(DeviceResponse):
    """MongoDB document model for devices"""
    pass


class DeviceHealth(BaseModel):
    """Device health metrics"""
    device_id: str
    timestamp: datetime
    
    # Connectivity status
    is_reachable: Optional[bool] = None
    response_time: Optional[float] = None  # in milliseconds
    
    # System information
    system_description: Optional[str] = None
    system_uptime: Optional[int] = None  # in seconds
    
    # CPU metrics
    cpu_load_1min: Optional[float] = None
    cpu_load_5min: Optional[float] = None
    cpu_load_15min: Optional[float] = None
    cpu_usage_1min: Optional[float] = None  # alias for cpu_load_1min
    cpu_usage_5min: Optional[float] = None  # alias for cpu_load_5min
    cpu_usage_15min: Optional[float] = None  # alias for cpu_load_15min
    
    # Memory metrics
    memory_total: Optional[int] = None  # in bytes
    memory_used: Optional[int] = None   # in bytes
    memory_available: Optional[int] = None  # in bytes
    memory_utilization: Optional[float] = None  # percentage
    
    # Disk metrics
    disk_total: Optional[int] = None  # in bytes
    disk_used: Optional[int] = None   # in bytes
    disk_available: Optional[int] = None  # in bytes
    disk_utilization: Optional[float] = None  # percentage
    disk_status: Optional[str] = None  # status message
    disk_error: Optional[str] = None   # error/configuration message
    
    # Temperature
    temperature: Optional[float] = None  # in Celsius
    
    # Network interfaces count
    interfaces_total: Optional[int] = None
    interfaces_up: Optional[int] = None
    interfaces_down: Optional[int] = None
    
    class Config:
        from_attributes = True


class InterfaceStatus(BaseModel):
    """Network interface status"""
    device_id: str
    interface_name: str
    interface_index: int
    timestamp: datetime
    
    # Interface information
    interface_description: Optional[str] = None
    interface_type: Optional[str] = None
    interface_speed: Optional[int] = None  # in bps
    
    # Status
    admin_status: Optional[str] = None  # up, down, testing
    oper_status: Optional[str] = None   # up, down, testing, unknown, dormant, notPresent, lowerLayerDown
    
    # Traffic counters
    bytes_in: Optional[int] = None
    bytes_out: Optional[int] = None
    packets_in: Optional[int] = None
    packets_out: Optional[int] = None
    
    # Error counters
    errors_in: Optional[int] = None
    errors_out: Optional[int] = None
    discards_in: Optional[int] = None
    discards_out: Optional[int] = None
    
    # Utilization (calculated)
    utilization_in: Optional[float] = None  # percentage
    utilization_out: Optional[float] = None  # percentage
    
    class Config:
        from_attributes = True