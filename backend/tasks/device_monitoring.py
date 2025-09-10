import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
from celery import current_task
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from tasks.celery_app import celery_app
from core.database import get_database, init_db
# Encryption removed
from services.snmp_poller import SNMPPoller, SNMPCredentials
from models.device import Device, DeviceHealth, InterfaceStatus

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.device_monitoring.task_poll_all_devices")
def task_poll_all_devices(self):
    """Celery task to poll all devices for health and interface status"""
    try:
        # Run the async function in the event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_poll_all_devices_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_poll_all_devices: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


async def _poll_all_devices_async() -> Dict[str, Any]:
    """Async function to poll all devices"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    snmp_poller = SNMPPoller()
    
    results = {
        "total_devices": 0,
        "successful_polls": 0,
        "failed_polls": 0,
        "errors": []
    }
    
    try:
        # Get all active devices from database
        devices_cursor = db.devices.find({"is_active": True})
        devices = await devices_cursor.to_list(length=None)
        
        results["total_devices"] = len(devices)
        
        if not devices:
            logger.info("No active devices found for polling")
            return results
        
        # Poll each device
        for device_doc in devices:
            try:
                # Convert MongoDB _id to id for Pydantic model
                device_doc['id'] = str(device_doc.pop('_id'))
                device = Device(**device_doc)
                
                # SNMP credentials are now stored in plain text
                
                # Poll device health
                health_result = await _poll_device_health(db, snmp_poller, device)
                
                # Poll interface status
                interface_result = await _poll_device_interfaces(db, snmp_poller, device)
                
                if health_result["success"] or interface_result["success"]:
                    results["successful_polls"] += 1
                else:
                    results["failed_polls"] += 1
                    results["errors"].append({
                        "device_id": str(device.id),
                        "ip_address": device.ip_address,
                        "health_error": health_result.get("error"),
                        "interface_error": interface_result.get("error")
                    })
                    
            except Exception as e:
                logger.error(f"Error polling device {device_doc.get('ip_address', 'unknown')}: {str(e)}")
                results["failed_polls"] += 1
                results["errors"].append({
                    "device_id": str(device_doc.get("_id", "unknown")),
                    "ip_address": device_doc.get("ip_address", "unknown"),
                    "error": str(e)
                })
        
        logger.info(f"Device polling completed: {results['successful_polls']}/{results['total_devices']} successful")
        
    except Exception as e:
        logger.error(f"Error in device polling task: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


async def _poll_device_health(db: AsyncIOMotorDatabase, snmp_poller: SNMPPoller, device: Device) -> Dict[str, Any]:
    """Poll a single device for health metrics"""
    try:
        # Prepare SNMP credentials
        credentials = SNMPCredentials(
            version=device.snmp_version,
            community=device.snmp_community,
            username=device.snmp_username,
            auth_protocol=device.snmp_auth_protocol,
            auth_password=device.snmp_auth_password,
            priv_protocol=device.snmp_priv_protocol,
            priv_password=device.snmp_priv_password
        )
        
        # Get system health data
        health_data = await snmp_poller.get_system_health(device.ip_address, credentials)
        
        if health_data and health_data.get("device_ip"):
            # Helper function to safely convert values to numbers
            def safe_numeric(value):
                if value is None:
                    return None
                if isinstance(value, (int, float)):
                    return value
                if isinstance(value, str):
                    # Skip SNMP error messages
                    if "No Such Object" in value or "No Such Instance" in value:
                        return None
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        return None
                return None
            
            # Create DeviceHealth object
            device_health = DeviceHealth(
                device_id=device.id,
                timestamp=datetime.now(timezone.utc),
                is_reachable=True,
                system_description=health_data.get("system_description"),
                system_uptime=safe_numeric(health_data.get("system_uptime")),
                cpu_load_1min=safe_numeric(health_data.get("cpu_usage_1min")),
                cpu_load_5min=safe_numeric(health_data.get("cpu_usage_5min")),
                cpu_load_15min=safe_numeric(health_data.get("cpu_usage_15min")),
                cpu_usage_1min=safe_numeric(health_data.get("cpu_usage_1min")),
                cpu_usage_5min=safe_numeric(health_data.get("cpu_usage_5min")),
                cpu_usage_15min=safe_numeric(health_data.get("cpu_usage_15min")),
                memory_total=safe_numeric(health_data.get("memory_total")),
                memory_used=safe_numeric(health_data.get("memory_used")),
                memory_available=safe_numeric(health_data.get("memory_available")),
                memory_utilization=safe_numeric(health_data.get("memory_utilization")),
                disk_total=safe_numeric(health_data.get("disk_total")),
                disk_used=safe_numeric(health_data.get("disk_used")),
                disk_available=safe_numeric(health_data.get("disk_available")),
                disk_utilization=safe_numeric(health_data.get("disk_utilization")),
                disk_status=health_data.get("disk_status"),
                disk_error=health_data.get("disk_error"),
                temperature=safe_numeric(health_data.get("temperature")),
                response_time=safe_numeric(health_data.get("response_time"))
            )
            
            # Store in database
            await db.device_health.insert_one(device_health.dict())
            
            # Update device timestamps - last_report_time should be the SNMP polling completion time
            polling_completion_time = datetime.now(timezone.utc)
            await db.devices.update_one(
                {"_id": ObjectId(device.id)},
                {"$set": {
                    "last_seen": polling_completion_time,
                    "last_health_check": polling_completion_time,
                    "last_report_time": polling_completion_time,
                    "last_successful_poll": polling_completion_time
                }}
            )
            
            logger.debug(f"Successfully polled health for device {device.ip_address}")
            return {"success": True}
        else:
            # Store unreachable status
            device_health = DeviceHealth(
                device_id=device.id,
                timestamp=datetime.now(timezone.utc),
                is_reachable=False,
                response_time=health_data.get("response_time")
            )
            
            await db.device_health.insert_one(device_health.dict())
            
            error_msg = "Device unreachable or no health data available"
            logger.warning(f"Failed to poll health for device {device.ip_address}: {error_msg}")
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        logger.error(f"Error polling health for device {device.ip_address}: {str(e)}")
        
        # Store error status
        try:
            device_health = DeviceHealth(
                device_id=device.id,
                timestamp=datetime.now(timezone.utc),
                is_reachable=False
            )
            await db.device_health.insert_one(device_health.dict())
        except Exception:
            pass
        
        return {"success": False, "error": str(e)}


@celery_app.task(bind=True, name="tasks.device_monitoring.task_manage_device_workers")
def task_manage_device_workers(self):
    """Celery task to manage individual device worker processes"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_manage_device_workers_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_manage_device_workers: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


