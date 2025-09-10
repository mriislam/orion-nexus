from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timedelta
from models.device import Device, DeviceCreate, DeviceUpdate, DeviceResponse
from core.database import get_database
# Encryption removed

router = APIRouter()


@router.post("/", response_model=DeviceResponse)
async def create_device(device: DeviceCreate, db=Depends(get_database)):
    """Create a new network device"""
    # Check if device with same IP already exists
    existing_device = await db.devices.find_one({"ip_address": device.ip_address})
    if existing_device:
        raise HTTPException(status_code=400, detail="Device with this IP address already exists")
    
    # Store device data directly (encryption removed)
    device_dict = device.model_dump()
    
    # Ensure device is active for monitoring
    device_dict['is_active'] = True
    device_dict['created_at'] = datetime.utcnow()
    
    # Insert device
    result = await db.devices.insert_one(device_dict)
    
    # Return created device
    created_device = await db.devices.find_one({"_id": result.inserted_id})
    
    return DeviceResponse(
        id=str(created_device["_id"]),
        **{k: v for k, v in created_device.items() if k != "_id"}
    )


@router.post("/bulk", response_model=dict)
async def create_devices_bulk(devices: List[DeviceCreate], db=Depends(get_database)):
    """Create multiple network devices from bulk import"""
    if not devices:
        raise HTTPException(status_code=400, detail="No devices provided")
    
    if len(devices) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 devices allowed per bulk import")
    
    created_devices = []
    failed_devices = []
    
    for i, device in enumerate(devices):
        try:
            # Check if device with same IP already exists
            existing_device = await db.devices.find_one({"ip_address": device.ip_address})
            if existing_device:
                failed_devices.append({
                    "index": i,
                    "device": device.model_dump(),
                    "error": f"Device with IP address {device.ip_address} already exists"
                })
                continue
            
            # Store device data directly (encryption removed)
            device_dict = device.model_dump()
            
            # Ensure device is active for monitoring
            device_dict['is_active'] = True
            device_dict['created_at'] = datetime.utcnow()
            
            # Insert device
            result = await db.devices.insert_one(device_dict)
            
            # Get created device
            created_device = await db.devices.find_one({"_id": result.inserted_id})
            
            created_devices.append(DeviceResponse(
                id=str(created_device["_id"]),
                **{k: v for k, v in created_device.items() if k != "_id"}
            ))
            
        except Exception as e:
            failed_devices.append({
                "index": i,
                "device": device.model_dump(),
                "error": str(e)
            })
    
    return {
        "message": f"Bulk import completed. {len(created_devices)} devices created, {len(failed_devices)} failed.",
        "created_count": len(created_devices),
        "failed_count": len(failed_devices),
        "created_devices": created_devices,
        "failed_devices": failed_devices
    }


