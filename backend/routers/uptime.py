from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from core.database import get_database
from models.uptime import (
    UptimeMonitorConfig,
    UptimeCheckResult,
    UptimeStats,
    UptimeAlert,
    CreateUptimeMonitorRequest,
    UpdateUptimeMonitorRequest,
    UptimeMonitorResponse,
    UptimeCheckResultResponse,
    MonitorStatus
)
# Encryption removed
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uptime", tags=["uptime"])


@router.post("/monitors", response_model=UptimeMonitorResponse)
async def create_uptime_monitor(
    monitor_data: CreateUptimeMonitorRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new uptime monitor"""
    try:
        # Create monitor configuration
        monitor = UptimeMonitorConfig(
            **monitor_data.dict(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Convert to dict and ensure URL is a string for MongoDB
        monitor_dict = monitor.dict(by_alias=True)
        if 'url' in monitor_dict:
            monitor_dict['url'] = str(monitor_dict['url'])
        
        # Insert into database
        result = await db.uptime_monitors.insert_one(monitor_dict)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create monitor")
        
        # Retrieve the created monitor
        created_monitor = await db.uptime_monitors.find_one({"_id": result.inserted_id})
        
        # Convert to response format
        response_data = {
            "id": str(created_monitor["_id"]),
            **{k: v for k, v in created_monitor.items() if k != "_id"}
        }
        
        # Ensure headers is a dict, not None
        if response_data.get("headers") is None:
            response_data["headers"] = {}
        
        logger.info(f"Created uptime monitor: {monitor.name} ({result.inserted_id})")
        return UptimeMonitorResponse(**response_data)
        
    except Exception as e:
        logger.error(f"Error creating uptime monitor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create monitor: {str(e)}")


@router.get("/monitors", response_model=List[UptimeMonitorResponse])
async def get_uptime_monitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    tags: Optional[List[str]] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all uptime monitors with optional filtering"""
    try:
        # Build query filter
        query_filter = {}
        if active_only:
            query_filter["is_active"] = True
        if tags:
            query_filter["tags"] = {"$in": tags}
        
        # Get monitors from database
        cursor = db.uptime_monitors.find(query_filter).skip(skip).limit(limit)
        monitors = await cursor.to_list(length=limit)
        
        # Get current stats for each monitor
        response_monitors = []
        for monitor in monitors:
            # Get latest stats
            stats = await get_monitor_stats(str(monitor["_id"]), db)
            
            response_data = {
                "id": str(monitor["_id"]),
                **{k: v for k, v in monitor.items() if k != "_id"},
                "current_status": stats.get("current_status"),
                "uptime_percentage": stats.get("uptime_percentage"),
                "avg_response_time": stats.get("avg_response_time"),
                "last_check_at": stats.get("last_check_at")
            }
            
            # Ensure headers is a dict, not None
            if response_data.get("headers") is None:
                response_data["headers"] = {}
            
            response_monitors.append(UptimeMonitorResponse(**response_data))
        
        return response_monitors
        
    except Exception as e:
        logger.error(f"Error retrieving uptime monitors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve monitors: {str(e)}")


@router.get("/monitors/{monitor_id}", response_model=UptimeMonitorResponse)
async def get_uptime_monitor(
    monitor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific uptime monitor by ID"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not monitor:
            raise HTTPException(status_code=404, detail="Monitor not found")
        
        # Get current stats
        stats = await get_monitor_stats(monitor_id, db)
        
        response_data = {
            "id": str(monitor["_id"]),
            **{k: v for k, v in monitor.items() if k != "_id"},
            "current_status": stats.get("current_status"),
            "uptime_percentage": stats.get("uptime_percentage"),
            "avg_response_time": stats.get("avg_response_time"),
            "last_check_at": stats.get("last_check_at")
        }
        
        return UptimeMonitorResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving uptime monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve monitor: {str(e)}")


@router.put("/monitors/{monitor_id}", response_model=UptimeMonitorResponse)
async def update_uptime_monitor(
    monitor_id: str,
    monitor_data: UpdateUptimeMonitorRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update an existing uptime monitor"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Check if monitor exists
        existing_monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not existing_monitor:
            raise HTTPException(status_code=404, detail="Monitor not found")
        
        # Prepare update data
        update_data = {k: v for k, v in monitor_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Update monitor
        result = await db.uptime_monitors.update_one(
            {"_id": ObjectId(monitor_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update monitor")
        
        # Return updated monitor
        return await get_uptime_monitor(monitor_id, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating uptime monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update monitor: {str(e)}")


@router.delete("/monitors/{monitor_id}")
async def delete_uptime_monitor(
    monitor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete an uptime monitor and all its data"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Check if monitor exists
        existing_monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not existing_monitor:
            raise HTTPException(status_code=404, detail="Monitor not found")
        
        # Delete monitor and all related data
        await db.uptime_monitors.delete_one({"_id": ObjectId(monitor_id)})
        await db.uptime_check_results.delete_many({"monitor_id": ObjectId(monitor_id)})
        await db.uptime_alerts.delete_many({"monitor_id": ObjectId(monitor_id)})
        
        logger.info(f"Deleted uptime monitor: {monitor_id}")
        return {"message": "Monitor deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting uptime monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete monitor: {str(e)}")


@router.get("/monitors/{monitor_id}/results", response_model=List[UptimeCheckResultResponse])
async def get_monitor_results(
    monitor_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    status: Optional[MonitorStatus] = Query(None),
    location: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get check results for a specific monitor"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Build query filter
        query_filter = {"monitor_id": ObjectId(monitor_id)}
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query_filter["checked_at"] = date_filter
        
        if status:
            query_filter["status"] = status
        
        if location:
            query_filter["location"] = location
        
        # Get results from database
        cursor = db.uptime_check_results.find(query_filter).sort("checked_at", -1).skip(skip).limit(limit)
        results = await cursor.to_list(length=limit)
        
        # Convert to response format
        response_results = []
        for result in results:
            response_data = {
                "id": str(result["_id"]),
                "monitor_id": str(result["monitor_id"]),
                **{k: v for k, v in result.items() if k not in ["_id", "monitor_id"]}
            }
            response_results.append(UptimeCheckResultResponse(**response_data))
        
        return response_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving monitor results for {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve results: {str(e)}")


@router.get("/monitors/{monitor_id}/stats")
async def get_monitor_statistics(
    monitor_id: str,
    period_days: int = Query(30, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed statistics for a monitor"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Check if monitor exists
        monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not monitor:
            raise HTTPException(status_code=404, detail="Monitor not found")
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # Get check results for the period
        results = await db.uptime_check_results.find({
            "monitor_id": ObjectId(monitor_id),
            "checked_at": {"$gte": start_date, "$lte": end_date}
        }).to_list(length=None)
        
        if not results:
            return {
                "monitor_id": monitor_id,
                "period_start": start_date,
                "period_end": end_date,
                "total_checks": 0,
                "successful_checks": 0,
                "failed_checks": 0,
                "uptime_percentage": 0.0,
                "avg_response_time": 0.0,
                "min_response_time": 0.0,
                "max_response_time": 0.0,
                "current_status": "unknown",
                "last_check_at": None
            }
        
        # Calculate statistics
        total_checks = len(results)
        successful_checks = len([r for r in results if r["status"] == "up"])
        failed_checks = total_checks - successful_checks
        uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
        
        response_times = [r["response_time"] for r in results if r.get("response_time") is not None]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        
        # Get current status and last check
        latest_result = max(results, key=lambda x: x["checked_at"]) if results else None
        current_status = latest_result["status"] if latest_result else "unknown"
        last_check_at = latest_result["checked_at"] if latest_result else None
        
        # Calculate consecutive failures
        consecutive_failures = 0
        for result in sorted(results, key=lambda x: x["checked_at"], reverse=True):
            if result["status"] != "up":
                consecutive_failures += 1
            else:
                break
        
        return {
            "monitor_id": monitor_id,
            "period_start": start_date,
            "period_end": end_date,
            "total_checks": total_checks,
            "successful_checks": successful_checks,
            "failed_checks": failed_checks,
            "uptime_percentage": round(uptime_percentage, 2),
            "avg_response_time": round(avg_response_time, 2),
            "min_response_time": round(min_response_time, 2),
            "max_response_time": round(max_response_time, 2),
            "current_status": current_status,
            "last_check_at": last_check_at,
            "consecutive_failures": consecutive_failures
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating statistics for monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate statistics: {str(e)}")


@router.post("/monitors/{monitor_id}/test")
async def test_monitor(
    monitor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Perform an immediate test of a monitor"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Get monitor configuration
        monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not monitor:
            raise HTTPException(status_code=404, detail="Monitor not found")
        
        # Import and run the uptime check task
        from tasks.uptime_monitoring import perform_uptime_check
        
        # Perform the check
        result = await perform_uptime_check(monitor_id)
        
        return {
            "message": "Test completed",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to test monitor: {str(e)}")


@router.get("/monitors/{monitor_id}/alerts")
async def get_monitor_alerts(
    monitor_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    resolved: Optional[bool] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get alerts for a specific monitor"""
    try:
        if not ObjectId.is_valid(monitor_id):
            raise HTTPException(status_code=400, detail="Invalid monitor ID")
        
        # Build query filter
        query_filter = {"monitor_id": ObjectId(monitor_id)}
        if resolved is not None:
            query_filter["is_resolved"] = resolved
        
        # Get alerts from database
        cursor = db.uptime_alerts.find(query_filter).sort("triggered_at", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        # Convert to response format
        response_alerts = []
        for alert in alerts:
            response_data = {
                "id": str(alert["_id"]),
                "monitor_id": str(alert["monitor_id"]),
                **{k: v for k, v in alert.items() if k not in ["_id", "monitor_id"]}
            }
            response_alerts.append(response_data)
        
        return response_alerts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving alerts for monitor {monitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")


async def get_monitor_stats(monitor_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Helper function to get basic stats for a monitor"""
    try:
        # Get recent results (last 24 hours)
        start_date = datetime.utcnow() - timedelta(hours=24)
        results = await db.uptime_check_results.find({
            "monitor_id": ObjectId(monitor_id),
            "checked_at": {"$gte": start_date}
        }).to_list(length=None)
        
        if not results:
            return {
                "current_status": None,
                "uptime_percentage": None,
                "avg_response_time": None,
                "last_check_at": None
            }
        
        # Calculate basic stats
        total_checks = len(results)
        successful_checks = len([r for r in results if r["status"] == "up"])
        uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
        
        response_times = [r["response_time"] for r in results if r.get("response_time") is not None]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        latest_result = max(results, key=lambda x: x["checked_at"])
        current_status = latest_result["status"]
        last_check_at = latest_result["checked_at"]
        
        return {
            "current_status": current_status,
            "uptime_percentage": round(uptime_percentage, 2),
            "avg_response_time": round(avg_response_time, 2),
            "last_check_at": last_check_at
        }
        
    except Exception as e:
        logger.error(f"Error calculating stats for monitor {monitor_id}: {str(e)}")
        return {
            "current_status": None,
            "uptime_percentage": None,
            "avg_response_time": None,
            "last_check_at": None
        }