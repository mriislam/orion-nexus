from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
import json
import secrets
from urllib.parse import urlencode
from bson import ObjectId

from google.analytics.data import BetaAnalyticsDataClient
from google.analytics.data import (
    RunReportRequest,
    BatchRunReportsRequest,
    RunRealtimeReportRequest,
    Dimension,
    Metric,
    DateRange,
    FilterExpression,
    Filter
)
from google.analytics.admin_v1beta import AnalyticsAdminServiceClient
from google.analytics.admin_v1beta.types import (
    ListAccountsRequest,
    ListPropertiesRequest,
    CreatePropertyRequest,
    UpdatePropertyRequest,
    DeletePropertyRequest,
    Property,
    Account,
    DataStream,
    ListDataStreamsRequest,
    CreateDataStreamRequest
)
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

from models.analytics import (
    GACredentials, GACredentialsCreate, GACredentialsUpdate, GACredentialsResponse,
    GAMetric, GAMetricRequest, GAMetricResponse, GAReport, GAReportRequest, GAReportResponse,
    GAPropertyInfo, GADashboardData, GAMetricType, GATimePeriod,
    GAAccount, GAPropertyAdmin, GADataStreamAdmin, GAAccountResponse, GAPropertyCreateRequest,
    GAPropertyResponse, GADataStreamCreateRequest, GADataStreamResponse,
    GATimeSeriesRequest, GATimeSeriesResponse, GATimeSeriesData, GATimeSeriesMetric,
    GATimeSeriesDataPoint, GATimeSeriesInterval
)
from core.database import get_database
from core.auth import get_current_user
from models.user import UserInDB
# Encryption removed
from core.config import settings

router = APIRouter()

# Service Account Configuration
ANALYTICS_SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly'
]

# OAuth URL endpoint removed - using Service Account authentication

