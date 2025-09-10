import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from tasks.celery_app import celery_app
from core.database import get_database

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.maintenance.task_cleanup_old_data")
def task_cleanup_old_data(self):
    """Celery task to cleanup old data from all collections"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_cleanup_old_data_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_cleanup_old_data: {str(e)}")
        raise self.retry(exc=e, countdown=600, max_retries=2)


async def _cleanup_old_data_async() -> Dict[str, Any]:
    """Async function to cleanup old data from all collections"""
    db = await get_database()
    
    results = {
        "device_health_deleted": 0,
        "interface_history_deleted": 0,
        "ssl_checks_deleted": 0,
        "uptime_checks_deleted": 0,
        "alerts_deleted": 0,
        "total_deleted": 0,
        "errors": []
    }
    
    try:
        # Define retention periods for different data types
        retention_periods = {
            "device_health": 30,      # 30 days
            "interface_history": 30,  # 30 days
            "ssl_checks": 90,         # 90 days
            "uptime_checks": 30,      # 30 days
            "alerts": 90              # 90 days
        }
        
        # Cleanup device health data
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_periods["device_health"])
            result = await db.device_health.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            results["device_health_deleted"] = result.deleted_count
            logger.info(f"Cleaned up {result.deleted_count} device health records")
        except Exception as e:
            logger.error(f"Error cleaning device health data: {str(e)}")
            results["errors"].append({"collection": "device_health", "error": str(e)})
        
        # Cleanup interface history data
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_periods["interface_history"])
            result = await db.interface_history.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            results["interface_history_deleted"] = result.deleted_count
            logger.info(f"Cleaned up {result.deleted_count} interface history records")
        except Exception as e:
            logger.error(f"Error cleaning interface history data: {str(e)}")
            results["errors"].append({"collection": "interface_history", "error": str(e)})
        
        # Cleanup SSL checks data
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_periods["ssl_checks"])
            result = await db.ssl_checks.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            results["ssl_checks_deleted"] = result.deleted_count
            logger.info(f"Cleaned up {result.deleted_count} SSL check records")
        except Exception as e:
            logger.error(f"Error cleaning SSL checks data: {str(e)}")
            results["errors"].append({"collection": "ssl_checks", "error": str(e)})
        
        # Cleanup uptime checks data
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_periods["uptime_checks"])
            result = await db.uptime_checks.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            results["uptime_checks_deleted"] = result.deleted_count
            logger.info(f"Cleaned up {result.deleted_count} uptime check records")
        except Exception as e:
            logger.error(f"Error cleaning uptime checks data: {str(e)}")
            results["errors"].append({"collection": "uptime_checks", "error": str(e)})
        
        # Cleanup old alerts
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_periods["alerts"])
            result = await db.alerts.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            results["alerts_deleted"] = result.deleted_count
            logger.info(f"Cleaned up {result.deleted_count} alert records")
        except Exception as e:
            logger.error(f"Error cleaning alerts data: {str(e)}")
            results["errors"].append({"collection": "alerts", "error": str(e)})
        
        # Calculate total deleted records
        results["total_deleted"] = (
            results["device_health_deleted"] +
            results["interface_history_deleted"] +
            results["ssl_checks_deleted"] +
            results["uptime_checks_deleted"] +
            results["alerts_deleted"]
        )
        
        logger.info(f"Data cleanup completed: {results['total_deleted']} total records deleted")
        
    except Exception as e:
        logger.error(f"Error in data cleanup task: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


@celery_app.task(bind=True, name="tasks.maintenance.task_optimize_database")
def task_optimize_database(self):
    """Celery task to optimize database performance"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_optimize_database_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_optimize_database: {str(e)}")
        raise self.retry(exc=e, countdown=600, max_retries=2)