async def _manage_device_workers_async() -> Dict[str, Any]:
    """Async function to manage device worker processes"""
    await init_db()
    db = await get_database()
    
    results = {
        "total_devices": 0,
        "active_workers": 0,
        "new_workers_created": 0,
        "workers_stopped": 0,
        "errors": []
    }
    
    try:
        # Get all active devices
        devices_cursor = db.devices.find({"is_active": True})
        devices = await devices_cursor.to_list(length=None)
        results["total_devices"] = len(devices)
        
        # Get currently scheduled periodic tasks from Celery beat
        from celery import current_app
        current_schedule = current_app.conf.beat_schedule or {}
        
        # Track device-specific tasks
        device_tasks = {}
        for task_name, task_config in current_schedule.items():
            if task_name.startswith("poll-device-"):
                device_id = task_name.replace("poll-device-", "")
                device_tasks[device_id] = task_name
        
        results["active_workers"] = len(device_tasks)
        
        # Create workers for new devices
        for device_doc in devices:
            device_id = str(device_doc["_id"])
            task_name = f"poll-device-{device_id}"
            
            if device_id not in device_tasks:
                # Create new periodic task for this device
                current_app.conf.beat_schedule[task_name] = {
                    "task": "tasks.device_monitoring.task_poll_single_device",
                    "schedule": 300.0,  # 5 minutes
                    "args": [device_id],
                    "options": {
                        "expires": 600,  # Task expires after 10 minutes
                        "retry": True,
                        "retry_policy": {
                            "max_retries": 3,
                            "interval_start": 60,
                            "interval_step": 60,
                            "interval_max": 300
                        }
                    }
                }
                results["new_workers_created"] += 1
                logger.info(f"Created worker for device {device_id} ({device_doc.get('ip_address', 'unknown')})")
        
        # Remove workers for inactive/deleted devices
        active_device_ids = {str(device_doc["_id"]) for device_doc in devices}
        for device_id, task_name in list(device_tasks.items()):
            if device_id not in active_device_ids:
                # Remove the periodic task
                if task_name in current_app.conf.beat_schedule:
                    del current_app.conf.beat_schedule[task_name]
                    results["workers_stopped"] += 1
                    logger.info(f"Removed worker for inactive device {device_id}")
        
        logger.info(f"Worker management completed: {results['new_workers_created']} created, {results['workers_stopped']} stopped")
        
    except Exception as e:
        logger.error(f"Error in device worker management: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


@celery_app.task(bind=True, name="tasks.device_monitoring.task_poll_device_with_timestamp")
def task_poll_device_with_timestamp(self, device_id: str):
    """Enhanced single device polling task with proper timestamp management"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_poll_device_with_timestamp_async(device_id))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_poll_device_with_timestamp for device {device_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


async def _poll_device_with_timestamp_async(device_id: str) -> Dict[str, Any]:
    """Enhanced async function to poll a single device with proper timestamp management"""
    await init_db()
    db = await get_database()
    snmp_poller = SNMPPoller()
    
    try:
        # Convert string ID to ObjectId if needed
        if isinstance(device_id, str):
            device_id = ObjectId(device_id)
        
        # Get device from database
        device_doc = await db.devices.find_one({"_id": device_id, "is_active": True})
        if not device_doc:
            return {"success": False, "error": "Device not found or inactive"}
        
        # Convert MongoDB _id to id for Pydantic model
        device_doc['id'] = str(device_doc.pop('_id'))
        device = Device(**device_doc)
        
        # Record polling start time
        poll_start_time = datetime.now(timezone.utc)
        
        # Poll device health
        health_result = await _poll_device_health(db, snmp_poller, device)
        
        # Poll interface status
        interface_result = await _poll_device_interfaces(db, snmp_poller, device)
        
        # Update device with polling completion timestamp
        poll_end_time = datetime.now(timezone.utc)
        update_data = {
            "last_poll_attempt": poll_start_time,
            "last_poll_completion": poll_end_time,
            "last_report_time": poll_end_time
        }
        
        if health_result["success"] or interface_result["success"]:
            update_data["last_successful_poll"] = poll_end_time
            update_data["last_seen"] = poll_end_time
        
        await db.devices.update_one(
            {"_id": ObjectId(device.id)},
            {"$set": update_data}
        )
        
        return {
            "success": health_result["success"] or interface_result["success"],
            "device_id": str(device.id),
            "ip_address": device.ip_address,
            "health_result": health_result,
            "interface_result": interface_result,
            "poll_duration": (poll_end_time - poll_start_time).total_seconds()
        }
        
    except Exception as e:
        logger.error(f"Error polling device {device_id}: {str(e)}")
        return {"success": False, "error": str(e)}


async def _poll_device_interfaces(db: AsyncIOMotorDatabase, snmp_poller: SNMPPoller, device: Device) -> Dict[str, Any]:
    """Poll a single device for interface status"""
    try:
        # Prepare SNMP credentials
        credentials = SNMPCredentials(
            version=device.snmp_version,
            community=device.snmp_community,
            username=device.snmp_username,
            auth_protocol=device.snmp_auth_protocol,
            auth_password=device.snmp_auth_password,
            priv_protocol=device.snmp_priv_protocol,
            priv_password=device.snmp_priv_password
        )
        
        # Get interface status data
        interface_data = await snmp_poller.get_interface_status(device.ip_address, credentials)
        
        if interface_data and isinstance(interface_data, list):
            interfaces = interface_data
            
            # Store interface history for each interface
            for interface_info in interfaces:
                interface_status = InterfaceStatus(
                    device_id=device.id,
                    timestamp=datetime.now(timezone.utc),
                    interface_index=interface_info.get("interface_index"),
                    interface_name=interface_info.get("interface_name"),
                    interface_description=interface_info.get("interface_description"),
                    admin_status=interface_info.get("admin_status"),
                    oper_status=interface_info.get("oper_status"),
                    speed=interface_info.get("interface_speed"),
                    mtu=None,  # MTU not available in current SNMP data
                    in_octets=interface_info.get("bytes_in"),
                    out_octets=interface_info.get("bytes_out"),
                    in_packets=interface_info.get("packets_in"),
                    out_packets=interface_info.get("packets_out"),
                    in_errors=interface_info.get("errors_in"),
                    out_errors=interface_info.get("errors_out"),
                    in_discards=interface_info.get("discards_in"),
                    out_discards=interface_info.get("discards_out"),
                    utilization_in=interface_info.get("utilization_in"),
                    utilization_out=interface_info.get("utilization_out")
                )
                
                # Store in interface_history collection
                await db.interface_history.insert_one(interface_status.dict())
            
            logger.debug(f"Successfully polled {len(interfaces)} interfaces for device {device.ip_address}")
            return {"success": True, "interface_count": len(interfaces)}
        else:
            error_msg = "No interface data available or device unreachable"
            logger.warning(f"Failed to poll interfaces for device {device.ip_address}: {error_msg}")
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        logger.error(f"Error polling interfaces for device {device.ip_address}: {str(e)}")
        return {"success": False, "error": str(e)}


@celery_app.task(bind=True, name="tasks.device_monitoring.task_poll_single_device")
def task_poll_single_device(self, device_id: str):
    """Celery task to poll a single device"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_poll_single_device_async(device_id))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_poll_single_device: {str(e)}")
        raise self.retry(exc=e, countdown=30, max_retries=3)


