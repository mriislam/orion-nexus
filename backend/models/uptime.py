from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, validator
from bson import ObjectId
from enum import Enum


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema


class MonitorStatus(str, Enum):
    UP = "up"
    DOWN = "down"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"


class CheckMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    HEAD = "HEAD"
    PUT = "PUT"
    DELETE = "DELETE"


class UptimeMonitorConfig(BaseModel):
    """Configuration for uptime monitoring of web applications"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Display name for the monitor")
    url: HttpUrl = Field(..., description="URL to monitor")
    method: CheckMethod = Field(default=CheckMethod.GET, description="HTTP method to use")
    expected_status_code: int = Field(default=200, description="Expected HTTP status code")
    expected_content: Optional[str] = Field(None, description="Expected string in response body")
    check_interval: int = Field(default=300, description="Check interval in seconds")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    max_retries: int = Field(default=3, description="Maximum number of retries on failure")
    headers: Optional[Dict[str, str]] = Field(default_factory=dict, description="Custom headers")
    body: Optional[str] = Field(None, description="Request body for POST/PUT requests")
    follow_redirects: bool = Field(default=True, description="Follow HTTP redirects")
    verify_ssl: bool = Field(default=True, description="Verify SSL certificates")
    alert_on_failure: bool = Field(default=True, description="Send alerts on failure")
    alert_threshold: int = Field(default=1, description="Number of consecutive failures before alerting")
    locations: List[str] = Field(default_factory=lambda: ["default"], description="Monitoring locations")
    tags: List[str] = Field(default_factory=list, description="Tags for organization")
    is_active: bool = Field(default=True, description="Whether monitoring is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(None, description="User who created this monitor")

    @validator('check_interval')
    def validate_check_interval(cls, v):
        if v < 60:
            raise ValueError('Check interval must be at least 60 seconds')
        return v

    @validator('timeout')
    def validate_timeout(cls, v):
        if v < 1 or v > 300:
            raise ValueError('Timeout must be between 1 and 300 seconds')
        return v

    @validator('expected_status_code')
    def validate_status_code(cls, v):
        if v < 100 or v > 599:
            raise ValueError('Status code must be between 100 and 599')
        return v

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            HttpUrl: str
        }
        schema_extra = {
            "example": {
                "name": "My Website",
                "url": "https://example.com",
                "method": "GET",
                "expected_status_code": 200,
                "expected_content": "Welcome",
                "check_interval": 300,
                "timeout": 30,
                "max_retries": 3,
                "headers": {"User-Agent": "UptimeMonitor/1.0"},
                "follow_redirects": True,
                "verify_ssl": True,
                "alert_on_failure": True,
                "alert_threshold": 2,
                "locations": ["us-east", "eu-west"],
                "tags": ["production", "api"]
            }
        }


class UptimeCheckResult(BaseModel):
    """Result of an uptime check"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    monitor_id: PyObjectId = Field(..., description="Reference to the monitor configuration")
    location: str = Field(default="default", description="Location where check was performed")
    status: MonitorStatus = Field(..., description="Status of the check")
    response_time: Optional[float] = Field(None, description="Response time in milliseconds")
    status_code: Optional[int] = Field(None, description="HTTP status code received")
    content_match: Optional[bool] = Field(None, description="Whether expected content was found")
    error_message: Optional[str] = Field(None, description="Error message if check failed")
    response_headers: Optional[Dict[str, str]] = Field(default_factory=dict, description="Response headers")
    response_size: Optional[int] = Field(None, description="Response size in bytes")
    ssl_expiry: Optional[datetime] = Field(None, description="SSL certificate expiry date")
    dns_resolution_time: Optional[float] = Field(None, description="DNS resolution time in ms")
    tcp_connection_time: Optional[float] = Field(None, description="TCP connection time in ms")
    tls_handshake_time: Optional[float] = Field(None, description="TLS handshake time in ms")
    redirect_count: Optional[int] = Field(None, description="Number of redirects followed")
    checked_at: datetime = Field(default_factory=datetime.utcnow, description="When the check was performed")
    retry_count: int = Field(default=0, description="Number of retries performed")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "monitor_id": "507f1f77bcf86cd799439011",
                "location": "us-east",
                "status": "up",
                "response_time": 245.5,
                "status_code": 200,
                "content_match": True,
                "response_headers": {"content-type": "text/html"},
                "response_size": 1024,
                "dns_resolution_time": 15.2,
                "tcp_connection_time": 45.8,
                "tls_handshake_time": 89.3,
                "redirect_count": 0,
                "retry_count": 0
            }
        }


