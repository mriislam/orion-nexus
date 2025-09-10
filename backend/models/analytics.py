from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class GAMetricType(str, Enum):
    ACTIVE_USERS = "active_users"
    SESSIONS = "sessions"
    PAGE_VIEWS = "page_views"
    BOUNCE_RATE = "bounce_rate"
    SESSION_DURATION = "session_duration"
    CONVERSIONS = "conversions"
    REVENUE = "revenue"
    TRAFFIC_SOURCE = "traffic_source"
    TOP_PAGES = "top_pages"
    DEVICE_CATEGORY = "device_category"
    GEOGRAPHIC = "geographic"

class GATimePeriod(str, Enum):
    LAST_7_DAYS = "7daysAgo"
    LAST_30_DAYS = "30daysAgo"
    LAST_90_DAYS = "90daysAgo"
    TODAY = "today"
    YESTERDAY = "yesterday"

class GACredentials(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    property_id: str = Field(..., description="GA4 Property ID (e.g., 123456789)")
    service_account_json: str  # Encrypted JSON content of service account key file
    service_account_email: Optional[str] = None  # Email from service account for reference
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAProperty(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    credentials_id: str
    property_id: str
    property_name: str
    website_url: Optional[str] = None
    industry_category: Optional[str] = None
    time_zone: Optional[str] = None
    currency_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_synced: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAMetric(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    property_id: str
    user_id: str
    metric_type: GAMetricType
    metric_name: str
    value: float
    previous_value: Optional[float] = None
    change_percentage: Optional[float] = None
    dimensions: Optional[Dict[str, Any]] = None
    date_range_start: datetime
    date_range_end: datetime
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAReport(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    property_id: str
    report_type: str
    report_name: str
    data: Dict[str, Any]
    date_range_start: datetime
    date_range_end: datetime
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Request/Response Models
class GACredentialsCreate(BaseModel):
    property_id: str = Field(..., description="GA4 Property ID (e.g., 123456789)")
    service_account_json: str = Field(..., description="Service Account JSON key file content")

class GACredentialsUpdate(BaseModel):
    property_id: Optional[str] = None
    service_account_json: Optional[str] = None
    is_active: Optional[bool] = None

class GACredentialsResponse(BaseModel):
    id: str
    property_id: str
    service_account_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAMetricRequest(BaseModel):
    property_id: str
    metric_types: List[GAMetricType]
    date_range_start: datetime
    date_range_end: datetime
    dimensions: Optional[List[str]] = None

class GAMetricResponse(BaseModel):
    property_id: str
    metrics: List[GAMetric]
    total_count: int
    
class GAReportRequest(BaseModel):
    property_id: str
    report_type: str
    date_range: GATimePeriod = GATimePeriod.LAST_7_DAYS
    custom_date_start: Optional[datetime] = None
    custom_date_end: Optional[datetime] = None
    dimensions: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    limit: Optional[int] = 10

class GAReportResponse(BaseModel):
    property_id: str
    report_type: str
    data: Dict[str, Any]
    date_range_start: datetime
    date_range_end: datetime
    generated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# OAuth URL class removed - using Service Account authentication instead

class GAPropertyInfo(BaseModel):
    property_id: str
    property_name: str
    website_url: Optional[str] = None
    time_zone: Optional[str] = None
    currency_code: Optional[str] = None

class GADashboardData(BaseModel):
    property_id: str
    active_users: Optional[int] = None
    sessions: Optional[int] = None
    page_views: Optional[int] = None
    bounce_rate: Optional[float] = None
    avg_session_duration: Optional[float] = None
    top_pages: Optional[List[Dict[str, Any]]] = None
    traffic_sources: Optional[List[Dict[str, Any]]] = None
    device_categories: Optional[List[Dict[str, Any]]] = None
    geographic_data: Optional[List[Dict[str, Any]]] = None
    date_range_start: datetime
    date_range_end: datetime
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Admin API Models
class GAAccount(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    account_id: str = Field(..., description="Google Analytics Account ID")
    name: str = Field(..., description="Account resource name")
    display_name: str = Field(..., description="Human-readable display name")
    region_code: str = Field(..., description="Country/region code")
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    deleted: bool = False
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAPropertyAdmin(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    property_id: str = Field(..., description="Google Analytics Property ID")
    name: str = Field(..., description="Property resource name")
    display_name: str = Field(..., description="Human-readable display name")
    parent_account: str = Field(..., description="Parent account resource name")
    property_type: str = Field(default="PROPERTY_TYPE_ORDINARY")
    service_level: Optional[str] = None
    time_zone: str = Field(default="UTC")
    currency_code: str = Field(default="USD")
    industry_category: Optional[str] = None
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    deleted: bool = False
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GADataStreamAdmin(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    stream_id: str = Field(..., description="Data Stream ID")
    name: str = Field(..., description="Stream resource name")
    display_name: str = Field(..., description="Human-readable display name")
    type: str = Field(..., description="Stream type (WEB_DATA_STREAM, etc.)")
    property_id: str = Field(..., description="Parent property ID")
    web_stream_data: Optional[Dict[str, Any]] = None
    android_app_stream_data: Optional[Dict[str, Any]] = None
    ios_app_stream_data: Optional[Dict[str, Any]] = None
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Request/Response Models for Admin API
class GAAccountResponse(BaseModel):
    account_id: str
    name: str
    display_name: str
    region_code: str
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAPropertyCreateRequest(BaseModel):
    display_name: str = Field(..., description="Human-readable display name for the property")
    parent_account: str = Field(..., description="Parent account resource name")
    time_zone: str = Field(default="UTC")
    currency_code: str = Field(default="USD")
    industry_category: Optional[str] = None

class GAPropertyResponse(BaseModel):
    property_id: str
    name: str
    display_name: str
    parent_account: str
    time_zone: str
    currency_code: str
    industry_category: Optional[str] = None
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GADataStreamCreateRequest(BaseModel):
    display_name: str = Field(..., description="Human-readable display name for the stream")
    type: str = Field(..., description="Stream type (WEB_DATA_STREAM, ANDROID_APP_DATA_STREAM, IOS_APP_DATA_STREAM)")
    web_stream_data: Optional[Dict[str, Any]] = None
    android_app_stream_data: Optional[Dict[str, Any]] = None
    ios_app_stream_data: Optional[Dict[str, Any]] = None

class GADataStreamResponse(BaseModel):
    stream_id: str
    name: str
    display_name: str
    type: str
    property_id: str
    web_stream_data: Optional[Dict[str, Any]] = None
    android_app_stream_data: Optional[Dict[str, Any]] = None
    ios_app_stream_data: Optional[Dict[str, Any]] = None
    create_time: Optional[datetime] = None
    update_time: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Enhanced metrics storage models
from typing import Union
from bson import ObjectId

class GADimension(BaseModel):
    """Model for Google Analytics dimension data"""
    name: str
    value: str
    display_name: Optional[str] = None

class GAMetricValue(BaseModel):
    """Model for Google Analytics metric values with metadata"""
    name: str
    value: Union[int, float, str]
    formatted_value: Optional[str] = None
    data_type: str = "number"  # number, string, currency, percent, time
    
class GARealtimeData(BaseModel):
    """Model for real-time analytics data"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    property_id: str
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    active_users: int = 0
    page_views: int = 0
    events: int = 0
    countries: List[Dict[str, Any]] = []
    devices: List[Dict[str, Any]] = []
    pages: List[Dict[str, Any]] = []
    event_data: List[Dict[str, Any]] = []
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAEnhancedMetric(BaseModel):
    """Enhanced model for Google Analytics metrics with complex data support"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    property_id: str
    user_id: str
    metric_category: str  # overview, traffic, pages, events, demographics, realtime
    metric_type: str  # sessions, users, pageviews, bounce_rate, etc.
    metric_name: str
    
    # Enhanced value storage
    scalar_value: Optional[Union[int, float]] = None
    string_value: Optional[str] = None
    array_value: Optional[List[Dict[str, Any]]] = None
    object_value: Optional[Dict[str, Any]] = None
    
    # Metadata
    dimensions: List[GADimension] = []
    metrics: List[GAMetricValue] = []
    data_source: str = "ga4"  # ga4, realtime, admin
    collection_method: str = "batch"  # batch, realtime, manual
    
    # Time information
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Comparison data
    previous_value: Optional[Union[int, float]] = None
    change_percentage: Optional[float] = None
    trend: Optional[str] = None  # up, down, stable
    
    # Quality and validation
    data_quality_score: Optional[float] = None
    is_validated: bool = False
    validation_errors: List[str] = []
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GAMetricAggregation(BaseModel):
    """Model for aggregated metrics data"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    property_id: str
    user_id: str
    aggregation_type: str  # daily, weekly, monthly, yearly
    aggregation_date: datetime
    
    # Aggregated values
    total_sessions: int = 0
    total_users: int = 0
    total_pageviews: int = 0
    total_events: int = 0
    average_session_duration: float = 0.0
    bounce_rate: float = 0.0
    
    # Top performers
    top_pages: List[Dict[str, Any]] = []
    top_traffic_sources: List[Dict[str, Any]] = []
    top_countries: List[Dict[str, Any]] = []
    top_devices: List[Dict[str, Any]] = []
    
    # Calculated at
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Time Series Models
class GATimeSeriesInterval(str, Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class GATimeSeriesDataPoint(BaseModel):
    """Individual data point in a time series"""
    timestamp: datetime
    value: Union[int, float]
    formatted_value: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class GATimeSeriesMetric(BaseModel):
    """Time series data for a specific metric"""
    metric_name: str
    metric_type: str
    data_points: List[GATimeSeriesDataPoint]
    interval: GATimeSeriesInterval
    start_date: datetime
    end_date: datetime
    total_data_points: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GATimeSeriesData(BaseModel):
    """Complete time series dataset"""
    id: Optional[str] = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    property_id: str
    user_id: str
    metrics: List[GATimeSeriesMetric]
    interval: GATimeSeriesInterval
    date_range_start: datetime
    date_range_end: datetime
    dimensions: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class GATimeSeriesRequest(BaseModel):
    """Request model for time series data"""
    property_id: str
    metric_names: List[str]
    start_date: datetime
    end_date: datetime
    interval: GATimeSeriesInterval = GATimeSeriesInterval.DAILY
    dimensions: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = 1000
    
class GATimeSeriesResponse(BaseModel):
    """Response model for time series data"""
    property_id: str
    time_series_data: GATimeSeriesData
    summary: Dict[str, Any]
    query_info: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }