from pydantic import BaseModel, Field, validator
from typing import Optional, Literal, List
from datetime import datetime
from enum import Enum


class CheckType(str, Enum):
    PING = "ping"
    HTTP = "http"
    HTTPS = "https"
    PORT = "port"
    DNS = "dns"


class UptimeCheckBase(BaseModel):
    target: str = Field(..., min_length=1, max_length=255, description="Target host/URL to check")
    check_type: Optional[CheckType] = Field(CheckType.PING, description="Type of check to perform")
    port: Optional[int] = Field(None, ge=1, le=65535, description="Port number for port checks")
    timeout: Optional[int] = Field(5, ge=1, le=60, description="Timeout in seconds")
    expected_status_code: Optional[int] = Field(200, ge=100, le=599, description="Expected HTTP status code")
    
    @validator('target')
    def validate_target(cls, v, values):
        check_type = values.get('check_type', CheckType.PING)
        
        if check_type in [CheckType.HTTP, CheckType.HTTPS]:
            # For HTTP checks, ensure it's a valid URL
            if not (v.startswith('http://') or v.startswith('https://')):
                if check_type == CheckType.HTTPS:
                    v = f'https://{v}'
                else:
                    v = f'http://{v}'
        
        return v


class UptimeCheckCreate(UptimeCheckBase):
    pass


class UptimeCheckResponse(UptimeCheckBase):
    id: str = Field(..., description="Check ID")
    timestamp: datetime = Field(..., description="Check timestamp")
    
    # Results
    is_up: bool = Field(..., description="Whether the target is up")
    response_time: Optional[float] = Field(None, description="Response time in milliseconds")
    
    # HTTP-specific results
    status_code: Optional[int] = Field(None, description="HTTP status code")
    
    # Ping-specific results
    packet_loss: Optional[float] = Field(None, description="Packet loss percentage")
    
    # Error information
    error_message: Optional[str] = Field(None, description="Error message if check failed")
    
    class Config:
        from_attributes = True


class UptimeCheck(UptimeCheckResponse):
    """MongoDB document model for uptime checks"""
    pass


class PingResult(BaseModel):
    """Ping test result"""
    target: str
    is_up: bool
    response_time: Optional[float] = None  # in milliseconds
    packet_loss: Optional[float] = None    # percentage
    packets_sent: Optional[int] = None
    packets_received: Optional[int] = None
    min_time: Optional[float] = None
    max_time: Optional[float] = None
    avg_time: Optional[float] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class HTTPResult(BaseModel):
    """HTTP/HTTPS check result"""
    target: str
    is_up: bool
    response_time: Optional[float] = None  # in milliseconds
    status_code: Optional[int] = None
    response_size: Optional[int] = None    # in bytes
    redirect_count: Optional[int] = None
    final_url: Optional[str] = None
    error_message: Optional[str] = None
    
    # Response headers (selected)
    server: Optional[str] = None
    content_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class PortResult(BaseModel):
    """TCP port check result"""
    target: str
    port: int
    is_up: bool
    response_time: Optional[float] = None  # in milliseconds
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class TracerouteHop(BaseModel):
    """Single hop in traceroute"""
    hop_number: int
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    response_times: List[float] = []  # Multiple probes per hop
    timeout: bool = False
    
    class Config:
        from_attributes = True


class TracerouteResult(BaseModel):
    """Traceroute result"""
    target: str
    destination_ip: Optional[str] = None
    hops: List[TracerouteHop] = []
    total_hops: int
    completed: bool
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class DNSResult(BaseModel):
    """DNS lookup result"""
    target: str
    query_type: str = "A"  # A, AAAA, MX, CNAME, etc.
    is_successful: bool
    response_time: Optional[float] = None  # in milliseconds
    
    # DNS records
    a_records: Optional[List[str]] = None
    aaaa_records: Optional[List[str]] = None
    cname_records: Optional[List[str]] = None
    mx_records: Optional[List[str]] = None
    txt_records: Optional[List[str]] = None
    ns_records: Optional[List[str]] = None
    
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class UptimeStats(BaseModel):
    """Uptime statistics for a target"""
    target: str
    period_days: int
    total_checks: int
    successful_checks: int
    failed_checks: int
    uptime_percentage: float
    average_response_time: Optional[float] = None
    last_check: Optional[datetime] = None
    last_downtime: Optional[datetime] = None
    
    # Availability by time periods
    hourly_availability: Optional[List[float]] = None
    daily_availability: Optional[List[float]] = None
    
    class Config:
        from_attributes = True


class MonitoringTarget(BaseModel):
    """Monitoring target configuration"""
    name: str = Field(..., min_length=1, max_length=100)
    target: str = Field(..., min_length=1, max_length=255)
    check_type: CheckType = CheckType.PING
    port: Optional[int] = Field(None, ge=1, le=65535)
    
    # Monitoring settings
    enabled: bool = True
    check_interval: int = Field(300, ge=60, le=3600, description="Check interval in seconds")
    timeout: int = Field(5, ge=1, le=60)
    expected_status_code: Optional[int] = Field(200, ge=100, le=599)
    
    # Alert settings
    alert_on_failure: bool = True
    alert_after_failures: int = Field(3, ge=1, le=10, description="Alert after N consecutive failures")
    notification_emails: Optional[List[str]] = None
    
    # Metadata
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True