import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from core.database import get_database
from routers.gcp import _collect_metrics_task

logger = logging.getLogger(__name__)

class GCPMetricsScheduler:
    """Automated scheduler for GCP metrics collection"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        
    async def start(self):
        """Start the GCP metrics scheduler"""
        if self.is_running:
            logger.warning("GCP metrics scheduler is already running")
            return
            
        try:
            # Schedule periodic metrics collection every 5 minutes
            self.scheduler.add_job(
                self.collect_all_gcp_metrics,
                trigger=IntervalTrigger(minutes=5),
                id="collect_gcp_metrics",
                name="Collect GCP Metrics",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule resource discovery every hour
            self.scheduler.add_job(
                self.discover_gcp_resources,
                trigger=IntervalTrigger(hours=1),
                id="discover_gcp_resources",
                name="Discover GCP Resources",
                max_instances=1,
                coalesce=True
            )
            
            # Schedule cleanup of old metrics daily at 1 AM
            self.scheduler.add_job(
                self.cleanup_old_metrics,
                trigger=CronTrigger(hour=1, minute=0),
                id="cleanup_old_metrics",
                name="Cleanup Old Metrics",
                max_instances=1,
                coalesce=True
            )
            
            self.scheduler.start()
            self.is_running = True
            logger.info("GCP metrics scheduler started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start GCP metrics scheduler: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the GCP metrics scheduler"""
        if not self.is_running:
            logger.warning("GCP metrics scheduler is not running")
            return
            
        try:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("GCP metrics scheduler stopped successfully")
            
        except Exception as e:
            logger.error(f"Failed to stop GCP metrics scheduler: {str(e)}")
            raise
    
    async def collect_all_gcp_metrics(self):
        """Collect metrics for all enabled GCP credentials"""
        try:
            logger.info("Starting scheduled GCP metrics collection")
            
            # Get database connection
            db = await get_database()
            
            # Trigger metrics collection for all enabled credentials
            await _collect_metrics_task(None, db)
            
            logger.info("Scheduled GCP metrics collection completed successfully")
            
        except Exception as e:
            logger.error(f"Error in scheduled GCP metrics collection: {str(e)}")
    
    async def discover_gcp_resources(self):
        """Discover new GCP resources for all enabled credentials"""
        try:
            logger.info("Starting scheduled GCP resource discovery")
            
            # Get database connection
            db = await get_database()
            
            # Get all enabled credentials
            cursor = db.gcp_credentials.find({"enabled": True})
            credentials_list = await cursor.to_list(length=None)
            
            for creds in credentials_list:
                try:
                    # Here you would add resource discovery logic
                    # For now, we'll just log that discovery would happen
                    logger.info(f"Resource discovery for credentials {creds['_id']} would run here")
                    
                except Exception as e:
                    logger.error(f"Error discovering resources for credentials {creds['_id']}: {str(e)}")
                    continue
            
            logger.info("Scheduled GCP resource discovery completed")
            
        except Exception as e:
            logger.error(f"Error in scheduled GCP resource discovery: {str(e)}")
    
    async def cleanup_old_metrics(self):
        """Clean up old metrics data to prevent database bloat"""
        try:
            logger.info("Starting cleanup of old GCP metrics")
            
            # Get database connection
            db = await get_database()
            
            # Delete metrics older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            result = await db.gcp_metrics.delete_many({
                "collected_at": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} old GCP metrics")
            
            # Also cleanup old time series data
            result = await db.gcp_timeseries.delete_many({
                "created_at": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} old time series records")
            
        except Exception as e:
            logger.error(f"Error in GCP metrics cleanup: {str(e)}")
    
    def get_scheduler_status(self) -> dict:
        """Get the current status of the scheduler"""
        return {
            "is_running": self.is_running,
            "jobs": [
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in self.scheduler.get_jobs()
            ] if self.is_running else []
        }

# Global scheduler instance
gcp_scheduler = GCPMetricsScheduler()

# Convenience functions
async def start_gcp_scheduler():
    """Start the GCP metrics scheduler"""
    await gcp_scheduler.start()

async def stop_gcp_scheduler():
    """Stop the GCP metrics scheduler"""
    await gcp_scheduler.stop()

async def get_gcp_scheduler_status():
    """Get GCP scheduler status"""
    return gcp_scheduler.get_scheduler_status()