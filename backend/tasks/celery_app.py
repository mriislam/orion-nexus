from celery import Celery
from core.config import settings
# Removed worker_process_init import as we're not using it anymore

# Create Celery app instance
celery_app = Celery(
    "orion_nexus",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.device_monitoring",
        "tasks.ssl_monitoring", 
        "tasks.uptime_monitoring"
    ]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Configure periodic tasks
celery_app.conf.beat_schedule = {
    "poll-all-devices": {
        "task": "tasks.device_monitoring.task_poll_all_devices",
        "schedule": settings.device_poll_interval,
    },
    "manage-device-workers": {
        "task": "tasks.device_monitoring.task_manage_device_workers",
        "schedule": 600.0,  # Every 10 minutes - manage individual device workers
    },
    "check-ssl-certificates": {
        "task": "tasks.ssl_monitoring.task_check_all_ssl_certificates",
        "schedule": 3600.0,  # Every hour
    },
    "perform-uptime-checks": {
        "task": "tasks.uptime_monitoring.task_perform_all_uptime_checks",
        "schedule": 300.0,  # Every 5 minutes
    },
    "cleanup-old-data": {
        "task": "tasks.maintenance.task_cleanup_old_data",
        "schedule": 86400.0,  # Daily
    },
}

celery_app.conf.timezone = "UTC"

# Removed worker process database initialization to avoid event loop conflicts
# Database will be initialized in each task instead

if __name__ == "__main__":
    celery_app.start()