async def _poll_single_device_async(device_id: str) -> Dict[str, Any]:
    """Async function to poll a single device"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    snmp_poller = SNMPPoller()
    
    try:
        # Get device from database
        from bson import ObjectId
        device_doc = await db.devices.find_one({"_id": ObjectId(device_id)})
        
        if not device_doc:
            return {"success": False, "error": "Device not found"}
        
        # Convert MongoDB _id to id for Pydantic model
        device_doc['id'] = str(device_doc.pop('_id'))
        device = Device(**device_doc)
        
        # SNMP credentials are now stored in plain text
        
        # Poll device health and interfaces
        health_result = await _poll_device_health(db, snmp_poller, device)
        interface_result = await _poll_device_interfaces(db, snmp_poller, device)
        
        return {
            "success": health_result["success"] or interface_result["success"],
            "health_result": health_result,
            "interface_result": interface_result
        }
        
    except Exception as e:
        logger.error(f"Error polling single device {device_id}: {str(e)}")
        return {"success": False, "error": str(e)}


@celery_app.task(bind=True, name="tasks.device_monitoring.task_cleanup_old_device_data")
def task_cleanup_old_device_data(self, days_to_keep: int = 30):
    """Celery task to cleanup old device monitoring data"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_cleanup_old_device_data_async(days_to_keep))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_cleanup_old_device_data: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)


async def _cleanup_old_device_data_async(days_to_keep: int) -> Dict[str, Any]:
    """Async function to cleanup old device data"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    
    try:
        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Cleanup old device health records
        health_result = await db.device_health.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        # Cleanup old interface history records
        interface_result = await db.interface_history.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {health_result.deleted_count} health records and {interface_result.deleted_count} interface records older than {days_to_keep} days")
        
        return {
            "success": True,
            "health_records_deleted": health_result.deleted_count,
            "interface_records_deleted": interface_result.deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old device data: {str(e)}")
        return {"success": False, "error": str(e)}