async def _optimize_database_async() -> Dict[str, Any]:
    """Async function to optimize database performance"""
    db = await get_database()
    
    results = {
        "indexes_created": 0,
        "collections_analyzed": 0,
        "errors": []
    }
    
    try:
        # List of collections to optimize
        collections = [
            "devices",
            "device_health",
            "interface_history",
            "ssl_checks",
            "uptime_checks",
            "alerts"
        ]
        
        for collection_name in collections:
            try:
                collection = db[collection_name]
                
                # Get collection stats
                stats = await db.command("collStats", collection_name)
                results["collections_analyzed"] += 1
                
                logger.info(f"Collection {collection_name}: {stats.get('count', 0)} documents, {stats.get('size', 0)} bytes")
                
                # Ensure indexes exist (they should already be created in database.py)
                if collection_name == "devices":
                    await collection.create_index("ip_address", unique=True)
                    await collection.create_index("device_type")
                    await collection.create_index("is_active")
                    results["indexes_created"] += 3
                
                elif collection_name == "device_health":
                    await collection.create_index([("device_id", 1), ("timestamp", -1)])
                    await collection.create_index("timestamp")
                    results["indexes_created"] += 2
                
                elif collection_name == "interface_history":
                    await collection.create_index([("device_id", 1), ("interface_index", 1), ("timestamp", -1)])
                    await collection.create_index("timestamp")
                    results["indexes_created"] += 2
                
                elif collection_name == "ssl_checks":
                    await collection.create_index([("domain", 1), ("timestamp", -1)])
                    await collection.create_index("timestamp")
                    await collection.create_index("expires_at")
                    results["indexes_created"] += 3
                
                elif collection_name == "uptime_checks":
                    await collection.create_index([("target", 1), ("check_type", 1), ("timestamp", -1)])
                    await collection.create_index("timestamp")
                    results["indexes_created"] += 2
                
                elif collection_name == "alerts":
                    await collection.create_index([("type", 1), ("timestamp", -1)])
                    await collection.create_index("timestamp")
                    await collection.create_index("severity")
                    results["indexes_created"] += 3
                
            except Exception as e:
                logger.error(f"Error optimizing collection {collection_name}: {str(e)}")
                results["errors"].append({"collection": collection_name, "error": str(e)})
        
        logger.info(f"Database optimization completed: {results['indexes_created']} indexes created/verified")
        
    except Exception as e:
        logger.error(f"Error in database optimization task: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


@celery_app.task(bind=True, name="tasks.maintenance.task_generate_system_report")
def task_generate_system_report(self):
    """Celery task to generate system health report"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_generate_system_report_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_generate_system_report: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)


async def _generate_system_report_async() -> Dict[str, Any]:
    """Async function to generate system health report"""
    db = await get_database()
    
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_stats": {},
        "monitoring_stats": {},
        "alert_stats": {},
        "errors": []
    }
    
    try:
        # Get database statistics
        try:
            db_stats = await db.command("dbStats")
            report["database_stats"] = {
                "collections": db_stats.get("collections", 0),
                "objects": db_stats.get("objects", 0),
                "data_size": db_stats.get("dataSize", 0),
                "storage_size": db_stats.get("storageSize", 0),
                "indexes": db_stats.get("indexes", 0),
                "index_size": db_stats.get("indexSize", 0)
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {str(e)}")
            report["errors"].append({"section": "database_stats", "error": str(e)})
        
        # Get monitoring statistics
        try:
            # Device statistics
            total_devices = await db.devices.count_documents({})
            active_devices = await db.devices.count_documents({"is_active": True})
            
            # Recent health checks (last 24 hours)
            last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
            recent_health_checks = await db.device_health.count_documents({
                "timestamp": {"$gte": last_24h}
            })
            
            # SSL checks
            total_ssl_domains = await db.ssl_checks.distinct("domain")
            recent_ssl_checks = await db.ssl_checks.count_documents({
                "timestamp": {"$gte": last_24h}
            })
            
            # Uptime checks
            recent_uptime_checks = await db.uptime_checks.count_documents({
                "timestamp": {"$gte": last_24h}
            })
            
            report["monitoring_stats"] = {
                "total_devices": total_devices,
                "active_devices": active_devices,
                "recent_health_checks_24h": recent_health_checks,
                "total_ssl_domains": len(total_ssl_domains),
                "recent_ssl_checks_24h": recent_ssl_checks,
                "recent_uptime_checks_24h": recent_uptime_checks
            }
        except Exception as e:
            logger.error(f"Error getting monitoring stats: {str(e)}")
            report["errors"].append({"section": "monitoring_stats", "error": str(e)})
        
        # Get alert statistics
        try:
            # Recent alerts (last 7 days)
            last_7d = datetime.now(timezone.utc) - timedelta(days=7)
            
            # Count alerts by severity
            alert_pipeline = [
                {"$match": {"timestamp": {"$gte": last_7d}}},
                {"$group": {
                    "_id": "$severity",
                    "count": {"$sum": 1}
                }}
            ]
            
            alert_counts = {}
            async for result in db.alerts.aggregate(alert_pipeline):
                alert_counts[result["_id"]] = result["count"]
            
            # Count alerts by type
            type_pipeline = [
                {"$match": {"timestamp": {"$gte": last_7d}}},
                {"$group": {
                    "_id": "$type",
                    "count": {"$sum": 1}
                }}
            ]
            
            alert_types = {}
            async for result in db.alerts.aggregate(type_pipeline):
                alert_types[result["_id"]] = result["count"]
            
            report["alert_stats"] = {
                "total_alerts_7d": sum(alert_counts.values()),
                "by_severity": alert_counts,
                "by_type": alert_types
            }
        except Exception as e:
            logger.error(f"Error getting alert stats: {str(e)}")
            report["errors"].append({"section": "alert_stats", "error": str(e)})
        
        logger.info("System report generated successfully")
        
    except Exception as e:
        logger.error(f"Error in system report generation: {str(e)}")
        report["errors"].append({"general_error": str(e)})
    
    return report


@celery_app.task(bind=True, name="tasks.maintenance.task_backup_configuration")
def task_backup_configuration(self):
    """Celery task to backup system configuration"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_backup_configuration_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_backup_configuration: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)


async def _backup_configuration_async() -> Dict[str, Any]:
    """Async function to backup system configuration"""
    db = await get_database()
    
    backup_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "devices": [],
        "ssl_monitors": [],
        "uptime_monitors": [],
        "errors": []
    }
    
    try:
        # Backup device configurations (without sensitive data)
        try:
            devices_cursor = db.devices.find({}, {
                "snmp_community": 0,
                "snmp_auth_password": 0,
                "snmp_priv_password": 0
            })
            
            async for device in devices_cursor:
                # Convert ObjectId to string for JSON serialization
                device["_id"] = str(device["_id"])
                backup_data["devices"].append(device)
            
            logger.info(f"Backed up {len(backup_data['devices'])} device configurations")
        except Exception as e:
            logger.error(f"Error backing up devices: {str(e)}")
            backup_data["errors"].append({"section": "devices", "error": str(e)})
        
        # Backup SSL monitoring configurations
        try:
            ssl_domains = await db.ssl_checks.distinct("domain")
            backup_data["ssl_monitors"] = ssl_domains
            
            logger.info(f"Backed up {len(ssl_domains)} SSL monitoring configurations")
        except Exception as e:
            logger.error(f"Error backing up SSL monitors: {str(e)}")
            backup_data["errors"].append({"section": "ssl_monitors", "error": str(e)})
        
        # Backup uptime monitoring configurations
        try:
            uptime_targets = await db.uptime_checks.aggregate([
                {"$group": {
                    "_id": {
                        "target": "$target",
                        "check_type": "$check_type",
                        "port": "$port"
                    }
                }},
                {"$project": {
                    "target": "$_id.target",
                    "check_type": "$_id.check_type",
                    "port": "$_id.port",
                    "_id": 0
                }}
            ]).to_list(length=None)
            
            backup_data["uptime_monitors"] = uptime_targets
            
            logger.info(f"Backed up {len(uptime_targets)} uptime monitoring configurations")
        except Exception as e:
            logger.error(f"Error backing up uptime monitors: {str(e)}")
            backup_data["errors"].append({"section": "uptime_monitors", "error": str(e)})
        
        logger.info("Configuration backup completed successfully")
        
    except Exception as e:
        logger.error(f"Error in configuration backup: {str(e)}")
        backup_data["errors"].append({"general_error": str(e)})
    
    return backup_data