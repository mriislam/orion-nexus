from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from models.diagnostics import UptimeCheck, UptimeCheckCreate, UptimeCheckResponse
from core.database import get_database
from services.network_diagnostics import NetworkDiagnostics

router = APIRouter()
network_diagnostics = NetworkDiagnostics()


@router.post("/ping", response_model=UptimeCheckResponse)
async def ping_host(uptime_check: UptimeCheckCreate, db=Depends(get_database)):
    """Perform a ping test to a host"""
    try:
        ping_result = await network_diagnostics.ping_host(
            uptime_check.target,
            uptime_check.timeout or 5
        )
        
        # Create uptime check record
        check_data = {
            "target": uptime_check.target,
            "check_type": "ping",
            "timestamp": datetime.utcnow(),
            "is_up": ping_result["is_up"],
            "response_time": ping_result["response_time"],
            "packet_loss": ping_result.get("packet_loss", 0),
            "error_message": ping_result.get("error_message")
        }
        
        # Insert into database
        result = await db.uptime_checks.insert_one(check_data)
        
        return UptimeCheckResponse(
            id=str(result.inserted_id),
            **check_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ping failed: {str(e)}")


@router.post("/http", response_model=UptimeCheckResponse)
async def http_check(uptime_check: UptimeCheckCreate, db=Depends(get_database)):
    """Perform an HTTP/HTTPS check"""
    try:
        http_result = await network_diagnostics.http_check(
            uptime_check.target,
            uptime_check.timeout or 10,
            uptime_check.expected_status_code or 200
        )
        
        # Create uptime check record
        check_data = {
            "target": uptime_check.target,
            "check_type": "http",
            "timestamp": datetime.utcnow(),
            "is_up": http_result["is_up"],
            "response_time": http_result["response_time"],
            "status_code": http_result.get("status_code"),
            "error_message": http_result.get("error_message")
        }
        
        # Insert into database
        result = await db.uptime_checks.insert_one(check_data)
        
        return UptimeCheckResponse(
            id=str(result.inserted_id),
            **check_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"HTTP check failed: {str(e)}")


@router.post("/port", response_model=UptimeCheckResponse)
async def port_check(uptime_check: UptimeCheckCreate, db=Depends(get_database)):
    """Perform a TCP port check"""
    if not uptime_check.port:
        raise HTTPException(status_code=400, detail="Port is required for port check")
    
    try:
        port_result = await network_diagnostics.port_check(
            uptime_check.target,
            uptime_check.port,
            uptime_check.timeout or 5
        )
        
        # Create uptime check record
        check_data = {
            "target": uptime_check.target,
            "port": uptime_check.port,
            "check_type": "port",
            "timestamp": datetime.utcnow(),
            "is_up": port_result["is_up"],
            "response_time": port_result["response_time"],
            "error_message": port_result.get("error_message")
        }
        
        # Insert into database
        result = await db.uptime_checks.insert_one(check_data)
        
        return UptimeCheckResponse(
            id=str(result.inserted_id),
            **check_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Port check failed: {str(e)}")


@router.get("/", response_model=List[UptimeCheckResponse])
async def get_uptime_checks(
    skip: int = 0,
    limit: int = 100,
    target: Optional[str] = None,
    check_type: Optional[str] = None,
    days: Optional[int] = 7,
    db=Depends(get_database)
):
    """Get uptime checks with optional filtering"""
    query = {}
    
    if target:
        query["target"] = target
    
    if check_type:
        query["check_type"] = check_type
    
    if days:
        since_date = datetime.utcnow() - timedelta(days=days)
        query["timestamp"] = {"$gte": since_date}
    
    cursor = db.uptime_checks.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    uptime_checks = await cursor.to_list(length=limit)
    
    return [
        UptimeCheckResponse(
            id=str(check["_id"]),
            **{k: v for k, v in check.items() if k != "_id"}
        )
        for check in uptime_checks
    ]


@router.get("/{target}/uptime")
async def get_uptime_stats(
    target: str,
    days: Optional[int] = 30,
    db=Depends(get_database)
):
    """Get uptime statistics for a target"""
    query = {"target": target}
    
    if days:
        since_date = datetime.utcnow() - timedelta(days=days)
        query["timestamp"] = {"$gte": since_date}
    
    # Get all checks for the target
    checks = await db.uptime_checks.find(query).to_list(length=None)
    
    if not checks:
        raise HTTPException(status_code=404, detail="No uptime data found for this target")
    
    # Calculate statistics
    total_checks = len(checks)
    successful_checks = sum(1 for check in checks if check["is_up"])
    uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
    
    # Calculate average response time for successful checks
    successful_response_times = [
        check["response_time"] for check in checks 
        if check["is_up"] and check["response_time"] is not None
    ]
    avg_response_time = (
        sum(successful_response_times) / len(successful_response_times)
        if successful_response_times else None
    )
    
    return {
        "target": target,
        "period_days": days,
        "total_checks": total_checks,
        "successful_checks": successful_checks,
        "failed_checks": total_checks - successful_checks,
        "uptime_percentage": round(uptime_percentage, 2),
        "average_response_time": round(avg_response_time, 2) if avg_response_time else None,
        "last_check": max(checks, key=lambda x: x["timestamp"])["timestamp"] if checks else None
    }


@router.get("/traceroute/{target}")
async def traceroute(target: str, max_hops: int = 30):
    """Perform a traceroute to a target"""
    try:
        traceroute_result = await network_diagnostics.traceroute(target, max_hops)
        return traceroute_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Traceroute failed: {str(e)}")


@router.delete("/{target}")
async def delete_uptime_checks(target: str, db=Depends(get_database)):
    """Delete all uptime checks for a target"""
    result = await db.uptime_checks.delete_many({"target": target})
    
    return {
        "message": f"Deleted {result.deleted_count} uptime checks for target {target}"
    }