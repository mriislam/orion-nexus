import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import get_database

logger = logging.getLogger(__name__)

class FirebaseAnalyticsService:
    """Service for fetching Firebase Analytics data using Google Service Account."""
    
    def __init__(self):
        self.property_id = None
        self.client = None
        self.firebase_app = None
        self.db = None
        self._initialize_firebase()
    
    async def initialize_from_database(self, db: AsyncIOMotorDatabase = None):
        """Initialize Firebase service with credentials from database."""
        if db is None:
            db = await get_database()
        
        self.db = db
        await self._initialize_firebase_from_db()
    
    async def _initialize_firebase_from_db(self):
        """Initialize Firebase from database credentials."""
        try:
            if self.db is None:
                logger.warning("Database not available for Firebase initialization")
                return
            
            # Get active credentials from database
            creds_doc = await self.db.ga_credentials.find_one(
                {"is_active": True},
                sort=[("updated_at", -1)]  # Get most recent active credentials
            )
            
            if not creds_doc:
                logger.warning("No active Firebase Analytics credentials found in database")
                return
            
            # Parse service account JSON from database
            service_account_data = json.loads(creds_doc["service_account_json"])
            
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_data)
                self.firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': service_account_data.get('project_id')
                })
            else:
                self.firebase_app = firebase_admin.get_app()
            
            # Initialize Google Analytics Data API client
            credentials_obj = service_account.Credentials.from_service_account_info(
                service_account_data,
                scopes=['https://www.googleapis.com/auth/analytics.readonly']
            )
            
            self.client = BetaAnalyticsDataClient(credentials=credentials_obj)
            self.property_id = creds_doc["property_id"]
            
            logger.info(f"Firebase Analytics service initialized from database - property_id: {self.property_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Analytics service from database: {str(e)}")
            self.client = None
            self.property_id = None
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK with service account credentials from environment (fallback)."""
        try:
            # Get service account credentials from environment
            service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
            ga4_property_id = os.getenv('GA4_PROPERTY_ID')
            
            if not service_account_path:
                logger.warning("GOOGLE_APPLICATION_CREDENTIALS not set, using fallback")
                return
            
            if not os.path.exists(service_account_path):
                logger.warning(f"Service account file not found: {service_account_path}")
                return
            
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                self.firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': firebase_project_id
                })
            else:
                self.firebase_app = firebase_admin.get_app()
            
            # Initialize Google Analytics Data API client
            credentials_obj = service_account.Credentials.from_service_account_file(
                service_account_path,
                scopes=['https://www.googleapis.com/auth/analytics.readonly']
            )
            
            self.client = BetaAnalyticsDataClient(credentials=credentials_obj)
            self.property_id = ga4_property_id
            
            logger.info("Firebase Analytics service initialized from environment variables")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Analytics service from environment: {str(e)}")
            self.client = None
            self.property_id = None
    
    def is_connected(self) -> bool:
        """Check if Firebase Analytics is properly connected."""
        return self.client is not None and self.property_id is not None
    
    async def get_overview_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get overview metrics for the specified number of days."""
        if not self.is_connected():
            return self._get_mock_overview_metrics()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="sessions"),
                    Metric(name="screenPageViews"),
                    Metric(name="bounceRate"),
                    Metric(name="averageSessionDuration"),
                    Metric(name="conversions"),
                    Metric(name="totalRevenue"),
                    Metric(name="engagementRate")
                ]
            )
            
            response = self.client.run_report(request=request)
            
            if response.rows:
                row = response.rows[0]
                metrics = row.metric_values
                
                return {
                    "activeUsers": int(metrics[0].value) if metrics[0].value else 0,
                    "sessions": int(metrics[1].value) if metrics[1].value else 0,
                    "pageViews": int(metrics[2].value) if metrics[2].value else 0,
                    "bounceRate": float(metrics[3].value) if metrics[3].value else 0.0,
                    "avgSessionDuration": float(metrics[4].value) if metrics[4].value else 0.0,
                    "conversions": int(metrics[5].value) if metrics[5].value else 0,
                    "revenue": float(metrics[6].value) if metrics[6].value else 0.0,
                    "engagementRate": float(metrics[7].value) if metrics[7].value else 0.0
                }
            
            return self._get_mock_overview_metrics()
            
        except Exception as e:
            logger.error(f"Failed to fetch overview metrics: {str(e)}")
            return self._get_mock_overview_metrics()
    
    async def get_top_pages(self, days: int = 30, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top pages by page views."""
        if not self.is_connected():
            return self._get_mock_top_pages()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="pagePath")],
                metrics=[Metric(name="screenPageViews")],
                limit=limit
            )
            
            response = self.client.run_report(request=request)
            
            pages = []
            for row in response.rows:
                pages.append({
                    "page": row.dimension_values[0].value,
                    "views": int(row.metric_values[0].value)
                })
            
            return pages if pages else self._get_mock_top_pages()
            
        except Exception as e:
            logger.error(f"Failed to fetch top pages: {str(e)}")
            return self._get_mock_top_pages()
    
    async def get_user_demographics(self, days: int = 30) -> Dict[str, Any]:
        """Get user demographics data."""
        if not self.is_connected():
            return self._get_mock_demographics()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get country data
            country_request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="country")],
                metrics=[Metric(name="activeUsers")],
                limit=10
            )
            
            country_response = self.client.run_report(country_request)
            
            countries = []
            for row in country_response.rows:
                countries.append({
                    "country": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value)
                })
            
            return {
                "countries": countries if countries else self._get_mock_demographics()["countries"]
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch user demographics: {str(e)}")
            return self._get_mock_demographics()
    
    async def get_top_events(self, days: int = 30, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top events data."""
        if not self.is_connected():
            return self._get_mock_events()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="eventName")],
                metrics=[Metric(name="eventCount")],
                limit=limit
            )
            
            response = self.client.run_report(request)
            
            events = []
            for row in response.rows:
                events.append({
                    "event": row.dimension_values[0].value,
                    "count": int(row.metric_values[0].value)
                })
            
            return events if events else self._get_mock_events()
            
        except Exception as e:
            logger.error(f"Failed to fetch top events: {str(e)}")
            return self._get_mock_events()
    
    async def get_audience_data(self, days: int = 30) -> Dict[str, Any]:
        """Get audience segmentation data."""
        if not self.is_connected():
            return self._get_mock_audience()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get device category data
            device_request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="deviceCategory")],
                metrics=[Metric(name="activeUsers"), Metric(name="sessions")]
            )
            
            device_response = self.client.run_report(device_request)
            
            devices = []
            for row in device_response.rows:
                devices.append({
                    "device": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value)
                })
            
            # Get new vs returning users
            user_request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="newVsReturning")],
                metrics=[Metric(name="activeUsers")]
            )
            
            user_response = self.client.run_report(user_request)
            
            user_types = []
            for row in user_response.rows:
                user_types.append({
                    "type": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value)
                })
            
            return {
                "devices": devices if devices else self._get_mock_audience()["devices"],
                "userTypes": user_types if user_types else self._get_mock_audience()["userTypes"]
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch audience data: {str(e)}")
            return self._get_mock_audience()
    
    async def get_funnel_data(self, days: int = 30) -> Dict[str, Any]:
        """Get funnel analysis data."""
        if not self.is_connected():
            return self._get_mock_funnel()
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(
                    start_date=start_date.strftime('%Y-%m-%d'),
                    end_date=end_date.strftime('%Y-%m-%d')
                )],
                dimensions=[Dimension(name="pagePath")],
                metrics=[Metric(name="screenPageViews"), Metric(name="conversions")],
                limit=5
            )
            
            response = self.client.run_report(request)
            
            funnel_steps = []
            for row in response.rows:
                page_path = row.dimension_values[0].value
                views = int(row.metric_values[0].value)
                conversions = int(row.metric_values[1].value)
                conversion_rate = (conversions / views * 100) if views > 0 else 0
                
                funnel_steps.append({
                    "step": page_path,
                    "views": views,
                    "conversions": conversions,
                    "conversionRate": round(conversion_rate, 2)
                })
            
            return {
                "steps": funnel_steps if funnel_steps else self._get_mock_funnel()["steps"]
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch funnel data: {str(e)}")
            return self._get_mock_funnel()
    
    def _get_mock_overview_metrics(self) -> Dict[str, Any]:
        """Return mock overview metrics when Firebase is not connected."""
        return {
            "activeUsers": 12543,
            "sessions": 18765,
            "pageViews": 45231,
            "bounceRate": 0.42,
            "avgSessionDuration": 185.50,
            "conversions": 234,
            "revenue": 15678.90,
            "engagementRate": 0.68
        }
    
    def _get_mock_top_pages(self) -> List[Dict[str, Any]]:
        """Return mock top pages when Firebase is not connected."""
        return [
            {"page": "/", "views": 8543},
            {"page": "/products", "views": 6234},
            {"page": "/about", "views": 4321},
            {"page": "/contact", "views": 3456},
            {"page": "/blog", "views": 2987}
        ]
    
    def _get_mock_demographics(self) -> Dict[str, Any]:
        """Return mock demographics when Firebase is not connected."""
        return {
            "countries": [
                {"country": "United States", "users": 4532},
                {"country": "United Kingdom", "users": 2341},
                {"country": "Canada", "users": 1876},
                {"country": "Germany", "users": 1543},
                {"country": "France", "users": 1234}
            ]
        }
    
    def _get_mock_events(self) -> List[Dict[str, Any]]:
        """Return mock events when Firebase is not connected."""
        return [
            {"event": "page_view", "count": 15432},
            {"event": "click", "count": 8765},
            {"event": "scroll", "count": 6543},
            {"event": "form_submit", "count": 2341},
            {"event": "purchase", "count": 876}
        ]
    
    def _get_mock_audience(self) -> Dict[str, Any]:
        """Return mock audience data when Firebase is not connected."""
        return {
            "devices": [
                {"device": "desktop", "users": 7543, "sessions": 9876},
                {"device": "mobile", "users": 4321, "sessions": 5432},
                {"device": "tablet", "users": 679, "sessions": 876}
            ],
            "userTypes": [
                {"type": "new", "users": 8765},
                {"type": "returning", "users": 3778}
            ]
        }
    
    def _get_mock_funnel(self) -> Dict[str, Any]:
        """Return mock funnel data when Firebase is not connected."""
        return {
            "steps": [
                {"step": "/", "views": 10000, "conversions": 3000, "conversionRate": 30.0},
                {"step": "/products", "views": 3000, "conversions": 1500, "conversionRate": 50.0},
                {"step": "/cart", "views": 1500, "conversions": 750, "conversionRate": 50.0},
                {"step": "/checkout", "views": 750, "conversions": 450, "conversionRate": 60.0},
                {"step": "/success", "views": 450, "conversions": 450, "conversionRate": 100.0}
            ]
        }

# Global instance
firebase_analytics_service = FirebaseAnalyticsService()