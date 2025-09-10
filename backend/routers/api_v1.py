from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.database import get_database
from models.uptime import UptimeMonitorResponse, CreateUptimeMonitorRequest, UpdateUptimeMonitorRequest
from routers.uptime import get_uptime_monitors, create_uptime_monitor, get_uptime_monitor, update_uptime_monitor, delete_uptime_monitor
from routers import auth

router = APIRouter()

# Include auth router
router.include_router(auth.router)


@router.get("/")
async def api_info():
    """API version information"""
    return {
        "message": "Orion-Nexus API v1",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "devices": "/api/v1/devices",
            "ssl": "/api/v1/ssl",
            "diagnostics": "/api/v1/diagnostics",
            "monitors": "/api/v1/monitors",
            "uptime": "/api/v1/uptime"
        }
    }


@router.get("/status")
async def api_status():
    """API status check"""
    return {
        "status": "operational",
        "api_version": "1.0.0"
    }


# Monitors endpoints (alias for uptime monitors)
@router.get("/monitors", response_model=List[UptimeMonitorResponse])
async def get_monitors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True),
    tags: Optional[List[str]] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all monitors (alias for uptime monitors)"""
    return await get_uptime_monitors(skip, limit, active_only, tags, db)


@router.post("/monitors", response_model=UptimeMonitorResponse)
async def create_monitor(
    monitor_data: CreateUptimeMonitorRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new monitor (alias for uptime monitor)"""
    return await create_uptime_monitor(monitor_data, db)


@router.get("/monitors/{monitor_id}", response_model=UptimeMonitorResponse)
async def get_monitor(
    monitor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific monitor (alias for uptime monitor)"""
    return await get_uptime_monitor(monitor_id, db)


@router.put("/monitors/{monitor_id}", response_model=UptimeMonitorResponse)
async def update_monitor(
    monitor_id: str,
    monitor_data: UpdateUptimeMonitorRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update a monitor (alias for uptime monitor)"""
    return await update_uptime_monitor(monitor_id, monitor_data, db)


@router.delete("/monitors/{monitor_id}")
async def delete_monitor(
    monitor_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a monitor (alias for uptime monitor)"""
    return await delete_uptime_monitor(monitor_id, db)