import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from core.database import get_database
from routers.analytics import _collect_all_analytics_metrics, _get_valid_credentials
from models.analytics import GAEnhancedMetric, GARealtimeData, GAMetricAggregation
from google.analytics.data_v1beta import BetaAnalyticsDataClient, RunRealtimeReportRequest, Dimension, Metric

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyticsScheduler:
    """Automated scheduler for Google Analytics metrics collection"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        
    async def start(self):
        """Start the analytics scheduler"""
        if self.is_running:
            logger.warning("Analytics scheduler is already running")
            return
            
        try:
            # Schedule periodic metrics collection every 15 minutes
            self.scheduler.add_job(
                self.collect_all_metrics,
                trigger=IntervalTrigger(minutes=15),
                id="collect_metrics",
                name="Collect Analytics Metrics",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule real-time data collection every 5 minutes
            self.scheduler.add_job(
                self.collect_realtime_data,
                trigger=IntervalTrigger(minutes=5),
                id="collect_realtime",
                name="Collect Real-time Data",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule daily aggregation at 2 AM
            self.scheduler.add_job(
                self.generate_daily_aggregations,
                trigger=CronTrigger(hour=2, minute=0),
                id="daily_aggregation",
                name="Generate Daily Aggregations",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule weekly aggregation on Sundays at 3 AM
            self.scheduler.add_job(
                self.generate_weekly_aggregations,
                trigger=CronTrigger(day_of_week=6, hour=3, minute=0),
                id="weekly_aggregation",
                name="Generate Weekly Aggregations",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule cleanup of old data every day at 4 AM
            self.scheduler.add_job(
                self.cleanup_old_data,
                trigger=CronTrigger(hour=4, minute=0),
                id="cleanup_data",
                name="Cleanup Old Data",
                max_instances=1,
                coalesce=True
            )
            
            self.scheduler.start()
            self.is_running = True
            logger.info("Analytics scheduler started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start analytics scheduler: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the analytics scheduler"""
        if not self.is_running:
            return
            
        try:
            self.scheduler.shutdown(wait=True)
            self.is_running = False
            logger.info("Analytics scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping analytics scheduler: {str(e)}")
    
    async def collect_all_metrics(self):
        """Collect metrics for all active users with error handling"""
        try:
            db = await get_database()
            
            # Get all active GA credentials
            credentials_cursor = db.ga_credentials.find({"is_active": True})
            credentials_list = await credentials_cursor.to_list(length=None)
            
            success_count = 0
            error_count = 0
            
            for cred in credentials_list:
                try:
                    await _collect_all_analytics_metrics(cred["user_id"])
                    success_count += 1
                    logger.info(f"Successfully collected metrics for user {cred['user_id']}")
                    
                except Exception as e:
                    error_count += 1
                    logger.error(f"Failed to collect metrics for user {cred['user_id']}: {str(e)}")
                    
                    # Store error information
                    await self._log_collection_error(cred["user_id"], "metrics", str(e))
            
            logger.info(f"Metrics collection completed: {success_count} successful, {error_count} errors")
            
        except Exception as e:
            logger.error(f"Critical error in collect_all_metrics: {str(e)}")
    
    async def collect_realtime_data(self):
        """Collect real-time data for all active properties"""
        try:
            db = await get_database()
            
            # Get all active GA credentials
            credentials_cursor = db.ga_credentials.find({"is_active": True})
            credentials_list = await credentials_cursor.to_list(length=None)
            
            for cred in credentials_list:
                try:
                    await self._collect_user_realtime_data(cred["user_id"], cred["property_id"])
                    
                except Exception as e:
                    logger.error(f"Failed to collect real-time data for user {cred['user_id']}: {str(e)}")
                    await self._log_collection_error(cred["user_id"], "realtime", str(e))
            
        except Exception as e:
            logger.error(f"Critical error in collect_realtime_data: {str(e)}")
    
    async def _collect_user_realtime_data(self, user_id: str, property_id: str):
        """Collect real-time data for a specific user and property"""
        try:
            credentials = await _get_valid_credentials(property_id, user_id)
            client = BetaAnalyticsDataClient(credentials=credentials)
            
            # Real-time request
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
            
            # Process and store real-time data
            realtime_data = GARealtimeData(
                property_id=property_id,
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
            
            for row in response.rows:
                active_users = int(row.metric_values[0].value)
                page_views = int(row.metric_values[1].value)
                events = int(row.metric_values[2].value)
                
                realtime_data.active_users += active_users
                realtime_data.page_views += page_views
                realtime_data.events += events
                
                country = row.dimension_values[0].value
                device = row.dimension_values[1].value
                
                # Add country and device data
                realtime_data.countries.append({"country": country, "users": active_users})
                realtime_data.devices.append({"device": device, "users": active_users})
            
            # Store in database
            db = await get_database()
            await db.ga_realtime_data.insert_one(realtime_data.dict(by_alias=True, exclude={"id"}))
            
        except Exception as e:
            logger.error(f"Error collecting real-time data for user {user_id}: {str(e)}")
            raise
    
    async def generate_daily_aggregations(self):
        """Generate daily aggregated metrics"""
        try:
            db = await get_database()
            yesterday = datetime.utcnow() - timedelta(days=1)
            
            # Get all users with metrics data
            users_cursor = db.ga_credentials.find({"is_active": True})
            users_list = await users_cursor.to_list(length=None)
            
            for user in users_list:
                try:
                    await self._generate_user_daily_aggregation(user["user_id"], user["property_id"], yesterday)
                except Exception as e:
                    logger.error(f"Failed to generate daily aggregation for user {user['user_id']}: {str(e)}")
            
            logger.info(f"Daily aggregations generated for {yesterday.date()}")
            
        except Exception as e:
            logger.error(f"Critical error in generate_daily_aggregations: {str(e)}")
    
    async def _generate_user_daily_aggregation(self, user_id: str, property_id: str, date: datetime):
        """Generate daily aggregation for a specific user"""
        try:
            db = await get_database()
            
            # Query metrics for the day
            start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
            
            metrics_cursor = db.ga_metrics.find({
                "user_id": user_id,
                "property_id": property_id,
                "collected_at": {"$gte": start_date, "$lt": end_date}
            })
            
            metrics_list = await metrics_cursor.to_list(length=None)
            
            if not metrics_list:
                return
            
            # Calculate aggregations
            aggregation = GAMetricAggregation(
                property_id=property_id,
                user_id=user_id,
                aggregation_type="daily",
                aggregation_date=start_date
            )
            
            # Aggregate metrics
            for metric in metrics_list:
                if metric.get("metric_type") == "sessions":
                    aggregation.total_sessions += int(metric.get("value", 0))
                elif metric.get("metric_type") == "users":
                    aggregation.total_users += int(metric.get("value", 0))
                elif metric.get("metric_type") == "pageviews":
                    aggregation.total_pageviews += int(metric.get("value", 0))
                elif metric.get("metric_type") == "events":
                    aggregation.total_events += int(metric.get("value", 0))
            
            # Store aggregation
            await db.ga_aggregations.insert_one(aggregation.dict(by_alias=True, exclude={"id"}))
            
        except Exception as e:
            logger.error(f"Error generating daily aggregation for user {user_id}: {str(e)}")
            raise
    
    async def generate_weekly_aggregations(self):
        """Generate weekly aggregated metrics"""
        try:
            db = await get_database()
            last_week = datetime.utcnow() - timedelta(weeks=1)
            
            # Get all users with metrics data
            users_cursor = db.ga_credentials.find({"is_active": True})
            users_list = await users_cursor.to_list(length=None)
            
            for user in users_list:
                try:
                    await self._generate_user_weekly_aggregation(user["user_id"], user["property_id"], last_week)
                except Exception as e:
                    logger.error(f"Failed to generate weekly aggregation for user {user['user_id']}: {str(e)}")
            
            logger.info(f"Weekly aggregations generated for week ending {last_week.date()}")
            
        except Exception as e:
            logger.error(f"Critical error in generate_weekly_aggregations: {str(e)}")
    
    async def _generate_user_weekly_aggregation(self, user_id: str, property_id: str, week_end: datetime):
        """Generate weekly aggregation for a specific user"""
        try:
            db = await get_database()
            
            # Query daily aggregations for the week
            week_start = week_end - timedelta(days=7)
            
            daily_aggs_cursor = db.ga_aggregations.find({
                "user_id": user_id,
                "property_id": property_id,
                "aggregation_type": "daily",
                "aggregation_date": {"$gte": week_start, "$lt": week_end}
            })
            
            daily_aggs = await daily_aggs_cursor.to_list(length=None)
            
            if not daily_aggs:
                return
            
            # Calculate weekly aggregation
            weekly_agg = GAMetricAggregation(
                property_id=property_id,
                user_id=user_id,
                aggregation_type="weekly",
                aggregation_date=week_start
            )
            
            for daily_agg in daily_aggs:
                weekly_agg.total_sessions += daily_agg.get("total_sessions", 0)
                weekly_agg.total_users += daily_agg.get("total_users", 0)
                weekly_agg.total_pageviews += daily_agg.get("total_pageviews", 0)
                weekly_agg.total_events += daily_agg.get("total_events", 0)
            
            # Calculate averages
            days_count = len(daily_aggs)
            if days_count > 0:
                weekly_agg.average_session_duration = sum(d.get("average_session_duration", 0) for d in daily_aggs) / days_count
                weekly_agg.bounce_rate = sum(d.get("bounce_rate", 0) for d in daily_aggs) / days_count
            
            # Store weekly aggregation
            await db.ga_aggregations.insert_one(weekly_agg.dict(by_alias=True, exclude={"id"}))
            
        except Exception as e:
            logger.error(f"Error generating weekly aggregation for user {user_id}: {str(e)}")
            raise
    
    async def cleanup_old_data(self):
        """Clean up old metrics and real-time data"""
        try:
            db = await get_database()
            
            # Delete real-time data older than 7 days
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            realtime_result = await db.ga_realtime_data.delete_many({
                "timestamp": {"$lt": seven_days_ago}
            })
            
            # Delete raw metrics older than 90 days
            ninety_days_ago = datetime.utcnow() - timedelta(days=90)
            metrics_result = await db.ga_metrics.delete_many({
                "collected_at": {"$lt": ninety_days_ago}
            })
            
            # Delete daily aggregations older than 1 year
            one_year_ago = datetime.utcnow() - timedelta(days=365)
            daily_agg_result = await db.ga_aggregations.delete_many({
                "aggregation_type": "daily",
                "aggregation_date": {"$lt": one_year_ago}
            })
            
            logger.info(f"Cleanup completed: {realtime_result.deleted_count} real-time records, "
                       f"{metrics_result.deleted_count} metrics, {daily_agg_result.deleted_count} daily aggregations")
            
        except Exception as e:
            logger.error(f"Error during data cleanup: {str(e)}")
    
    async def _log_collection_error(self, user_id: str, collection_type: str, error_message: str):
        """Log collection errors to database"""
        try:
            db = await get_database()
            
            error_log = {
                "user_id": user_id,
                "collection_type": collection_type,
                "error_message": error_message,
                "timestamp": datetime.utcnow(),
                "resolved": False
            }
            
            await db.analytics_errors.insert_one(error_log)
            
        except Exception as e:
            logger.error(f"Failed to log collection error: {str(e)}")

# Global scheduler instance
analytics_scheduler = AnalyticsScheduler()

async def start_analytics_scheduler():
    """Start the analytics scheduler"""
    await analytics_scheduler.start()

async def stop_analytics_scheduler():
    """Stop the analytics scheduler"""
    await analytics_scheduler.stop()