from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from models.ssl import SSLCheck, SSLCheckCreate, SSLCheckResponse
from core.database import get_database
from services.ssl_checker import SSLChecker

router = APIRouter()
ssl_checker = SSLChecker()


@router.post("/check", response_model=SSLCheckResponse)
async def create_ssl_check(ssl_check: SSLCheckCreate, db=Depends(get_database)):
    """Create a new SSL certificate check"""
    # Perform SSL check
    try:
        ssl_info = await ssl_checker.check_certificate(ssl_check.domain, ssl_check.port)
        
        # Create SSL check record
        check_data = {
            "domain": ssl_check.domain,
            "port": ssl_check.port,
            "timestamp": datetime.utcnow(),
            "is_valid": ssl_info["is_valid"],
            "expires_at": ssl_info["expires_at"],
            "days_until_expiry": ssl_info["days_until_expiry"],
            "issuer": ssl_info["issuer"],
            "subject": ssl_info["subject"],
            "serial_number": ssl_info["serial_number"],
            "signature_algorithm": ssl_info["signature_algorithm"],
            "error_message": ssl_info.get("error_message")
        }
        
        # Insert into database
        result = await db.ssl_checks.insert_one(check_data)
        
        # Return response
        return SSLCheckResponse(
            id=str(result.inserted_id),
            **check_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SSL check failed: {str(e)}")


@router.get("/", response_model=List[SSLCheckResponse])
async def get_ssl_checks(
    skip: int = 0,
    limit: int = 100,
    domain: Optional[str] = None,
    days: Optional[int] = 7,
    db=Depends(get_database)
):
    """Get SSL checks with optional filtering"""
    query = {}
    
    if domain:
        query["domain"] = domain
    
    if days:
        since_date = datetime.utcnow() - timedelta(days=days)
        query["timestamp"] = {"$gte": since_date}
    
    cursor = db.ssl_checks.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    ssl_checks = await cursor.to_list(length=limit)
    
    return [
        SSLCheckResponse(
            id=str(check["_id"]),
            **{k: v for k, v in check.items() if k != "_id"}
        )
        for check in ssl_checks
    ]


@router.get("/{domain}", response_model=List[SSLCheckResponse])
async def get_ssl_checks_for_domain(
    domain: str,
    days: Optional[int] = 30,
    db=Depends(get_database)
):
    """Get SSL check history for a specific domain"""
    query = {"domain": domain}
    
    if days:
        since_date = datetime.utcnow() - timedelta(days=days)
        query["timestamp"] = {"$gte": since_date}
    
    cursor = db.ssl_checks.find(query).sort("timestamp", -1)
    ssl_checks = await cursor.to_list(length=None)
    
    return [
        SSLCheckResponse(
            id=str(check["_id"]),
            **{k: v for k, v in check.items() if k != "_id"}
        )
        for check in ssl_checks
    ]


@router.get("/{domain}/latest")
async def get_latest_ssl_check(domain: str, db=Depends(get_database)):
    """Get the latest SSL check for a domain"""
    ssl_check = await db.ssl_checks.find_one(
        {"domain": domain},
        sort=[("timestamp", -1)]
    )
    
    if not ssl_check:
        raise HTTPException(status_code=404, detail="No SSL checks found for this domain")
    
    return SSLCheckResponse(
        id=str(ssl_check["_id"]),
        **{k: v for k, v in ssl_check.items() if k != "_id"}
    )


@router.get("/expiring/soon")
async def get_expiring_certificates(
    days: int = 30,
    db=Depends(get_database)
):
    """Get certificates expiring within specified days"""
    # Get latest check for each domain
    pipeline = [
        {
            "$sort": {"timestamp": -1}
        },
        {
            "$group": {
                "_id": "$domain",
                "latest_check": {"$first": "$$ROOT"}
            }
        },
        {
            "$replaceRoot": {"newRoot": "$latest_check"}
        },
        {
            "$match": {
                "days_until_expiry": {"$lte": days, "$gte": 0},
                "is_valid": True
            }
        },
        {
            "$sort": {"days_until_expiry": 1}
        }
    ]
    
    expiring_certs = await db.ssl_checks.aggregate(pipeline).to_list(length=None)
    
    return [
        SSLCheckResponse(
            id=str(cert["_id"]),
            **{k: v for k, v in cert.items() if k != "_id"}
        )
        for cert in expiring_certs
    ]


@router.delete("/{domain}")
async def delete_ssl_checks(domain: str, db=Depends(get_database)):
    """Delete all SSL checks for a domain"""
    result = await db.ssl_checks.delete_many({"domain": domain})
    
    return {
        "message": f"Deleted {result.deleted_count} SSL checks for domain {domain}"
    }