@router.post("/analytics/credentials", response_model=GACredentialsResponse)
async def create_analytics_credentials(
    credentials_data: GACredentialsCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create Google Analytics credentials using Service Account JSON"""
    try:
        db = await get_database()
        
        # Parse and validate service account JSON
        try:
            print(f"DEBUG: Received service account JSON length: {len(credentials_data.service_account_json)}")
            print(f"DEBUG: Service account JSON preview: {credentials_data.service_account_json[:200]}...")
            
            service_account_info = json.loads(credentials_data.service_account_json)
            required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
            missing_fields = [field for field in required_fields if field not in service_account_info]
            
            if missing_fields:
                print(f"DEBUG: Missing required fields: {missing_fields}")
                raise ValueError(f"Invalid service account JSON format. Missing fields: {', '.join(missing_fields)}")
            
            if service_account_info.get('type') != 'service_account':
                print(f"DEBUG: Invalid type: {service_account_info.get('type')}")
                raise ValueError("JSON file must be a service account key")
                
            print(f"DEBUG: Service account validation successful for: {service_account_info.get('client_email')}")
            
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON decode error: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
        except ValueError as e:
            print(f"DEBUG: Validation error: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        
        # Create credentials document (storing plain JSON)
        try:
            ga_credentials = GACredentials(
                user_id=str(current_user.id),
                property_id=credentials_data.property_id,
                service_account_json=credentials_data.service_account_json,
                service_account_email=service_account_info.get('client_email'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to create credentials object: {str(e)}")
        
        # Save to database
        try:
            result = await db.ga_credentials.insert_one(ga_credentials.dict(by_alias=True, exclude={"id"}))
            ga_credentials.id = str(result.inserted_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to save to database: {str(e)}")
        
        # Verify property access (disabled for development)
        # TODO: Re-enable property access verification in production
        # try:
        #     await _verify_property_access(ga_credentials)
        # except Exception as e:
        #     # If verification fails, delete the credentials
        #     await db.ga_credentials.delete_one({"_id": result.inserted_id})
        #     raise HTTPException(status_code=400, detail=f"Cannot access GA4 property: {str(e)}")
        
        return GACredentialsResponse(
            id=ga_credentials.id,
            property_id=ga_credentials.property_id,
            service_account_email=ga_credentials.service_account_email,
            created_at=ga_credentials.created_at,
            updated_at=ga_credentials.updated_at,
            is_active=ga_credentials.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create credentials: {str(e)}")

@router.get("/analytics/credentials", response_model=List[GACredentialsResponse])
async def list_analytics_credentials(current_user: UserInDB = Depends(get_current_user)):
    """List all Google Analytics credentials for the current user"""
    try:
        db = await get_database()
        
        user_id = str(current_user.id)
        cursor = db.ga_credentials.find({"user_id": user_id})
        credentials_list = []
        
        async for doc in cursor:
            credentials_list.append(GACredentialsResponse(
                id=str(doc["_id"]),
                property_id=doc["property_id"],
                service_account_email=doc.get("service_account_email"),
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
                is_active=doc.get("is_active", True)
            ))
        
        return credentials_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list credentials: {str(e)}")

@router.get("/analytics/credentials/{credentials_id}", response_model=GACredentialsResponse)
async def get_analytics_credentials(
    credentials_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get specific Google Analytics credentials"""
    try:
        db = await get_database()
        
        doc = await db.ga_credentials.find_one({
            "_id": ObjectId(credentials_id),
            "user_id": str(current_user.id)
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Credentials not found")
        
        return GACredentialsResponse(
            id=str(doc["_id"]),
            property_id=doc["property_id"],
            service_account_email=doc.get("service_account_email"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            is_active=doc.get("is_active", True)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get credentials: {str(e)}")

@router.put("/analytics/credentials/{credentials_id}", response_model=GACredentialsResponse)
async def update_analytics_credentials(
    credentials_id: str,
    update_data: GACredentialsUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update Google Analytics credentials"""
    try:
        db = await get_database()
        
        # Check if credentials exist
        existing = await db.ga_credentials.find_one({
            "_id": ObjectId(credentials_id),
            "user_id": current_user.id
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Credentials not found")
        
        # Prepare update data
        update_dict = {"updated_at": datetime.utcnow()}
        
        if update_data.property_id is not None:
            update_dict["property_id"] = update_data.property_id
        if update_data.client_id is not None:
            update_dict["client_id"] = update_data.client_id
        if update_data.client_secret is not None:
            update_dict["client_secret"] = update_data.client_secret  # Encryption removed
        if update_data.is_active is not None:
            update_dict["is_active"] = update_data.is_active
        
        # Update in database
        await db.ga_credentials.update_one(
            {"_id": ObjectId(credentials_id)},
            {"$set": update_dict}
        )
        
        # Return updated credentials
        return await get_analytics_credentials(credentials_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update credentials: {str(e)}")

@router.delete("/analytics/credentials/{credentials_id}")
async def delete_analytics_credentials(
    credentials_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete Google Analytics credentials"""
    try:
        db = await get_database()
        
        result = await db.ga_credentials.delete_one({
            "_id": ObjectId(credentials_id),
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Credentials not found")
        
        return {"message": "Credentials deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete credentials: {str(e)}")

@router.get("/analytics/property/{property_id}/info", response_model=GAPropertyInfo)
async def get_property_info(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get Google Analytics property information"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Use Google Analytics Admin API to get property info
        service = build('analyticsadmin', 'v1alpha', credentials=credentials)
        
        property_resource = service.properties().get(name=f"properties/{property_id}").execute()
        
        return GAPropertyInfo(
            property_id=property_id,
            property_name=property_resource.get('displayName', ''),
            website_url=property_resource.get('websiteUrl'),
            time_zone=property_resource.get('timeZone'),
            currency_code=property_resource.get('currencyCode')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get property info: {str(e)}")

@router.get("/analytics/metrics", response_model=List[GAMetric])
async def list_analytics_metrics(
    property_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """List Google Analytics metrics with optional filters"""
    try:
        db = await get_database()
        
        # Build query filter
        filter_dict = {"user_id": current_user.id}
        
        if property_id:
            filter_dict["property_id"] = property_id
        if metric_type:
            filter_dict["metric_type"] = metric_type
        if start_date:
            filter_dict["date_range_start"] = {"$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00'))}
        if end_date:
            if "date_range_end" not in filter_dict:
                filter_dict["date_range_end"] = {}
            filter_dict["date_range_end"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Query metrics from database
        cursor = db.ga_metrics.find(filter_dict).sort("created_at", -1).limit(100)
        metrics_data = await cursor.to_list(length=None)
        
        metrics = []
        for metric_doc in metrics_data:
            metric = GAMetric(
                property_id=metric_doc["property_id"],
                user_id=metric_doc.get("user_id", current_user.id),  # Handle legacy data
                metric_type=GAMetricType(metric_doc["metric_type"]),
                metric_name=metric_doc["metric_name"],
                value=metric_doc["value"],
                dimensions=metric_doc.get("dimensions"),
                date_range_start=metric_doc["date_range_start"],
                date_range_end=metric_doc["date_range_end"]
            )
            metrics.append(metric)
        
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

@router.post("/analytics/metrics", response_model=GAMetricResponse)
async def get_analytics_metrics(
    request: GAMetricRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Fetch Google Analytics metrics"""
    try:
        credentials = await _get_valid_credentials(request.property_id, current_user.id)
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Convert metric types to GA4 metric names
        metric_names = [_convert_metric_type(mt) for mt in request.metric_types]
        
        # Build request
        ga_request = RunReportRequest(
            property=f"properties/{request.property_id}",
            dimensions=[Dimension(name=dim) for dim in (request.dimensions or [])],
            metrics=[Metric(name=name) for name in metric_names],
            date_ranges=[DateRange(
                start_date=request.date_range_start.strftime('%Y-%m-%d'),
                end_date=request.date_range_end.strftime('%Y-%m-%d')
            )]
        )
        
        response = client.run_report(request=ga_request)
        
        # Process response
        metrics = []
        for row in response.rows:
            for i, metric_value in enumerate(row.metric_values):
                metric = GAMetric(
                    property_id=request.property_id,
                    metric_type=request.metric_types[i],
                    metric_name=metric_names[i],
                    value=float(metric_value.value),
                    dimensions={dim.name: row.dimension_values[j].value 
                              for j, dim in enumerate(ga_request.dimensions)} if request.dimensions else None,
                    date_range_start=request.date_range_start,
                    date_range_end=request.date_range_end
                )
                metrics.append(metric)
        
        return GAMetricResponse(
            property_id=request.property_id,
            metrics=metrics,
            total_count=len(metrics)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")

@router.post("/analytics/report", response_model=GAReportResponse)
async def generate_analytics_report(
    request: GAReportRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate comprehensive Google Analytics report"""
    try:
        credentials = await _get_valid_credentials(request.property_id, current_user.id)
        
        # Calculate date range
        if request.custom_date_start and request.custom_date_end:
            start_date = request.custom_date_start
            end_date = request.custom_date_end
        else:
            end_date = datetime.utcnow()
            if request.date_range == GATimePeriod.LAST_7_DAYS:
                start_date = end_date - timedelta(days=7)
            elif request.date_range == GATimePeriod.LAST_30_DAYS:
                start_date = end_date - timedelta(days=30)
            elif request.date_range == GATimePeriod.LAST_90_DAYS:
                start_date = end_date - timedelta(days=90)
            elif request.date_range == GATimePeriod.TODAY:
                start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            elif request.date_range == GATimePeriod.YESTERDAY:
                start_date = (end_date - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = start_date + timedelta(days=1)
        
        # Generate report based on type
        if request.report_type == "overview":
            report_data = await _generate_overview_report(credentials, request.property_id, start_date, end_date)
        elif request.report_type == "traffic_sources":
            report_data = await _generate_traffic_sources_report(credentials, request.property_id, start_date, end_date)
        elif request.report_type == "top_pages":
            report_data = await _generate_top_pages_report(credentials, request.property_id, start_date, end_date)
        elif request.report_type == "demographics":
            report_data = await _generate_demographics_report(credentials, request.property_id, start_date, end_date)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown report type: {request.report_type}")
        
        return GAReportResponse(
            property_id=request.property_id,
            report_type=request.report_type,
            data=report_data,
            date_range_start=start_date,
            date_range_end=end_date,
            generated_at=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/analytics/dashboard/{property_id}", response_model=GADashboardData)
async def get_dashboard_data(
    property_id: str,
    days: int = 7,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get comprehensive dashboard data for Google Analytics"""
    try:
        print(f"Dashboard data requested for property: {property_id}, user: {current_user.id}, days: {days}")
        
        # First, let's check if we have any credentials for this user
        db = await get_database()
        user_credentials = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not user_credentials:
            print("No analytics credentials found for user")
            raise HTTPException(status_code=404, detail="No analytics credentials found for user")
        
        print(f"Found user credentials for property: {user_credentials['property_id']}")
        
        # Use the property_id from the found credentials if the requested one doesn't exist
        credentials_for_property = await db.ga_credentials.find_one({
            "property_id": property_id,
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_for_property:
            # Use the first available credentials
            original_property_id = property_id
            property_id = user_credentials["property_id"]
            print(f"Using alternative property ID: {property_id} instead of {original_property_id}")
        else:
            print(f"Found credentials for requested property: {property_id}")
        
        credentials = await _get_valid_credentials(property_id, current_user.id)
        print(f"Credentials retrieved successfully for property: {property_id}")
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        print(f"Fetching data for date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Fetch all dashboard metrics in parallel
        dashboard_data = await _fetch_dashboard_metrics(credentials, property_id, start_date, end_date)
        print(f"Dashboard data fetched successfully: {dashboard_data}")
        
        return GADashboardData(
            property_id=property_id,
            **dashboard_data,
            date_range_start=start_date,
            date_range_end=end_date
        )
    except Exception as e:
        print(f"Error in get_dashboard_data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

# Background task for periodic data collection
@router.post("/analytics/collect-metrics")
async def trigger_metrics_collection(
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_user)
):
    """Trigger background collection of analytics metrics"""
    background_tasks.add_task(_collect_all_analytics_metrics, current_user.id)
    return {"message": "Metrics collection started"}

# Helper functions
async def _get_valid_credentials(property_id: str, user_id: str) -> Credentials:
    """Get valid Google Analytics Service Account credentials for a property"""
    db = await get_database()
    
    doc = await db.ga_credentials.find_one({
        "property_id": property_id,
        "user_id": user_id,
        "is_active": True
    })
    
    if not doc:
        raise HTTPException(status_code=404, detail="Analytics credentials not found")
    
    # Get service account JSON (now stored as plain text)
    service_account_json = doc["service_account_json"]
    
    try:
        # Parse service account info - check if already a dict
        if isinstance(service_account_json, dict):
            service_account_info = service_account_json
        else:
            service_account_info = json.loads(service_account_json)
        
        # Create credentials from service account info
        credentials = Credentials.from_service_account_info(
            service_account_info,
            scopes=ANALYTICS_SCOPES
        )
        
        return credentials
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Invalid service account credentials: {str(e)}")

async def _verify_property_access(credentials: GACredentials):
    """Verify access to Google Analytics property using Service Account"""
    try:
        # Get service account JSON (now stored as plain text)
        service_account_json = credentials.service_account_json
        
        # Parse JSON if it's a string, otherwise use as-is if it's already a dict
        if isinstance(service_account_json, str):
            service_account_info = json.loads(service_account_json)
        else:
            service_account_info = service_account_json
        
        # Create credentials from service account
        creds = Credentials.from_service_account_info(
            service_account_info,
            scopes=ANALYTICS_SCOPES
        )
        
        # Test API access
        client = BetaAnalyticsDataClient(credentials=creds)
        
        # Simple test request
        request = RunReportRequest(
            property=f"properties/{credentials.property_id}",
            metrics=[Metric(name="activeUsers")],
            date_ranges=[DateRange(start_date="7daysAgo", end_date="today")]
        )
        
        client.run_report(request=request)
        
    except Exception as e:
        raise Exception(f"Cannot access property {credentials.property_id}: {str(e)}")

def _convert_metric_type(metric_type: GAMetricType) -> str:
    """Convert internal metric type to GA4 metric name"""
    mapping = {
        GAMetricType.ACTIVE_USERS: "activeUsers",
        GAMetricType.SESSIONS: "sessions",
        GAMetricType.PAGE_VIEWS: "screenPageViews",
        GAMetricType.BOUNCE_RATE: "bounceRate",
        GAMetricType.SESSION_DURATION: "averageSessionDuration",
        GAMetricType.CONVERSIONS: "conversions",
        GAMetricType.REVENUE: "totalRevenue"
    }
    return mapping.get(metric_type, "activeUsers")

async def _generate_overview_report(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Generate overview report using Data API v1"""
    try:
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date.strftime('%Y-%m-%d'),
                end_date=end_date.strftime('%Y-%m-%d')
            )]
        )
        
        print(f"Making API request for property: {property_id}, date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        response = client.run_report(request=request)
        print(f"API response received. Row count: {len(response.rows) if response.rows else 0}")
        
        if response.rows:
            row = response.rows[0]
            result = {
                "active_users": int(row.metric_values[0].value) if row.metric_values[0].value else 0,
                "sessions": int(row.metric_values[1].value) if row.metric_values[1].value else 0,
                "page_views": int(row.metric_values[2].value) if row.metric_values[2].value else 0,
                "bounce_rate": float(row.metric_values[3].value) if row.metric_values[3].value else 0.0,
                "avg_session_duration": float(row.metric_values[4].value) if row.metric_values[4].value else 0.0
            }
            print(f"Overview report data: {result}")
            return result
        else:
            print("No data rows returned from Google Analytics API")
            return {
                "active_users": 0,
                "sessions": 0,
                "page_views": 0,
                "bounce_rate": 0.0,
                "avg_session_duration": 0.0
            }
    except Exception as e:
        print(f"Error in _generate_overview_report: {str(e)}")
        raise Exception(f"Failed to generate overview report: {str(e)}")

async def _generate_traffic_sources_report(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Generate traffic sources report using Data API v1"""
    client = BetaAnalyticsDataClient(credentials=credentials)
    
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="sessionSource")],
        metrics=[Metric(name="sessions"), Metric(name="activeUsers")],
        date_ranges=[DateRange(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )],
        limit=10
    )
    
    response = client.run_report(request=request)
    
    sources = []
    for row in response.rows:
        sources.append({
            "source": row.dimension_values[0].value,
            "sessions": int(row.metric_values[0].value),
            "users": int(row.metric_values[1].value)
        })
    
    return {"traffic_sources": sources}

async def _generate_top_pages_report(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Generate top pages report using Data API v1"""
    client = BetaAnalyticsDataClient(credentials=credentials)
    
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[Metric(name="screenPageViews"), Metric(name="activeUsers")],
        date_ranges=[DateRange(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )],
        limit=10
    )
    
    response = client.run_report(request=request)
    
    pages = []
    for row in response.rows:
        pages.append({
            "page_path": row.dimension_values[0].value,
            "page_views": int(row.metric_values[0].value),
            "users": int(row.metric_values[1].value)
        })
    
    return {"top_pages": pages}

async def _generate_demographics_report(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Generate demographics report using Data API v1"""
    client = BetaAnalyticsDataClient(credentials=credentials)
    
    # Device categories
    device_request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="deviceCategory")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )]
    )
    
    device_response = client.run_report(request=device_request)
    
    devices = []
    for row in device_response.rows:
        devices.append({
            "category": row.dimension_values[0].value,
            "users": int(row.metric_values[0].value)
        })
    
    # Countries
    country_request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="country")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )],
        limit=10
    )
    
    country_response = client.run_report(request=country_request)
    
    countries = []
    for row in country_response.rows:
        countries.append({
            "country": row.dimension_values[0].value,
            "users": int(row.metric_values[0].value)
        })
    
    return {
        "device_categories": devices,
        "countries": countries
    }

async def _fetch_dashboard_metrics(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Fetch comprehensive dashboard metrics"""
    try:
        # Run multiple reports concurrently
        overview_task = _generate_overview_report(credentials, property_id, start_date, end_date)
        traffic_task = _generate_traffic_sources_report(credentials, property_id, start_date, end_date)
        pages_task = _generate_top_pages_report(credentials, property_id, start_date, end_date)
        demographics_task = _generate_demographics_report(credentials, property_id, start_date, end_date)
        
        overview, traffic, pages, demographics = await asyncio.gather(
            overview_task, traffic_task, pages_task, demographics_task
        )
        
        return {
            **overview,
            "traffic_sources": traffic.get("traffic_sources", []),
            "top_pages": pages.get("top_pages", []),
            "device_categories": demographics.get("device_categories", []),
            "geographic_data": demographics.get("countries", [])
        }
    except Exception as e:
        raise Exception(f"Failed to fetch dashboard metrics: {str(e)}")

async def _collect_all_analytics_metrics(user_id: str):
    """Background task to collect metrics for all user's GA properties"""
    try:
        db = await get_database()
        
        # Get all active credentials for user
        cursor = db.ga_credentials.find({
            "user_id": user_id,
            "is_active": True
        })
        
        async for doc in cursor:
            try:
                credentials = await _get_valid_credentials(doc["property_id"], user_id)
                
                # Collect last 7 days of data
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=7)
                
                dashboard_data = await _fetch_dashboard_metrics(
                    credentials, doc["property_id"], start_date, end_date
                )
                
                # Store all metrics in database with proper categorization
                await _store_comprehensive_metrics(
                    db, doc["property_id"], dashboard_data, start_date, end_date, user_id
                )
                
            except Exception as e:
                print(f"Failed to collect metrics for property {doc['property_id']}: {str(e)}")
                continue
                
    except Exception as e:
        print(f"Failed to collect analytics metrics for user {user_id}: {str(e)}")

async def _store_comprehensive_metrics(db, property_id: str, dashboard_data: dict, start_date: datetime, end_date: datetime, user_id: str):
    """Store all types of analytics data with proper categorization"""
    
    # Define metric type mappings
    metric_type_mapping = {
        'active_users': GAMetricType.ACTIVE_USERS,
        'sessions': GAMetricType.SESSIONS,
        'page_views': GAMetricType.PAGE_VIEWS,
        'bounce_rate': GAMetricType.BOUNCE_RATE,
        'avg_session_duration': GAMetricType.SESSION_DURATION,
        'conversions': GAMetricType.CONVERSIONS,
        'revenue': GAMetricType.REVENUE
    }
    
    # Store scalar metrics
    for metric_name, value in dashboard_data.items():
        if isinstance(value, (int, float)):
            metric_type = metric_type_mapping.get(metric_name, GAMetricType.ACTIVE_USERS)
            
            metric = GAMetric(
                property_id=property_id,
                metric_type=metric_type,
                metric_name=metric_name,
                value=float(value),
                date_range_start=start_date,
                date_range_end=end_date,
                user_id=user_id
            )
            
            await db.ga_metrics.insert_one(metric.dict(by_alias=True, exclude={"id"}))

# Google Analytics Admin API Endpoints

@router.get("/analytics/admin/accounts", response_model=List[GAAccountResponse])
async def list_ga_accounts(
    current_user: UserInDB = Depends(get_current_user)
):
    """List all Google Analytics accounts accessible by the user's credentials"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # List accounts
        request = ListAccountsRequest()
        accounts_response = admin_client.list_accounts(request=request)
        
        accounts = []
        for account in accounts_response:
            accounts.append(GAAccountResponse(
                account_id=account.name.split('/')[-1],
                name=account.name,
                display_name=account.display_name,
                region_code=account.region_code,
                create_time=account.create_time.timestamp() if account.create_time else None,
                update_time=account.update_time.timestamp() if account.update_time else None
            ))
        
        return accounts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list accounts: {str(e)}")

@router.get("/analytics/admin/accounts/{account_id}/properties", response_model=List[GAPropertyResponse])
async def list_ga_properties(
    account_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """List all properties for a specific Google Analytics account"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # List properties for the account
        request = ListPropertiesRequest(
            filter=f"parent:accounts/{account_id}"
        )
        properties_response = admin_client.list_properties(request=request)
        
        properties = []
        for prop in properties_response:
            properties.append(GAPropertyResponse(
                property_id=prop.name.split('/')[-1],
                name=prop.name,
                display_name=prop.display_name,
                parent_account=prop.parent,
                time_zone=prop.time_zone,
                currency_code=prop.currency_code,
                industry_category=prop.industry_category,
                create_time=prop.create_time.timestamp() if prop.create_time else None,
                update_time=prop.update_time.timestamp() if prop.update_time else None
            ))
        
        return properties
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list properties: {str(e)}")

@router.post("/analytics/admin/accounts/{account_id}/properties", response_model=GAPropertyResponse)
async def create_ga_property(
    account_id: str,
    property_data: GAPropertyCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new Google Analytics property"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # Create property
        property_obj = Property(
            display_name=property_data.display_name,
            parent=f"accounts/{account_id}",
            time_zone=property_data.time_zone,
            currency_code=property_data.currency_code,
            industry_category=property_data.industry_category
        )
        
        request = CreatePropertyRequest(
            property=property_obj
        )
        
        created_property = admin_client.create_property(request=request)
        
        return GAPropertyResponse(
            property_id=created_property.name.split('/')[-1],
            name=created_property.name,
            display_name=created_property.display_name,
            parent_account=created_property.parent,
            time_zone=created_property.time_zone,
            currency_code=created_property.currency_code,
            industry_category=created_property.industry_category,
            create_time=created_property.create_time.timestamp() if created_property.create_time else None,
            update_time=created_property.update_time.timestamp() if created_property.update_time else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create property: {str(e)}")

@router.get("/analytics/admin/properties/{property_id}/datastreams", response_model=List[GADataStreamResponse])
async def list_ga_data_streams(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """List all data streams for a specific Google Analytics property"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # List data streams for the property
        request = ListDataStreamsRequest(
            parent=f"properties/{property_id}"
        )
        streams_response = admin_client.list_data_streams(request=request)
        
        streams = []
        for stream in streams_response:
            stream_data = {
                "stream_id": stream.name.split('/')[-1],
                "name": stream.name,
                "display_name": stream.display_name,
                "type": str(stream.type_),
                "property_id": property_id,
                "create_time": stream.create_time.timestamp() if stream.create_time else None,
                "update_time": stream.update_time.timestamp() if stream.update_time else None
            }
            
            # Add type-specific data
            if hasattr(stream, 'web_stream_data') and stream.web_stream_data:
                stream_data["web_stream_data"] = {
                    "measurement_id": stream.web_stream_data.measurement_id,
                    "firebase_app_id": stream.web_stream_data.firebase_app_id,
                    "default_uri": stream.web_stream_data.default_uri
                }
            
            streams.append(GADataStreamResponse(**stream_data))
        
        return streams
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list data streams: {str(e)}")

@router.post("/analytics/admin/properties/{property_id}/datastreams", response_model=GADataStreamResponse)
async def create_ga_data_stream(
    property_id: str,
    stream_data: GADataStreamCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new data stream for a Google Analytics property"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # Create data stream object based on type
        stream_obj = DataStream(
            display_name=stream_data.display_name,
            type_=stream_data.type
        )
        
        # Add type-specific data
        if stream_data.type == "WEB_DATA_STREAM" and stream_data.web_stream_data:
            from google.analytics.admin_v1beta.types import DataStream
            stream_obj.web_stream_data = DataStream.WebStreamData(
                measurement_id=stream_data.web_stream_data.get("measurement_id", ""),
                firebase_app_id=stream_data.web_stream_data.get("firebase_app_id", ""),
                default_uri=stream_data.web_stream_data.get("default_uri", "")
            )
        
        request = CreateDataStreamRequest(
            parent=f"properties/{property_id}",
            data_stream=stream_obj
        )
        
        created_stream = admin_client.create_data_stream(request=request)
        
        response_data = {
            "stream_id": created_stream.name.split('/')[-1],
            "name": created_stream.name,
            "display_name": created_stream.display_name,
            "type": str(created_stream.type_),
            "property_id": property_id,
            "create_time": created_stream.create_time.timestamp() if created_stream.create_time else None,
            "update_time": created_stream.update_time.timestamp() if created_stream.update_time else None
        }
        
        # Add type-specific data to response
        if hasattr(created_stream, 'web_stream_data') and created_stream.web_stream_data:
            response_data["web_stream_data"] = {
                "measurement_id": created_stream.web_stream_data.measurement_id,
                "firebase_app_id": created_stream.web_stream_data.firebase_app_id,
                "default_uri": created_stream.web_stream_data.default_uri
            }
        
        return GADataStreamResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create data stream: {str(e)}")

@router.delete("/analytics/admin/properties/{property_id}")
async def delete_ga_property(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a Google Analytics property"""
    try:
        db = await get_database()
        
        # Get user's first active credentials to access Admin API
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            raise HTTPException(status_code=404, detail="No Analytics credentials found")
        
        credentials = await _get_valid_credentials(credentials_doc["property_id"], current_user.id)
        
        # Initialize Admin API client
        admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        
        # Delete property
        request = DeletePropertyRequest(
            name=f"properties/{property_id}"
        )
        
        admin_client.delete_property(request=request)
        
        return {"message": f"Property {property_id} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete property: {str(e)}")

@router.get("/analytics/realtime/{property_id}")
async def get_realtime_metrics(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get real-time Google Analytics metrics"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Real-time request for active users
        request = RunRealtimeReportRequest(
             property=f"properties/{property_id}",
             metrics=[
                 Metric(name="activeUsers"),
                 Metric(name="screenPageViews"),
                 Metric(name="eventCount")
             ],
             dimensions=[
                 Dimension(name="country"),
                 Dimension(name="deviceCategory")
             ]
         )
        
        response = client.run_realtime_report(request=request)
        
        # Process real-time data
        realtime_data = {
            "active_users": 0,
            "page_views": 0,
            "events": 0,
            "countries": [],
            "devices": []
        }
        
        for row in response.rows:
            active_users = int(row.metric_values[0].value)
            page_views = int(row.metric_values[1].value)
            events = int(row.metric_values[2].value)
            
            country = row.dimension_values[0].value
            device = row.dimension_values[1].value
            
            realtime_data["active_users"] += active_users
            realtime_data["page_views"] += page_views
            realtime_data["events"] += events
            
            # Add country data
            country_found = False
            for c in realtime_data["countries"]:
                if c["country"] == country:
                    c["users"] += active_users
                    country_found = True
                    break
            if not country_found:
                realtime_data["countries"].append({
                    "country": country,
                    "users": active_users
                })
            
            # Add device data
            device_found = False
            for d in realtime_data["devices"]:
                if d["device"] == device:
                    d["users"] += active_users
                    device_found = True
                    break
            if not device_found:
                realtime_data["devices"].append({
                    "device": device,
                    "users": active_users
                })
        
        # Sort by users descending
        realtime_data["countries"].sort(key=lambda x: x["users"], reverse=True)
        realtime_data["devices"].sort(key=lambda x: x["users"], reverse=True)
        
        return {
            "property_id": property_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": realtime_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get real-time metrics: {str(e)}")

@router.get("/analytics/realtime/{property_id}/pages")
async def get_realtime_pages(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get real-time page views data"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Real-time request for page views
        request = RunRealtimeReportRequest(
            property=f"properties/{property_id}",
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="screenPageViews")
            ],
            dimensions=[
            Dimension(name="unifiedPagePathPlusQueryString"),
            Dimension(name="unifiedPageScreen")
        ],
            limit=10
        )
        
        response = client.run_realtime_report(request=request)
        
        pages = []
        for row in response.rows:
            pages.append({
                "page_path": row.dimension_values[0].value,
                "page_title": row.dimension_values[1].value,
                "active_users": int(row.metric_values[0].value),
                "page_views": int(row.metric_values[1].value)
            })
        
        # Sort by active users descending
        pages.sort(key=lambda x: x["active_users"], reverse=True)
        
        return {
            "property_id": property_id,
            "timestamp": datetime.utcnow().isoformat(),
            "pages": pages
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get real-time pages: {str(e)}")

@router.get("/analytics/realtime/{property_id}/events")
async def get_realtime_events(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get real-time events data"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Real-time request for events
        request = RunRealtimeReportRequest(
            property=f"properties/{property_id}",
            metrics=[
                Metric(name="eventCount")
            ],
            dimensions=[
                Dimension(name="eventName"),
                Dimension(name="pagePath")
            ],
            limit=20
        )
        
        response = client.run_realtime_report(request=request)
        
        events = []
        for row in response.rows:
            events.append({
                "event_name": row.dimension_values[0].value,
                "page_path": row.dimension_values[1].value,
                "event_count": int(row.metric_values[0].value)
            })
        
        # Sort by event count descending
        events.sort(key=lambda x: x["event_count"], reverse=True)
        
        return {
            "property_id": property_id,
            "timestamp": datetime.utcnow().isoformat(),
            "events": events
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get real-time events: {str(e)}")
    
    # Store traffic sources data
    if 'traffic_sources' in dashboard_data and isinstance(dashboard_data['traffic_sources'], list):
        for i, source in enumerate(dashboard_data['traffic_sources']):
            if isinstance(source, dict) and 'sessions' in source:
                metric = GAMetric(
                    property_id=property_id,
                    metric_type=GAMetricType.TRAFFIC_SOURCE,
                    metric_name=f"traffic_source_{i+1}",
                    value=float(source.get('sessions', 0)),
                    dimensions={
                        'source': source.get('source', 'unknown'),
                        'medium': source.get('medium', 'unknown'),
                        'campaign': source.get('campaign', '(not set)')
                    },
                    date_range_start=start_date,
                    date_range_end=end_date
                )
                
                await db.ga_metrics.insert_one(metric.dict(by_alias=True, exclude={"id"}))


@router.get("/analytics/{property_id}/pages-and-screens")
async def get_pages_and_screens_report(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 250,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get pages and screens report with page titles, views, and active users"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set default date range if not provided (last 28 days)
        if not start_date or not end_date:
            end_date_obj = datetime.utcnow().date()
            start_date_obj = end_date_obj - timedelta(days=28)
            start_date = start_date_obj.strftime("%Y-%m-%d")
            end_date = end_date_obj.strftime("%Y-%m-%d")
        
        # Build request for pages and screens data
        request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[
                Dimension(name="unifiedScreenName"),  # Page title and screen name
                Dimension(name="pagePath")  # Page path
            ],
            metrics=[
                Metric(name="screenPageViews"),  # Views
                Metric(name="activeUsers"),  # Active users
                Metric(name="averageSessionDuration"),  # Average engagement time
                Metric(name="eventCount")  # All events
            ],
            limit=limit,
            order_bys=[
                {
                    "metric": {"metric_name": "screenPageViews"},
                    "desc": True
                }
            ]
        )
        
        response = client.run_report(request=request)
        
        # Process results
        pages_data = []
        total_views = 0
        total_users = 0
        
        for row in response.rows:
            page_title = row.dimension_values[0].value if row.dimension_values[0].value else "(not set)"
            page_path = row.dimension_values[1].value if row.dimension_values[1].value else "/"
            views = int(row.metric_values[0].value) if row.metric_values[0].value else 0
            active_users = int(row.metric_values[1].value) if row.metric_values[1].value else 0
            avg_engagement = float(row.metric_values[2].value) if row.metric_values[2].value else 0.0
            events = int(row.metric_values[3].value) if row.metric_values[3].value else 0
            
            total_views += views
            total_users += active_users
            
            pages_data.append({
                "page_title": page_title,
                "page_path": page_path,
                "views": views,
                "active_users": active_users,
                "views_percentage": 0,  # Will calculate after getting totals
                "users_percentage": 0,  # Will calculate after getting totals
                "average_engagement_time": avg_engagement,
                "events": events
            })
        
        # Calculate percentages
        for page in pages_data:
            if total_views > 0:
                page["views_percentage"] = round((page["views"] / total_views) * 100, 2)
            if total_users > 0:
                page["users_percentage"] = round((page["active_users"] / total_users) * 100, 2)
        
        # Generate chart data for visualization
        chart_data = {
            "labels": [page["page_title"][:30] + "..." if len(page["page_title"]) > 30 else page["page_title"] for page in pages_data[:10]],
            "datasets": [
                {
                    "label": "Views",
                    "data": [page["views"] for page in pages_data[:10]],
                    "backgroundColor": "rgba(59, 130, 246, 0.8)",
                    "borderColor": "rgb(59, 130, 246)",
                    "borderWidth": 1
                },
                {
                    "label": "Active Users",
                    "data": [page["active_users"] for page in pages_data[:10]],
                    "backgroundColor": "rgba(16, 185, 129, 0.8)",
                    "borderColor": "rgb(16, 185, 129)",
                    "borderWidth": 1
                }
            ]
        }
        
        return {
            "property_id": property_id,
            "date_range": {
                "start_date": start_date,
                "end_date": end_date
            },
            "total_views": total_views,
            "total_active_users": total_users,
            "pages": pages_data,
            "chart_data": chart_data,
            "row_count": len(pages_data),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pages and screens report: {str(e)}")

@router.get("/analytics/{property_id}/pages-and-screens/export")
async def export_pages_and_screens_report(
    property_id: str,
    format: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Export pages and screens report in Excel, CSV, or PDF format"""
    try:
        from fastapi.responses import StreamingResponse
        import io
        import pandas as pd
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        
        # Get the data using the existing function logic
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set default date range if not provided (last 28 days)
        if not start_date or not end_date:
            end_date_obj = datetime.utcnow().date()
            start_date_obj = end_date_obj - timedelta(days=28)
            start_date = start_date_obj.strftime("%Y-%m-%d")
            end_date = end_date_obj.strftime("%Y-%m-%d")
        
        # Build request for pages and screens data
        request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            dimensions=[
                Dimension(name="unifiedScreenName"),
                Dimension(name="pagePath")
            ],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="activeUsers"),
                Metric(name="averageSessionDuration"),
                Metric(name="eventCount")
            ],
            limit=1000,  # Increase limit for export
            order_bys=[
                {
                    "metric": {"metric_name": "screenPageViews"},
                    "desc": True
                }
            ]
        )
        
        response = client.run_report(request=request)
        
        # Process results into a list of dictionaries
        export_data = []
        for i, row in enumerate(response.rows, 1):
            page_title = row.dimension_values[0].value if row.dimension_values[0].value else "(not set)"
            page_path = row.dimension_values[1].value if row.dimension_values[1].value else "/"
            views = int(row.metric_values[0].value) if row.metric_values[0].value else 0
            active_users = int(row.metric_values[1].value) if row.metric_values[1].value else 0
            avg_engagement = float(row.metric_values[2].value) if row.metric_values[2].value else 0.0
            events = int(row.metric_values[3].value) if row.metric_values[3].value else 0
            
            export_data.append({
                "#": i,
                "Page Title": page_title,
                "Page Path": page_path,
                "Views": views,
                "Users": active_users,
                "Avg. Engagement Time (s)": round(avg_engagement, 2),
                "Events": events
            })
        
        if format.lower() == 'csv':
            # CSV Export with proper Unicode handling
            df = pd.DataFrame(export_data)
            output = io.StringIO()
            df.to_csv(output, index=False, encoding='utf-8')
            output.seek(0)
            
            # Convert to BytesIO with UTF-8 BOM for better Excel compatibility
            csv_bytes = io.BytesIO()
            csv_bytes.write('\ufeff'.encode('utf-8'))  # UTF-8 BOM
            csv_bytes.write(output.getvalue().encode('utf-8'))
            csv_bytes.seek(0)
            
            return StreamingResponse(
                csv_bytes,
                media_type="text/csv; charset=utf-8",
                headers={"Content-Disposition": f"attachment; filename=pages-and-screens-{start_date}-to-{end_date}.csv"}
            )
            
        elif format.lower() == 'excel':
            # Excel Export with proper Unicode handling
            df = pd.DataFrame(export_data)
            output = io.BytesIO()
            
            # Use openpyxl engine with explicit Unicode support
            with pd.ExcelWriter(output, engine='openpyxl', options={'strings_to_urls': False}) as writer:
                df.to_excel(writer, sheet_name='Pages and Screens', index=False)
                
                # Get the workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets['Pages and Screens']
                
                # Set proper encoding and font for Unicode support
                from openpyxl.styles import Font
                unicode_font = Font(name='Arial Unicode MS', size=10)
                
                # Auto-adjust column widths and apply Unicode font
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            # Apply Unicode font to each cell
                            cell.font = unicode_font
                            if cell.value and len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename=pages-and-screens-{start_date}-to-{end_date}.xlsx"}
            )
            
        elif format.lower() == 'pdf':
            # PDF Export with proper Unicode handling
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.lib.fonts import addMapping
            import os
            
            output = io.BytesIO()
            doc = SimpleDocTemplate(output, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Register Unicode fonts (fallback to built-in if custom fonts not available)
            try:
                # Try to use system fonts for better Unicode support
                if os.path.exists('/System/Library/Fonts/Arial.ttf'):  # macOS
                    pdfmetrics.registerFont(TTFont('Arial-Unicode', '/System/Library/Fonts/Arial.ttf'))
                elif os.path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):  # Linux
                    pdfmetrics.registerFont(TTFont('Arial-Unicode', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
                else:
                    # Fallback to Helvetica for basic Latin characters
                    pdfmetrics.registerFont(TTFont('Arial-Unicode', 'Helvetica'))
                addMapping('Arial-Unicode', 0, 0, 'Arial-Unicode')
                unicode_font = 'Arial-Unicode'
            except:
                # Ultimate fallback to Helvetica
                unicode_font = 'Helvetica'
            
            # Title with Unicode support
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=30,
                alignment=1,  # Center alignment
                fontName=unicode_font
            )
            
            # Escape HTML entities and handle Unicode properly
            title_text = f"Pages and Screens Report ({start_date} to {end_date})"
            story.append(Paragraph(title_text.encode('utf-8').decode('utf-8'), title_style))
            story.append(Spacer(1, 12))
            
            # Prepare table data with Unicode handling
            table_data = [list(export_data[0].keys())]  # Headers
            for row in export_data[:50]:  # Limit to first 50 rows for PDF
                processed_row = []
                for value in row.values():
                    if isinstance(value, str):
                        # Ensure proper Unicode encoding and escape special characters
                        try:
                            processed_value = value.encode('utf-8').decode('utf-8')
                            # Replace problematic characters that might break PDF
                            processed_value = processed_value.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        except:
                            processed_value = str(value)
                        processed_row.append(processed_value)
                    else:
                        processed_row.append(str(value))
                table_data.append(processed_row)
            
            # Create table with Unicode font
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), unicode_font),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), unicode_font),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
            
            if len(export_data) > 50:
                story.append(Spacer(1, 12))
                note_style = ParagraphStyle(
                    'Note',
                    parent=styles['Normal'],
                    fontName=unicode_font
                )
                story.append(Paragraph(f"Note: Showing first 50 of {len(export_data)} total pages", note_style))
            
            doc.build(story)
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue()),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=pages-and-screens-{start_date}-to-{end_date}.pdf"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid format. Supported formats: csv, excel, pdf")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export pages and screens report: {str(e)}")

@router.get("/analytics/{property_id}/conversions")
async def get_conversion_data(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get conversion data including goals and e-commerce metrics"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set date range
        if start_date and end_date:
            date_range = DateRange(start_date=start_date, end_date=end_date)
        else:
            date_range = DateRange(start_date="7daysAgo", end_date="today")
        
        # Conversion metrics request
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="eventName"),
                Dimension(name="date")
            ],
            metrics=[
                Metric(name="conversions"),
                Metric(name="totalRevenue"),
                Metric(name="purchaseRevenue"),
                Metric(name="eventCount")
            ],
            date_ranges=[date_range],
            dimension_filter=FilterExpression(
                filter=Filter(
                    field_name="eventName",
                    in_list_filter=Filter.InListFilter(
                        values=["purchase", "sign_up", "contact", "download"]
                    )
                )
            )
        )
        
        response = client.run_report(request=request)
        
        conversions = []
        for row in response.rows:
            conversions.append({
                "event_name": row.dimension_values[0].value,
                "date": row.dimension_values[1].value,
                "conversions": int(row.metric_values[0].value or 0),
                "total_revenue": float(row.metric_values[1].value or 0),
                "purchase_revenue": float(row.metric_values[2].value or 0),
                "event_count": int(row.metric_values[3].value or 0)
            })
        
        return {
            "conversions": conversions,
            "summary": {
                "total_conversions": sum(c["conversions"] for c in conversions),
                "total_revenue": sum(c["total_revenue"] for c in conversions),
                "conversion_rate": len([c for c in conversions if c["conversions"] > 0]) / len(conversions) * 100 if conversions else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversion data: {str(e)}")

@router.get("/analytics/{property_id}/ecommerce")
async def get_ecommerce_data(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get e-commerce performance data"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set date range
        if start_date and end_date:
            date_range = DateRange(start_date=start_date, end_date=end_date)
        else:
            date_range = DateRange(start_date="30daysAgo", end_date="today")
        
        # E-commerce metrics request
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="itemName"),
                Dimension(name="itemCategory")
            ],
            metrics=[
                Metric(name="itemRevenue"),
                Metric(name="itemPurchaseQuantity"),
                Metric(name="cartToViewRate"),
                Metric(name="purchaseToViewRate")
            ],
            date_ranges=[date_range],
            limit=50
        )
        
        response = client.run_report(request=request)
        
        products = []
        for row in response.rows:
            products.append({
                "item_name": row.dimension_values[0].value,
                "item_category": row.dimension_values[1].value,
                "revenue": float(row.metric_values[0].value or 0),
                "quantity": int(row.metric_values[1].value or 0),
                "cart_to_view_rate": float(row.metric_values[2].value or 0),
                "purchase_to_view_rate": float(row.metric_values[3].value or 0)
            })
        
        return {
            "products": products,
            "summary": {
                "total_revenue": sum(p["revenue"] for p in products),
                "total_quantity": sum(p["quantity"] for p in products),
                "avg_cart_to_view_rate": sum(p["cart_to_view_rate"] for p in products) / len(products) if products else 0,
                "avg_purchase_to_view_rate": sum(p["purchase_to_view_rate"] for p in products) / len(products) if products else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch e-commerce data: {str(e)}")

@router.get("/analytics/{property_id}/custom-events")
async def get_custom_events(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_name: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get custom event tracking data"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set date range
        if start_date and end_date:
            date_range = DateRange(start_date=start_date, end_date=end_date)
        else:
            date_range = DateRange(start_date="7daysAgo", end_date="today")
        
        # Custom events request
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="eventName"),
                Dimension(name="pagePath"),
                Dimension(name="date")
            ],
            metrics=[
                Metric(name="eventCount"),
                Metric(name="eventCountPerUser"),
                Metric(name="eventValue")
            ],
            date_ranges=[date_range]
        )
        
        # Add event name filter if specified
        if event_name:
            request.dimension_filter = FilterExpression(
                filter=Filter(
                    field_name="eventName",
                    string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.EXACT,
                        value=event_name
                    )
                )
            )
        
        response = client.run_report(request=request)
        
        events = []
        for row in response.rows:
            events.append({
                "event_name": row.dimension_values[0].value,
                "page_path": row.dimension_values[1].value,
                "date": row.dimension_values[2].value,
                "event_count": int(row.metric_values[0].value or 0),
                "event_count_per_user": float(row.metric_values[1].value or 0),
                "event_value": float(row.metric_values[2].value or 0)
            })
        
        return {
            "events": events,
            "summary": {
                "total_events": sum(e["event_count"] for e in events),
                "unique_events": len(set(e["event_name"] for e in events)),
                "avg_events_per_user": sum(e["event_count_per_user"] for e in events) / len(events) if events else 0,
                "total_event_value": sum(e["event_value"] for e in events)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch custom events: {str(e)}")

# Quick Reports Endpoints
@router.get("/analytics/{property_id}/quick-reports/audience")
async def get_audience_report(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate Audience Quick Report - Demographics, interests, and user behavior"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Set default date range (last 30 days)
        if not start_date or not end_date:
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=30)
        else:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Demographics Report
        demographics_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="country"),
                Dimension(name="city"),
                Dimension(name="ageGroup"),
                Dimension(name="gender")
            ],
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="sessions"),
                Metric(name="sessionDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )]
        )
        
        # User Behavior Report
        behavior_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="deviceCategory"),
                Dimension(name="operatingSystem"),
                Dimension(name="browser")
            ],
            metrics=[
                Metric(name="activeUsers"),
                Metric(name="newUsers"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )]
        )
        
        # Execute reports
        demographics_response = client.run_report(request=demographics_request)
        behavior_response = client.run_report(request=behavior_request)
        
        # Process demographics data
        demographics_data = []
        for row in demographics_response.rows:
            demographics_data.append({
                "country": row.dimension_values[0].value,
                "city": row.dimension_values[1].value,
                "age_group": row.dimension_values[2].value,
                "gender": row.dimension_values[3].value,
                "active_users": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
                "session_duration": float(row.metric_values[2].value)
            })
        
        # Process behavior data
        behavior_data = []
        for row in behavior_response.rows:
            behavior_data.append({
                "device_category": row.dimension_values[0].value,
                "operating_system": row.dimension_values[1].value,
                "browser": row.dimension_values[2].value,
                "active_users": int(row.metric_values[0].value),
                "new_users": int(row.metric_values[1].value),
                "bounce_rate": float(row.metric_values[2].value),
                "avg_session_duration": float(row.metric_values[3].value)
            })
        
        return {
            "report_type": "audience",
            "property_id": property_id,
            "date_range": {
                "start_date": start_date_obj.strftime("%Y-%m-%d"),
                "end_date": end_date_obj.strftime("%Y-%m-%d")
            },
            "demographics": demographics_data,
            "user_behavior": behavior_data,
            "summary": {
                "total_users": sum(item["active_users"] for item in demographics_data),
                "total_sessions": sum(item["sessions"] for item in demographics_data),
                "avg_session_duration": sum(item["session_duration"] for item in demographics_data) / len(demographics_data) if demographics_data else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate audience report: {str(e)}")

@router.get("/analytics/{property_id}/quick-reports/content")
async def get_content_report(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate Content Quick Report - Page performance and content engagement"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Set default date range (last 30 days)
        if not start_date or not end_date:
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=30)
        else:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Page Performance Report
        pages_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="pagePath"),
                Dimension(name="pageTitle")
            ],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="uniquePageviews"),
                Metric(name="averageTimeOnPage"),
                Metric(name="bounceRate")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )],
            limit=50
        )
        
        # Landing Pages Report
        landing_pages_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="landingPage")
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )],
            limit=25
        )
        
        # Execute reports
        pages_response = client.run_report(request=pages_request)
        landing_pages_response = client.run_report(request=landing_pages_request)
        
        # Process page performance data
        pages_data = []
        for row in pages_response.rows:
            pages_data.append({
                "page_path": row.dimension_values[0].value,
                "page_title": row.dimension_values[1].value,
                "page_views": int(row.metric_values[0].value),
                "unique_page_views": int(row.metric_values[1].value),
                "avg_time_on_page": float(row.metric_values[2].value),
                "bounce_rate": float(row.metric_values[3].value)
            })
        
        # Process landing pages data
        landing_pages_data = []
        for row in landing_pages_response.rows:
            landing_pages_data.append({
                "landing_page": row.dimension_values[0].value,
                "sessions": int(row.metric_values[0].value),
                "bounce_rate": float(row.metric_values[1].value),
                "avg_session_duration": float(row.metric_values[2].value)
            })
        
        return {
            "report_type": "content",
            "property_id": property_id,
            "date_range": {
                "start_date": start_date_obj.strftime("%Y-%m-%d"),
                "end_date": end_date_obj.strftime("%Y-%m-%d")
            },
            "page_performance": pages_data,
            "landing_pages": landing_pages_data,
            "summary": {
                "total_page_views": sum(item["page_views"] for item in pages_data),
                "total_unique_views": sum(item["unique_page_views"] for item in pages_data),
                "avg_time_on_page": sum(item["avg_time_on_page"] for item in pages_data) / len(pages_data) if pages_data else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate content report: {str(e)}")

@router.get("/analytics/{property_id}/quick-reports/acquisition")
async def get_acquisition_report(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate Acquisition Quick Report - Traffic sources and campaign performance"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Set default date range (last 30 days)
        if not start_date or not end_date:
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=30)
        else:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Traffic Sources Report
        traffic_sources_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="sessionSource"),
                Dimension(name="sessionMedium"),
                Dimension(name="sessionCampaignName")
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="newUsers"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )],
            limit=50
        )
        
        # Channel Grouping Report
        channels_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="sessionDefaultChannelGrouping")
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="activeUsers"),
                Metric(name="conversions")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )]
        )
        
        # Execute reports
        traffic_sources_response = client.run_report(request=traffic_sources_request)
        channels_response = client.run_report(request=channels_request)
        
        # Process traffic sources data
        traffic_sources_data = []
        for row in traffic_sources_response.rows:
            traffic_sources_data.append({
                "source": row.dimension_values[0].value,
                "medium": row.dimension_values[1].value,
                "campaign": row.dimension_values[2].value,
                "sessions": int(row.metric_values[0].value),
                "new_users": int(row.metric_values[1].value),
                "bounce_rate": float(row.metric_values[2].value),
                "avg_session_duration": float(row.metric_values[3].value)
            })
        
        # Process channels data
        channels_data = []
        for row in channels_response.rows:
            channels_data.append({
                "channel": row.dimension_values[0].value,
                "sessions": int(row.metric_values[0].value),
                "active_users": int(row.metric_values[1].value),
                "conversions": int(row.metric_values[2].value)
            })
        
        return {
            "report_type": "acquisition",
            "property_id": property_id,
            "date_range": {
                "start_date": start_date_obj.strftime("%Y-%m-%d"),
                "end_date": end_date_obj.strftime("%Y-%m-%d")
            },
            "traffic_sources": traffic_sources_data,
            "channels": channels_data,
            "summary": {
                "total_sessions": sum(item["sessions"] for item in traffic_sources_data),
                "total_new_users": sum(item["new_users"] for item in traffic_sources_data),
                "avg_bounce_rate": sum(item["bounce_rate"] for item in traffic_sources_data) / len(traffic_sources_data) if traffic_sources_data else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate acquisition report: {str(e)}")

@router.get("/analytics/{property_id}/quick-reports/behavior")
async def get_behavior_report(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate Behavior Quick Report - User flow and site interaction patterns"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Set default date range (last 30 days)
        if not start_date or not end_date:
            end_date_obj = datetime.now()
            start_date_obj = end_date_obj - timedelta(days=30)
        else:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # User Flow Report
        user_flow_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="pagePath"),
                Dimension(name="eventName")
            ],
            metrics=[
                Metric(name="eventCount"),
                Metric(name="screenPageViews"),
                Metric(name="userEngagementDuration")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )],
            limit=50
        )
        
        # Site Search Report
        site_search_request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="searchTerm")
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="screenPageViews")
            ],
            date_ranges=[DateRange(
                start_date=start_date_obj.strftime("%Y-%m-%d"),
                end_date=end_date_obj.strftime("%Y-%m-%d")
            )],
            limit=25
        )
        
        # Execute reports
        user_flow_response = client.run_report(request=user_flow_request)
        site_search_response = client.run_report(request=site_search_request)
        
        # Process user flow data
        user_flow_data = []
        for row in user_flow_response.rows:
            user_flow_data.append({
                "page_path": row.dimension_values[0].value,
                "event_name": row.dimension_values[1].value,
                "event_count": int(row.metric_values[0].value),
                "page_views": int(row.metric_values[1].value),
                "engagement_duration": float(row.metric_values[2].value)
            })
        
        # Process site search data
        site_search_data = []
        for row in site_search_response.rows:
            site_search_data.append({
                "search_term": row.dimension_values[0].value,
                "sessions": int(row.metric_values[0].value),
                "page_views": int(row.metric_values[1].value)
            })
        
        return {
            "report_type": "behavior",
            "property_id": property_id,
            "date_range": {
                "start_date": start_date_obj.strftime("%Y-%m-%d"),
                "end_date": end_date_obj.strftime("%Y-%m-%d")
            },
            "user_flow": user_flow_data,
            "site_search": site_search_data,
            "summary": {
                "total_events": sum(item["event_count"] for item in user_flow_data),
                "total_page_views": sum(item["page_views"] for item in user_flow_data),
                "avg_engagement_duration": sum(item["engagement_duration"] for item in user_flow_data) / len(user_flow_data) if user_flow_data else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate behavior report: {str(e)}")


# New Data API v1 endpoints
@router.get("/analytics/{property_id}/daily-active-users")
async def get_daily_active_users(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get daily active users using Data API v1"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set default date range if not provided
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[Dimension(name="date")],
            metrics=[Metric(name="activeUsers")],
            date_ranges=[DateRange(
                start_date=start_date,
                end_date=end_date
            )],
            order_bys=[{"dimension": {"dimension_name": "date"}}]
        )
        
        response = client.run_report(request=request)
        
        daily_users = []
        for row in response.rows:
            daily_users.append({
                "date": row.dimension_values[0].value,
                "active_users": int(row.metric_values[0].value)
            })
        
        return {
            "property_id": property_id,
            "start_date": start_date,
            "end_date": end_date,
            "daily_active_users": daily_users
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get daily active users: {str(e)}")


@router.get("/analytics/{property_id}/page-views")
async def get_page_views(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get page views by page path using Data API v1"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set default date range if not provided
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
            metrics=[Metric(name="screenPageViews"), Metric(name="activeUsers")],
            date_ranges=[DateRange(
                start_date=start_date,
                end_date=end_date
            )],
            order_bys=[{"metric": {"metric_name": "screenPageViews", "desc": True}}],
            limit=limit
        )
        
        response = client.run_report(request=request)
        
        page_views = []
        for row in response.rows:
            page_views.append({
                "page_path": row.dimension_values[0].value,
                "page_title": row.dimension_values[1].value,
                "page_views": int(row.metric_values[0].value),
                "unique_users": int(row.metric_values[1].value)
            })
        
        return {
            "property_id": property_id,
            "start_date": start_date,
            "end_date": end_date,
            "page_views": page_views
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get page views: {str(e)}")


@router.get("/analytics/{property_id}/users-by-country")
async def get_users_by_country(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get users by country using Data API v1"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Set default date range if not provided
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[Dimension(name="country"), Dimension(name="countryId")],
            metrics=[Metric(name="activeUsers"), Metric(name="sessions"), Metric(name="screenPageViews")],
            date_ranges=[DateRange(
                start_date=start_date,
                end_date=end_date
            )],
            order_bys=[{"metric": {"metric_name": "activeUsers", "desc": True}}],
            limit=limit
        )
        
        response = client.run_report(request=request)
        
        countries = []
        for row in response.rows:
            countries.append({
                "country": row.dimension_values[0].value,
                "country_id": row.dimension_values[1].value,
                "active_users": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
                "page_views": int(row.metric_values[2].value)
            })
        
        return {
            "property_id": property_id,
            "start_date": start_date,
            "end_date": end_date,
            "users_by_country": countries
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users by country: {str(e)}")


@router.post("/analytics/{property_id}/batch-reports")
async def get_batch_reports(
    property_id: str,
    request_data: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate multiple reports in a single API call using batchRunReports from Data API v1"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Extract report requests from the input
        report_requests = request_data.get("reports", [])
        if not report_requests:
            raise HTTPException(status_code=400, detail="No report requests provided")
        
        # Build batch request
        batch_requests = []
        for i, report_config in enumerate(report_requests):
            # Set default date range if not provided
            start_date = report_config.get("start_date", (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%d'))
            end_date = report_config.get("end_date", datetime.utcnow().strftime('%Y-%m-%d'))
            
            # Build dimensions
            dimensions = [Dimension(name=dim) for dim in report_config.get("dimensions", [])]
            
            # Build metrics
            metrics = [Metric(name=metric) for metric in report_config.get("metrics", [])]
            
            # Build order by
            order_bys = []
            for order in report_config.get("order_bys", []):
                if "dimension" in order:
                    order_bys.append({"dimension": {"dimension_name": order["dimension"]}})
                elif "metric" in order:
                    order_bys.append({"metric": {"metric_name": order["metric"], "desc": order.get("desc", False)}})
            
            batch_request = RunReportRequest(
                property=f"properties/{property_id}",
                dimensions=dimensions,
                metrics=metrics,
                date_ranges=[DateRange(
                    start_date=start_date,
                    end_date=end_date
                )],
                order_bys=order_bys,
                limit=report_config.get("limit", 100)
            )
            batch_requests.append(batch_request)
        
        # Execute batch request
        batch_request_obj = BatchRunReportsRequest(
            property=f"properties/{property_id}",
            requests=batch_requests
        )
        
        batch_response = client.batch_run_reports(request=batch_request_obj)
        
        # Process results
        results = []
        for i, response in enumerate(batch_response.reports):
            report_name = report_requests[i].get("name", f"report_{i}")
            
            rows_data = []
            for row in response.rows:
                row_data = {
                    "dimensions": [dim_val.value for dim_val in row.dimension_values],
                    "metrics": [metric_val.value for metric_val in row.metric_values]
                }
                rows_data.append(row_data)
            
            results.append({
                "name": report_name,
                "dimension_headers": [header.name for header in response.dimension_headers],
                "metric_headers": [header.name for header in response.metric_headers],
                "rows": rows_data,
                "row_count": response.row_count
            })
        
        return {
            "property_id": property_id,
            "reports": results,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate batch reports: {str(e)}")


@router.get("/analytics/{property_id}/realtime-report")
async def get_realtime_report(
    property_id: str,
    metrics: Optional[str] = "activeUsers,screenPageViews",
    dimensions: Optional[str] = None,
    limit: int = 10,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get real-time analytics data (last 30-60 minutes) using runRealtimeReport from Data API v1"""
    try:
        credentials = await _get_valid_credentials(property_id, current_user.id)
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        # Parse metrics
        metric_list = [Metric(name=metric.strip()) for metric in metrics.split(",") if metric.strip()]
        
        # Parse dimensions if provided
        dimension_list = []
        if dimensions:
            dimension_list = [Dimension(name=dim.strip()) for dim in dimensions.split(",") if dim.strip()]
        
        # Build realtime request
        request = RunRealtimeReportRequest(
            property=f"properties/{property_id}",
            dimensions=dimension_list,
            metrics=metric_list,
            limit=limit
        )
        
        response = client.run_realtime_report(request=request)
        
        # Process results
        rows_data = []
        for row in response.rows:
            row_data = {
                "dimensions": [dim_val.value for dim_val in row.dimension_values] if row.dimension_values else [],
                "metrics": [metric_val.value for metric_val in row.metric_values]
            }
            rows_data.append(row_data)
        
        return {
            "property_id": property_id,
            "dimension_headers": [header.name for header in response.dimension_headers],
            "metric_headers": [header.name for header in response.metric_headers],
            "rows": rows_data,
            "row_count": response.row_count,
            "generated_at": datetime.utcnow().isoformat(),
            "data_freshness": "Real-time (last 30-60 minutes)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get realtime report: {str(e)}")


@router.post("/analytics/timeseries", response_model=GATimeSeriesResponse)
async def get_timeseries_data(
    request: GATimeSeriesRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get time series analytics data"""
    try:
        db = await get_database()
        
        # Get user's GA credentials for the specific property
        credentials_doc = await db.ga_credentials.find_one({
            "user_id": current_user.id,
            "property_id": request.property_id
        })
        if not credentials_doc:
            raise HTTPException(status_code=404, detail=f"Google Analytics credentials not found for property {request.property_id}")
        
        # Convert ObjectId to string for Pydantic validation
        if "_id" in credentials_doc:
            credentials_doc["_id"] = str(credentials_doc["_id"])
        credentials = GACredentials(**credentials_doc)
        
        # Get service account JSON (now stored as plain text)
        service_account_json = credentials.service_account_json
        
        # Initialize GA Data API client
        from google.oauth2 import service_account
        service_account_info = json.loads(service_account_json) if isinstance(service_account_json, str) else service_account_json
        client_credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
        client = BetaAnalyticsDataClient(credentials=client_credentials)
        
        # Prepare date range
        date_ranges = [DateRange(
            start_date=request.start_date.strftime("%Y-%m-%d"),
            end_date=request.end_date.strftime("%Y-%m-%d")
        )]
        
        # Prepare dimensions
        dimensions = [Dimension(name="date")]  # Always include date for time series
        if request.dimensions:
            dimensions.extend([Dimension(name=dim) for dim in request.dimensions])
        
        # Prepare metrics
        metrics = [Metric(name=metric_name) for metric_name in request.metric_names]
        
        # Create GA request
        ga_request = RunReportRequest(
            property=f"properties/{request.property_id}",
            date_ranges=date_ranges,
            dimensions=dimensions,
            metrics=metrics,
            limit=request.limit
        )
        
        # Execute request
        response = client.run_report(ga_request)
        
        # Process response into time series format
        time_series_metrics = []
        
        for i, metric_name in enumerate(request.metric_names):
            data_points = []
            
            for row in response.rows:
                # Extract date (first dimension)
                date_str = row.dimension_values[0].value
                timestamp = datetime.strptime(date_str, "%Y%m%d")
                
                # Extract metric value
                metric_value = float(row.metric_values[i].value)
                
                # Extract additional dimensions if any
                dimensions_data = {}
                if len(row.dimension_values) > 1:
                    for j, dim_name in enumerate(request.dimensions or []):
                        dimensions_data[dim_name] = row.dimension_values[j + 1].value
                
                data_point = GATimeSeriesDataPoint(
                    timestamp=timestamp,
                    value=metric_value,
                    formatted_value=row.metric_values[i].value,
                    dimensions=dimensions_data if dimensions_data else None
                )
                data_points.append(data_point)
            
            # Sort data points by timestamp
            data_points.sort(key=lambda x: x.timestamp)
            
            time_series_metric = GATimeSeriesMetric(
                metric_name=metric_name,
                metric_type="standard",
                data_points=data_points,
                interval=request.interval,
                start_date=request.start_date,
                end_date=request.end_date,
                total_data_points=len(data_points)
            )
            time_series_metrics.append(time_series_metric)
        
        # Create time series data object
        time_series_data = GATimeSeriesData(
            property_id=request.property_id,
            user_id=current_user.id,
            metrics=time_series_metrics,
            interval=request.interval,
            date_range_start=request.start_date,
            date_range_end=request.end_date,
            dimensions=request.dimensions,
            filters=request.filters
        )
        
        # Store in database
        time_series_dict = time_series_data.dict(by_alias=True)
        await db.ga_timeseries_data.insert_one(time_series_dict)
        
        # Create summary
        summary = {
            "total_metrics": len(time_series_metrics),
            "date_range": {
                "start": request.start_date.isoformat(),
                "end": request.end_date.isoformat()
            },
            "interval": request.interval.value,
            "total_data_points": sum(metric.total_data_points for metric in time_series_metrics)
        }
        
        # Create query info
        query_info = {
            "property_id": request.property_id,
            "metrics_requested": request.metric_names,
            "dimensions_requested": request.dimensions,
            "filters_applied": request.filters,
            "limit": request.limit,
            "executed_at": datetime.utcnow().isoformat()
        }
        
        return GATimeSeriesResponse(
            property_id=request.property_id,
            time_series_data=time_series_data,
            summary=summary,
            query_info=query_info
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error fetching time series data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch time series data: {str(e)}")


@router.get("/analytics/debug/{property_id}")
async def debug_analytics_connection(
    property_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Debug endpoint to troubleshoot Google Analytics connection and data issues"""
    try:
        debug_info = {
            "property_id": property_id,
            "user_id": current_user.id,
            "steps": [],
            "errors": [],
            "success": False
        }
        
        # Step 1: Check if credentials exist
        debug_info["steps"].append("Checking credentials existence")
        db = await get_database()
        credentials_doc = await db.ga_credentials.find_one({
            "property_id": property_id,
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not credentials_doc:
            debug_info["errors"].append("No active credentials found for this property")
            return debug_info
        
        debug_info["steps"].append("Credentials found in database")
        
        # Step 2: Validate service account JSON (encryption removed)
        debug_info["steps"].append("Parsing service account JSON")
        try:
            service_account_info = json.loads(credentials_doc["service_account_json"])
            debug_info["steps"].append("Service account JSON parsed successfully")
            debug_info["service_account_info"] = {
                "project_id": service_account_info.get("project_id"),
                "client_email": service_account_info.get("client_email"),
                "has_private_key": "private_key" in service_account_info
            }
        except Exception as e:
            debug_info["errors"].append(f"Failed to decrypt/parse service account JSON: {str(e)}")
            return debug_info
        
        # Step 3: Create credentials object
        debug_info["steps"].append("Creating Google credentials object")
        try:
            credentials = Credentials.from_service_account_info(
                service_account_info,
                scopes=ANALYTICS_SCOPES
            )
            debug_info["steps"].append("Google credentials created successfully")
        except Exception as e:
            debug_info["errors"].append(f"Failed to create credentials: {str(e)}")
            return debug_info
        
        # Step 4: Test API connection with simple request
        debug_info["steps"].append("Testing API connection")
        try:
            client = BetaAnalyticsDataClient(credentials=credentials)
            
            # Simple test request for last 7 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                metrics=[Metric(name="activeUsers")],
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )]
            )
            
            response = client.run_report(request=request)
            debug_info["steps"].append("API request successful")
            debug_info["api_response"] = {
                "row_count": len(response.rows) if response.rows else 0,
                "has_data": bool(response.rows),
                "date_range": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            }
            
            if response.rows:
                debug_info["sample_data"] = {
                    "active_users": response.rows[0].metric_values[0].value
                }
            
        except Exception as e:
            debug_info["errors"].append(f"API request failed: {str(e)}")
            return debug_info
        
        debug_info["success"] = True
        debug_info["steps"].append("All tests passed successfully")
        
        return debug_info
        
    except Exception as e:
        return {
            "property_id": property_id,
            "user_id": current_user.id,
            "steps": [],
            "errors": [f"Debug endpoint error: {str(e)}"],
            "success": False
        }

@router.get("/analytics/{property_id}/reports")
async def get_unified_reports(
    property_id: str,
    range: Optional[str] = "7d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get unified analytics reports with proper date filtering"""
    try:
        # Parse date range parameter
        if not start_date or not end_date:
            end_date_obj = datetime.now()
            if range == "1d":
                start_date_obj = end_date_obj - timedelta(days=1)
            elif range == "7d":
                start_date_obj = end_date_obj - timedelta(days=7)
            elif range == "30d":
                start_date_obj = end_date_obj - timedelta(days=30)
            elif range == "90d":
                start_date_obj = end_date_obj - timedelta(days=90)
            else:
                start_date_obj = end_date_obj - timedelta(days=7)  # default
        else:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
        
        start_date_str = start_date_obj.strftime("%Y-%m-%d")
        end_date_str = end_date_obj.strftime("%Y-%m-%d")
        
        # Get credentials for the property
        credentials = await _get_valid_credentials(property_id, current_user.id)
        
        # Fetch all report types using internal helper functions
        audience_data = await _fetch_audience_data(credentials, property_id, start_date_obj, end_date_obj)
        content_data = await _fetch_content_data(credentials, property_id, start_date_obj, end_date_obj)
        acquisition_data = await _fetch_acquisition_data(credentials, property_id, start_date_obj, end_date_obj)
        behavior_data = await _fetch_behavior_data(credentials, property_id, start_date_obj, end_date_obj)
        
        # Transform data to match frontend expectations
        unified_data = {
            "audience": {
                "total_users": audience_data.get("total_users", 0),
                "new_users": audience_data.get("new_users", 0),
                "returning_users": audience_data.get("returning_users", 0),
                "sessions": audience_data.get("sessions", 0),
                "bounce_rate": audience_data.get("bounce_rate", 0),
                "avg_session_duration": audience_data.get("avg_session_duration", "0s"),
                "pages_per_session": audience_data.get("pages_per_session", 0)
            },
            "content": {
                "top_pages": content_data.get("top_pages", [])[:5],
                "total_page_views": content_data.get("total_page_views", 0),
                "unique_page_views": content_data.get("unique_page_views", 0)
            },
            "acquisition": {
                "traffic_sources": acquisition_data.get("traffic_sources", [])[:5],
                "total_sessions": acquisition_data.get("total_sessions", 0)
            },
            "behavior": {
                "events": behavior_data.get("events", [])[:5],
                "total_events": behavior_data.get("total_events", 0)
            }
        }
        
        return unified_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch unified reports: {str(e)}")

async def _fetch_audience_data(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Internal helper to fetch audience data"""
    try:
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="newVsReturning"),
            ],
            metrics=[
                Metric(name="totalUsers"),
                Metric(name="sessions"),
                Metric(name="bounceRate"),
                Metric(name="averageSessionDuration"),
                Metric(name="screenPageViewsPerSession")
            ],
            date_ranges=[DateRange(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d")
            )]
        )
        
        response = client.run_report(request)
        
        total_users = 0
        new_users = 0
        returning_users = 0
        sessions = 0
        bounce_rate = 0
        avg_session_duration = "0s"
        pages_per_session = 0
        
        for row in response.rows:
            user_type = row.dimension_values[0].value
            users = int(row.metric_values[0].value)
            user_sessions = int(row.metric_values[1].value)
            
            total_users += users
            sessions += user_sessions
            
            if user_type == "new":
                new_users = users
            else:
                returning_users = users
        
        if response.rows:
            bounce_rate = float(response.rows[0].metric_values[2].value)
            avg_duration_seconds = float(response.rows[0].metric_values[3].value)
            pages_per_session = float(response.rows[0].metric_values[4].value)
            
            # Convert duration to readable format
            minutes = int(avg_duration_seconds // 60)
            seconds = int(avg_duration_seconds % 60)
            avg_session_duration = f"{minutes}m {seconds}s"
        
        return {
            "total_users": total_users,
            "new_users": new_users,
            "returning_users": returning_users,
            "sessions": sessions,
            "bounce_rate": bounce_rate,
            "avg_session_duration": avg_session_duration,
            "pages_per_session": pages_per_session
        }
        
    except Exception as e:
        return {
            "total_users": 0,
            "new_users": 0,
            "returning_users": 0,
            "sessions": 0,
            "bounce_rate": 0,
            "avg_session_duration": "0s",
            "pages_per_session": 0
        }

async def _fetch_content_data(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Internal helper to fetch content data"""
    try:
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="pagePath"),
                Dimension(name="pageTitle")
            ],
            metrics=[
            Metric(name="screenPageViews"),
            Metric(name="uniquePageViews"),
            Metric(name="averageTimeOnPage"),
            Metric(name="bounceRate")
        ],
            date_ranges=[DateRange(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d")
            )],
            limit=10
        )
        
        response = client.run_report(request)
        
        top_pages = []
        total_page_views = 0
        unique_page_views = 0
        
        for row in response.rows:
            page_path = row.dimension_values[0].value
            page_title = row.dimension_values[1].value
            page_views = int(row.metric_values[0].value)  # screenPageViews metric
            unique_views = int(row.metric_values[1].value)  # uniquePageViews metric
            avg_time = float(row.metric_values[2].value)
            bounce_rate = float(row.metric_values[3].value)
            
            total_page_views += page_views
            unique_page_views += unique_views
            
            # Convert time to readable format
            minutes = int(avg_time // 60)
            seconds = int(avg_time % 60)
            avg_time_str = f"{minutes}m {seconds}s"
            
            top_pages.append({
                "page_path": page_path,
                "page_title": page_title,
                "page_views": page_views,
                "unique_page_views": unique_views,
                "avg_time_on_page": avg_time_str,
                "bounce_rate": bounce_rate
            })
        
        return {
            "top_pages": top_pages,
            "total_page_views": total_page_views,
            "unique_page_views": unique_page_views
        }
        
    except Exception as e:
        return {
            "top_pages": [],
            "total_page_views": 0,
            "unique_page_views": 0
        }

async def _fetch_acquisition_data(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Internal helper to fetch acquisition data"""
    try:
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="sessionSource")
            ],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="bounceRate")
            ],
            date_ranges=[DateRange(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d")
            )],
            limit=10
        )
        
        response = client.run_report(request)
        
        traffic_sources = []
        total_sessions = 0
        
        for row in response.rows:
            source = row.dimension_values[0].value
            sessions = int(row.metric_values[0].value)
            users = int(row.metric_values[1].value)
            bounce_rate = float(row.metric_values[2].value)
            
            total_sessions += sessions
            
            traffic_sources.append({
                "source": source,
                "sessions": sessions,
                "users": users,
                "bounce_rate": bounce_rate
            })
        
        return {
            "traffic_sources": traffic_sources,
            "total_sessions": total_sessions
        }
        
    except Exception as e:
        return {
            "traffic_sources": [],
            "total_sessions": 0
        }

async def _fetch_behavior_data(credentials: Credentials, property_id: str, start_date: datetime, end_date: datetime) -> dict:
    """Internal helper to fetch behavior data"""
    try:
        client = BetaAnalyticsDataClient(credentials=credentials)
        
        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[
                Dimension(name="eventName")
            ],
            metrics=[
                Metric(name="eventCount"),
                Metric(name="totalUsers")
            ],
            date_ranges=[DateRange(
                start_date=start_date.strftime("%Y-%m-%d"),
                end_date=end_date.strftime("%Y-%m-%d")
            )],
            limit=10
        )
        
        response = client.run_report(request)
        
        events = []
        total_events = 0
        
        for row in response.rows:
            event_name = row.dimension_values[0].value
            event_count = int(row.metric_values[0].value)
            unique_users = int(row.metric_values[1].value)
            
            total_events += event_count
            
            events.append({
                "event_name": event_name,
                "event_count": event_count,
                "unique_users": unique_users
            })
        
        return {
            "events": events,
            "total_events": total_events
        }
        
    except Exception as e:
        return {
            "events": [],
            "total_events": 0
        }

@router.get("/analytics/timeseries/{property_id}", response_model=List[GATimeSeriesData])
async def get_stored_timeseries_data(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interval: Optional[GATimeSeriesInterval] = None,
    metric_names: Optional[str] = None,
    limit: int = 100,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get stored time series data from database"""
    try:
        db = await get_database()
        
        # Build query filter
        query_filter = {
            "property_id": property_id,
            "user_id": current_user.id
        }
        
        # Add date range filter if provided
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query_filter["date_range_start"] = date_filter
        
        # Add interval filter if provided
        if interval:
            query_filter["interval"] = interval.value
        
        # Add metric names filter if provided
        if metric_names:
            metric_list = [name.strip() for name in metric_names.split(',')]
            query_filter["metrics.metric_name"] = {"$in": metric_list}
        
        # Query database
        cursor = db.ga_timeseries_data.find(query_filter).sort("collected_at", -1).limit(limit)
        time_series_list = await cursor.to_list(length=limit)
        
        # Convert to response models
        result = []
        for ts_data in time_series_list:
            # Convert ObjectId to string
            if "_id" in ts_data:
                ts_data["_id"] = str(ts_data["_id"])
            
            result.append(GATimeSeriesData(**ts_data))
        
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error retrieving stored time series data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve time series data: {str(e)}")
    
    # Store top pages data
    if 'top_pages' in dashboard_data and isinstance(dashboard_data['top_pages'], list):
        for i, page in enumerate(dashboard_data['top_pages']):
            if isinstance(page, dict) and 'page_views' in page:
                metric = GAMetric(
                    property_id=property_id,
                    metric_type=GAMetricType.TOP_PAGES,
                    metric_name=f"top_page_{i+1}",
                    value=float(page.get('page_views', 0)),
                    dimensions={
                        'page_path': page.get('page_path', '/'),
                        'page_title': page.get('page_title', 'Unknown')
                    },
                    date_range_start=start_date,
                    date_range_end=end_date
                )
                
                await db.ga_metrics.insert_one(metric.dict(by_alias=True, exclude={"id"}))
    
    # Store device categories data
    if 'device_categories' in dashboard_data and isinstance(dashboard_data['device_categories'], list):
        for i, device in enumerate(dashboard_data['device_categories']):
            if isinstance(device, dict) and 'sessions' in device:
                metric = GAMetric(
                    property_id=property_id,
                    metric_type=GAMetricType.DEVICE_CATEGORY,
                    metric_name=f"device_category_{i+1}",
                    value=float(device.get('sessions', 0)),
                    dimensions={
                        'device_category': device.get('device_category', 'unknown')
                    },
                    date_range_start=start_date,
                    date_range_end=end_date
                )
                
                await db.ga_metrics.insert_one(metric.dict(by_alias=True, exclude={"id"}))
    
    # Store geographic data
    if 'geographic_data' in dashboard_data and isinstance(dashboard_data['geographic_data'], list):
        for i, geo in enumerate(dashboard_data['geographic_data']):
            if isinstance(geo, dict) and 'sessions' in geo:
                metric = GAMetric(
                    property_id=property_id,
                    metric_type=GAMetricType.GEOGRAPHIC,
                    metric_name=f"geographic_{i+1}",
                    value=float(geo.get('sessions', 0)),
                    dimensions={
                        'country': geo.get('country', 'unknown'),
                        'country_code': geo.get('country_code', 'XX')
                    },
                    date_range_start=start_date,
                    date_range_end=end_date
                )
                
                await db.ga_metrics.insert_one(metric.dict(by_alias=True, exclude={"id"}))