class UptimeStats(BaseModel):
    """Uptime statistics for a monitor"""
    monitor_id: PyObjectId
    uptime_percentage: float = Field(..., description="Uptime percentage")
    total_checks: int = Field(..., description="Total number of checks")
    successful_checks: int = Field(..., description="Number of successful checks")
    failed_checks: int = Field(..., description="Number of failed checks")
    avg_response_time: float = Field(..., description="Average response time in ms")
    min_response_time: float = Field(..., description="Minimum response time in ms")
    max_response_time: float = Field(..., description="Maximum response time in ms")
    last_check_at: Optional[datetime] = Field(None, description="Last check timestamp")
    last_downtime: Optional[datetime] = Field(None, description="Last downtime timestamp")
    current_status: MonitorStatus = Field(..., description="Current status")
    consecutive_failures: int = Field(default=0, description="Current consecutive failures")
    total_downtime: int = Field(default=0, description="Total downtime in seconds")
    period_start: datetime = Field(..., description="Start of statistics period")
    period_end: datetime = Field(..., description="End of statistics period")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UptimeAlert(BaseModel):
    """Alert configuration and history for uptime monitoring"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    monitor_id: PyObjectId = Field(..., description="Reference to the monitor")
    alert_type: str = Field(..., description="Type of alert (down, slow, ssl_expiry)")
    severity: str = Field(default="warning", description="Alert severity")
    message: str = Field(..., description="Alert message")
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(None, description="When alert was resolved")
    is_resolved: bool = Field(default=False, description="Whether alert is resolved")
    notification_sent: bool = Field(default=False, description="Whether notification was sent")
    escalation_level: int = Field(default=1, description="Escalation level")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional alert data")

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Request/Response models for API
class CreateUptimeMonitorRequest(BaseModel):
    name: str
    url: HttpUrl
    method: CheckMethod = CheckMethod.GET
    expected_status_code: int = 200
    expected_content: Optional[str] = None
    check_interval: int = 300
    timeout: int = 30
    max_retries: int = 3
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = None
    follow_redirects: bool = True
    verify_ssl: bool = True
    alert_on_failure: bool = True
    alert_threshold: int = 1
    locations: List[str] = ["default"]
    tags: List[str] = []


class UpdateUptimeMonitorRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[HttpUrl] = None
    method: Optional[CheckMethod] = None
    expected_status_code: Optional[int] = None
    expected_content: Optional[str] = None
    check_interval: Optional[int] = None
    timeout: Optional[int] = None
    max_retries: Optional[int] = None
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = None
    follow_redirects: Optional[bool] = None
    verify_ssl: Optional[bool] = None
    alert_on_failure: Optional[bool] = None
    alert_threshold: Optional[int] = None
    locations: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UptimeMonitorResponse(BaseModel):
    id: str
    name: str
    url: str
    method: CheckMethod
    expected_status_code: int
    expected_content: Optional[str]
    check_interval: int
    timeout: int
    max_retries: int
    headers: Dict[str, str]
    body: Optional[str]
    follow_redirects: bool
    verify_ssl: bool
    alert_on_failure: bool
    alert_threshold: int
    locations: List[str]
    tags: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str]
    current_status: Optional[MonitorStatus] = None
    uptime_percentage: Optional[float] = None
    avg_response_time: Optional[float] = None
    last_check_at: Optional[datetime] = None


class UptimeCheckResultResponse(BaseModel):
    id: str
    monitor_id: str
    location: str
    status: MonitorStatus
    response_time: Optional[float]
    status_code: Optional[int]
    content_match: Optional[bool]
    error_message: Optional[str]
    response_headers: Dict[str, str]
    response_size: Optional[int]
    ssl_expiry: Optional[datetime]
    dns_resolution_time: Optional[float]
    tcp_connection_time: Optional[float]
    tls_handshake_time: Optional[float]
    redirect_count: Optional[int]
    checked_at: datetime
    retry_count: int