@router.get("/", response_model=List[DeviceResponse])
async def get_devices(
    skip: int = 0,
    limit: int = 100,
    device_type: Optional[str] = None,
    db=Depends(get_database)
):
    """Get all devices with optional filtering"""
    query = {}
    if device_type:
        query["device_type"] = device_type
    
    cursor = db.devices.find(query).skip(skip).limit(limit)
    devices = await cursor.to_list(length=limit)
    
    # Return devices directly (encryption removed)
    result = []
    
    for device in devices:
        result.append(DeviceResponse(
            id=str(device["_id"]),
            **{k: v for k, v in device.items() if k != "_id"}
        ))
    
    return result


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device_id: str, db=Depends(get_database)):
    """Get a specific device by ID"""
    try:
        object_id = ObjectId(device_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID format")
    
    device = await db.devices.find_one({"_id": object_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Return device directly (encryption removed)
    return DeviceResponse(
        id=str(device["_id"]),
        **{k: v for k, v in device.items() if k != "_id"}
    )


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_id: str, device_update: DeviceUpdate, db=Depends(get_database)):
    """Update a device"""
    try:
        object_id = ObjectId(device_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID format")
    
    # Check if device exists
    existing_device = await db.devices.find_one({"_id": object_id})
    if not existing_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Prepare update data
    update_data = device_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Update device directly (encryption removed)
    await db.devices.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )
    
    # Return updated device
    updated_device = await db.devices.find_one({"_id": object_id})
    
    return DeviceResponse(
        id=str(updated_device["_id"]),
        **{k: v for k, v in updated_device.items() if k != "_id"}
    )


@router.delete("/{device_id}")
async def delete_device(device_id: str, db=Depends(get_database)):
    """Delete a device"""
    try:
        object_id = ObjectId(device_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID format")
    
    # Check if device exists
    device = await db.devices.find_one({"_id": object_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Delete device
    await db.devices.delete_one({"_id": object_id})
    
    # Also delete related interface history
    await db.interface_history.delete_many({"device_id": device_id})
    
    return {"message": "Device deleted successfully"}


@router.get("/{device_id}/interfaces")
async def get_device_interfaces(device_id: str, db=Depends(get_database)):
    """Get current interface status for a device"""
    try:
        object_id = ObjectId(device_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID format")
    
    # Check if device exists
    device = await db.devices.find_one({"_id": object_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Get latest interface data
    interfaces = await db.interface_history.find(
        {"device_id": device_id}
    ).sort("timestamp", -1).limit(50).to_list(length=50)
    
    # Convert ObjectId to string for JSON serialization
    for interface in interfaces:
        if "_id" in interface:
            interface["_id"] = str(interface["_id"])
    
    return interfaces


@router.get("/{device_id}/health")
async def get_device_health(device_id: str, db=Depends(get_database)):
    """Get current health status for a device"""
    try:
        object_id = ObjectId(device_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID format")
    
    # Check if device exists
    device = await db.devices.find_one({"_id": object_id})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Get latest health data
    health_data = await db.device_health.find_one(
        {"device_id": device_id},
        sort=[("timestamp", -1)]
    )
    
    if not health_data:
        return {
            "message": "No health data available",
            "status": "offline",
            "device_id": device_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Convert ObjectId to string for JSON serialization
    if "_id" in health_data:
        health_data["_id"] = str(health_data["_id"])
    
    # Determine device status based on health data
    is_reachable = health_data.get("is_reachable")
    if is_reachable is True:
        status = "online"
    elif is_reachable is False:
        status = "offline"
    else:
        # Fallback: check if we have recent data (within last 10 minutes)
        timestamp = health_data.get("timestamp")
        if timestamp:
            time_diff = datetime.utcnow() - timestamp
            if time_diff.total_seconds() < 600:  # 10 minutes
                status = "online"
            else:
                status = "offline"
        else:
            status = "offline"
    
    # Add status to health data
    health_data["status"] = status
    
    # Map CPU fields for frontend compatibility
    if health_data.get("cpu_load_1min") and not health_data.get("cpu_usage"):
        health_data["cpu_usage"] = health_data.get("cpu_load_1min")
    
    # Calculate memory usage percentage if not available
    if health_data.get("memory_total") and health_data.get("memory_used") and not health_data.get("memory_usage"):
        memory_total = health_data["memory_total"]
        memory_used = health_data["memory_used"]
        health_data["memory_usage"] = (memory_used / memory_total * 100) if memory_total > 0 else 0
    
    return health_data


@router.get("/dashboard/stats")
async def get_dashboard_stats(db=Depends(get_database)):
    """Get aggregated dashboard statistics"""
    try:
        # Get device statistics
        total_devices = await db.devices.count_documents({})
        active_devices = await db.devices.count_documents({"is_active": True})
        devices_down = total_devices - active_devices
        
        # Get SSL statistics
        total_ssl_checks = await db.ssl_checks.count_documents({})
        
        # SSL certificates expiring in next 30 days
        thirty_days_from_now = datetime.utcnow() + timedelta(days=30)
        ssl_expiring_soon = await db.ssl_checks.count_documents({
            "expires_at": {"$lte": thirty_days_from_now, "$gte": datetime.utcnow()}
        })
        
        # SSL certificates already expired
        ssl_expired = await db.ssl_checks.count_documents({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        
        # Get uptime statistics
        total_uptime_checks = await db.uptime_monitors.count_documents({})
        
        # Get monitors that are currently down
        uptime_checks_down = await db.uptime_monitors.count_documents({
            "is_active": True,
            "current_status": {"$in": ["down", "degraded"]}
        })
        
        # Calculate average uptime percentage (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        uptime_pipeline = [
            {
                "$match": {
                    "checked_at": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_checks": {"$sum": 1},
                    "successful_checks": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", "up"]}, 1, 0]
                        }
                    }
                }
            }
        ]
        
        uptime_result = await db.uptime_check_results.aggregate(uptime_pipeline).to_list(length=1)
        
        if uptime_result and uptime_result[0]["total_checks"] > 0:
            avg_uptime_percentage = round(
                (uptime_result[0]["successful_checks"] / uptime_result[0]["total_checks"]) * 100, 1
            )
        else:
            avg_uptime_percentage = 0.0
        
        return {
            "total_devices": total_devices,
            "active_devices": active_devices,
            "devices_down": devices_down,
            "total_ssl_checks": total_ssl_checks,
            "ssl_expiring_soon": ssl_expiring_soon,
            "ssl_expired": ssl_expired,
            "total_uptime_checks": total_uptime_checks,
            "uptime_checks_down": uptime_checks_down,
            "avg_uptime_percentage": avg_uptime_percentage
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {str(e)}")


@router.get("/alerts/recent")
async def get_recent_alerts(limit: int = 10, db=Depends(get_database)):
    """Get recent alerts from various monitoring sources"""
    try:
        alerts = []
        
        # Get recent device alerts (devices that went offline)
        recent_device_alerts = await db.device_health.find({
            "status": "offline",
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        }).sort("timestamp", -1).limit(5).to_list(length=5)
        
        for alert in recent_device_alerts:
            device = await db.devices.find_one({"_id": ObjectId(alert["device_id"])})
            if device:
                alerts.append({
                    "id": str(alert["_id"]),
                    "type": "error",
                    "title": f"Device Offline: {device['name']}",
                    "message": f"Device {device['name']} ({device['ip_address']}) is not responding",
                    "timestamp": alert["timestamp"].isoformat(),
                    "source": "device_monitoring"
                })
        
        # Get SSL certificate alerts (expiring soon)
        expiring_ssl = await db.ssl_checks.find({
            "expires_at": {
                "$lte": datetime.utcnow() + timedelta(days=7),
                "$gte": datetime.utcnow()
            }
        }).sort("expires_at", 1).limit(3).to_list(length=3)
        
        for ssl in expiring_ssl:
            days_until_expiry = (ssl["expires_at"] - datetime.utcnow()).days
            alerts.append({
                "id": str(ssl["_id"]),
                "type": "warning",
                "title": f"SSL Certificate Expiring Soon",
                "message": f"SSL certificate for {ssl['domain']} expires in {days_until_expiry} days",
                "timestamp": ssl.get("last_checked", datetime.utcnow()).isoformat(),
                "source": "ssl_monitoring"
            })
        
        # Get uptime alerts (recent downtime)
        recent_uptime_alerts = await db.uptime_check_results.find({
            "status": {"$in": ["down", "degraded"]},
            "checked_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        }).sort("checked_at", -1).limit(3).to_list(length=3)
        
        for alert in recent_uptime_alerts:
            monitor = await db.uptime_monitors.find_one({"_id": ObjectId(alert["monitor_id"])})
            if monitor:
                alerts.append({
                    "id": str(alert["_id"]),
                    "type": "error" if alert["status"] == "down" else "warning",
                    "title": f"Uptime Check Failed: {monitor['name']}",
                    "message": f"Monitor {monitor['name']} ({monitor['url']}) is {alert['status']}",
                    "timestamp": alert["checked_at"].isoformat(),
                    "source": "uptime_monitoring"
                })
        
        # Sort all alerts by timestamp (most recent first) and limit
        alerts.sort(key=lambda x: x["timestamp"], reverse=True)
        return alerts[:limit]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent alerts: {str(e)}")