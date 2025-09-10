from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from core.config import settings


class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None


db = Database()


async def get_database():
    return db.database


async def init_db():
    """Initialize database connection"""
    db.client = AsyncIOMotorClient(settings.mongodb_url)
    db.database = db.client[settings.database_name]
    
    # Create indexes for better performance
    await create_indexes()
    
    # Create default superadmin user
    from core.auth import create_superadmin_user
    await create_superadmin_user(db.database)
    
    print(f"Connected to MongoDB: {settings.database_name}")


async def close_db():
    """Close database connection"""
    if db.client:
        db.client.close()
        print("Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for optimal performance"""
    database = await get_database()
    
    # Devices collection indexes
    await database.devices.create_index("ip_address", unique=True)
    await database.devices.create_index("name")
    await database.devices.create_index("device_type")
    await database.devices.create_index("is_active")
    await database.devices.create_index("location")
    
    # Device health indexes
    await database.device_health.create_index([("device_id", 1), ("timestamp", -1)])
    await database.device_health.create_index("timestamp")
    
    # Interface history indexes
    await database.interface_history.create_index([("device_id", 1), ("timestamp", -1)])
    await database.interface_history.create_index("interface_name")
    await database.interface_status.create_index([("device_id", 1), ("interface_name", 1), ("timestamp", -1)])
    
    # SSL checks indexes
    await database.ssl_checks.create_index([("domain", 1), ("timestamp", -1)])
    await database.ssl_checks.create_index("expires_at")
    await database.ssl_checks.create_index("is_valid")
    
    # Uptime monitoring indexes
    await database.uptime_monitors.create_index("name")
    await database.uptime_monitors.create_index("url")
    await database.uptime_monitors.create_index("is_active")
    await database.uptime_monitors.create_index("current_status")
    
    # Uptime check results indexes
    await database.uptime_check_results.create_index([("monitor_id", 1), ("checked_at", -1)])
    await database.uptime_check_results.create_index("status")
    await database.uptime_check_results.create_index("checked_at")
    
    # Uptime checks (diagnostics) indexes - legacy collection for diagnostics
    await database.uptime_checks.create_index([("target", 1), ("timestamp", -1)])
    await database.uptime_checks.create_index("check_type")
    
    # Analytics indexes
    await database.ga_credentials.create_index("user_id")
    await database.ga_credentials.create_index("property_id")
    await database.ga_credentials.create_index("is_active")
    
    await database.ga_properties.create_index("credentials_id")
    await database.ga_properties.create_index("property_id")
    
    await database.ga_metrics.create_index([("property_id", 1), ("collected_at", -1)])
    await database.ga_metrics.create_index("metric_type")
    await database.ga_metrics.create_index([("date_range_start", 1), ("date_range_end", 1)])
    
    await database.ga_reports.create_index([("property_id", 1), ("generated_at", -1)])
    await database.ga_reports.create_index("report_type")
    
    # Alerts indexes
    await database.alerts.create_index("status")
    await database.alerts.create_index("severity")
    await database.alerts.create_index("timestamp")
    await database.alerts.create_index("is_resolved")
    
    # Uptime alerts indexes
    await database.uptime_alerts.create_index([("monitor_id", 1), ("triggered_at", -1)])
    await database.uptime_alerts.create_index("is_resolved")
    await database.uptime_alerts.create_index("alert_type")
    
    # GCP service-specific collection indexes
    from core.gcp_collections import create_service_indexes
    await create_service_indexes(database)
    
    print("Database indexes created successfully")