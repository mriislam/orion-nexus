import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import logging
from celery import current_task
from motor.motor_asyncio import AsyncIOMotorDatabase

from tasks.celery_app import celery_app
from core.database import get_database, init_db
from services.ssl_checker import SSLChecker
from models.ssl import SSLCheck, SSLCheckResponse

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.ssl_monitoring.task_check_all_ssl_certificates")
def task_check_all_ssl_certificates(self):
    """Celery task to check all SSL certificates"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_check_all_ssl_certificates_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_check_all_ssl_certificates: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=3)


async def _check_all_ssl_certificates_async() -> Dict[str, Any]:
    """Async function to check all SSL certificates"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    ssl_checker = SSLChecker()
    
    results = {
        "total_domains": 0,
        "successful_checks": 0,
        "failed_checks": 0,
        "expiring_soon": 0,
        "expired": 0,
        "errors": []
    }
    
    try:
        # Get all unique domains from ssl_checks collection
        domains_cursor = db.ssl_checks.aggregate([
            {"$group": {"_id": "$domain", "latest_check": {"$max": "$timestamp"}}},
            {"$project": {"domain": "$_id", "_id": 0}}
        ])
        
        domains = await domains_cursor.to_list(length=None)
        results["total_domains"] = len(domains)
        
        if not domains:
            logger.info("No domains found for SSL checking")
            return results
        
        # Check each domain
        for domain_doc in domains:
            domain = domain_doc["domain"]
            
            try:
                # Perform SSL check
                ssl_result = await ssl_checker.check_domain(domain)
                
                if ssl_result["success"]:
                    # Create SSL check record
                    ssl_check = SSLCheckResponse(
                        domain=domain,
                        timestamp=datetime.now(timezone.utc),
                        is_valid=ssl_result["is_valid"],
                        is_expired=ssl_result["is_expired"],
                        days_until_expiry=ssl_result["days_until_expiry"],
                        expires_at=ssl_result["expires_at"],
                        issued_at=ssl_result["issued_at"],
                        issuer=ssl_result["issuer"],
                        subject=ssl_result["subject"],
                        common_name=ssl_result["common_name"],
                        san_domains=ssl_result["san_domains"],
                        serial_number=ssl_result["serial_number"],
                        signature_algorithm=ssl_result["signature_algorithm"],
                        public_key_algorithm=ssl_result["public_key_algorithm"],
                        key_size=ssl_result["key_size"],
                        response_time=ssl_result["response_time"]
                    )
                    
                    # Store in database
                    await db.ssl_checks.insert_one(ssl_check.dict())
                    
                    results["successful_checks"] += 1
                    
                    # Check if expiring soon (within 30 days)
                    if ssl_result["days_until_expiry"] is not None:
                        if ssl_result["days_until_expiry"] <= 0:
                            results["expired"] += 1
                        elif ssl_result["days_until_expiry"] <= 30:
                            results["expiring_soon"] += 1
                    
                    logger.debug(f"Successfully checked SSL for domain {domain}")
                else:
                    # Store failed check
                    ssl_check = SSLCheckResponse(
                        domain=domain,
                        timestamp=datetime.now(timezone.utc),
                        is_valid=False,
                        error_message=ssl_result.get("error"),
                        response_time=ssl_result.get("response_time")
                    )
                    
                    await db.ssl_checks.insert_one(ssl_check.dict())
                    
                    results["failed_checks"] += 1
                    results["errors"].append({
                        "domain": domain,
                        "error": ssl_result.get("error", "Unknown error")
                    })
                    
                    logger.warning(f"Failed to check SSL for domain {domain}: {ssl_result.get('error')}")
                    
            except Exception as e:
                logger.error(f"Error checking SSL for domain {domain}: {str(e)}")
                results["failed_checks"] += 1
                results["errors"].append({
                    "domain": domain,
                    "error": str(e)
                })
                
                # Store error record
                try:
                    ssl_check = SSLCheckResponse(
                        domain=domain,
                        timestamp=datetime.now(timezone.utc),
                        is_valid=False,
                        error_message=str(e)
                    )
                    await db.ssl_checks.insert_one(ssl_check.dict())
                except Exception:
                    pass
        
        logger.info(f"SSL checking completed: {results['successful_checks']}/{results['total_domains']} successful")
        
        # Generate alerts for expiring certificates
        if results["expiring_soon"] > 0 or results["expired"] > 0:
            await _generate_ssl_alerts(db, results["expiring_soon"], results["expired"])
        
    except Exception as e:
        logger.error(f"Error in SSL checking task: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


@celery_app.task(bind=True, name="tasks.ssl_monitoring.task_check_single_domain")
def task_check_single_domain(self, domain: str):
    """Celery task to check SSL certificate for a single domain"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_check_single_domain_async(domain))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_check_single_domain: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=3)


async def _check_single_domain_async(domain: str) -> Dict[str, Any]:
    """Async function to check SSL certificate for a single domain"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    ssl_checker = SSLChecker()
    
    try:
        # Perform SSL check
        ssl_result = await ssl_checker.check_domain(domain)
        
        if ssl_result["success"]:
            # Create SSL check record
            ssl_check = SSLCheckResponse(
                domain=domain,
                timestamp=datetime.now(timezone.utc),
                is_valid=ssl_result["is_valid"],
                is_expired=ssl_result["is_expired"],
                days_until_expiry=ssl_result["days_until_expiry"],
                expires_at=ssl_result["expires_at"],
                issued_at=ssl_result["issued_at"],
                issuer=ssl_result["issuer"],
                subject=ssl_result["subject"],
                common_name=ssl_result["common_name"],
                san_domains=ssl_result["san_domains"],
                serial_number=ssl_result["serial_number"],
                signature_algorithm=ssl_result["signature_algorithm"],
                public_key_algorithm=ssl_result["public_key_algorithm"],
                key_size=ssl_result["key_size"],
                response_time=ssl_result["response_time"]
            )
            
            # Store in database
            await db.ssl_checks.insert_one(ssl_check.dict())
            
            return {
                "success": True,
                "domain": domain,
                "is_valid": ssl_result["is_valid"],
                "days_until_expiry": ssl_result["days_until_expiry"],
                "expires_at": ssl_result["expires_at"].isoformat() if ssl_result["expires_at"] else None
            }
        else:
            # Store failed check
            ssl_check = SSLCheckResponse(
                domain=domain,
                timestamp=datetime.now(timezone.utc),
                is_valid=False,
                error_message=ssl_result.get("error"),
                response_time=ssl_result.get("response_time")
            )
            
            await db.ssl_checks.insert_one(ssl_check.dict())
            
            return {
                "success": False,
                "domain": domain,
                "error": ssl_result.get("error", "Unknown error")
            }
            
    except Exception as e:
        logger.error(f"Error checking SSL for domain {domain}: {str(e)}")
        
        # Store error record
        try:
            ssl_check = SSLCheckResponse(
                domain=domain,
                timestamp=datetime.now(timezone.utc),
                is_valid=False,
                error_message=str(e)
            )
            await db.ssl_checks.insert_one(ssl_check.dict())
        except Exception:
            pass
        
        return {
            "success": False,
            "domain": domain,
            "error": str(e)
        }


@celery_app.task(bind=True, name="tasks.ssl_monitoring.task_check_multiple_domains")
def task_check_multiple_domains(self, domains: List[str]):
    """Celery task to check SSL certificates for multiple domains"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_check_multiple_domains_async(domains))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_check_multiple_domains: {str(e)}")
        raise self.retry(exc=e, countdown=120, max_retries=3)


async def _check_multiple_domains_async(domains: List[str]) -> Dict[str, Any]:
    """Async function to check SSL certificates for multiple domains"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    ssl_checker = SSLChecker()
    
    results = {
        "total_domains": len(domains),
        "successful_checks": 0,
        "failed_checks": 0,
        "results": []
    }
    
    try:
        # Check all domains concurrently
        ssl_results = await ssl_checker.check_multiple_domains(domains)
        
        for domain, ssl_result in ssl_results.items():
            try:
                if ssl_result["success"]:
                    # Create SSL check record
                    ssl_check = SSLCheckResponse(
                        domain=domain,
                        timestamp=datetime.now(timezone.utc),
                        is_valid=ssl_result["is_valid"],
                        is_expired=ssl_result["is_expired"],
                        days_until_expiry=ssl_result["days_until_expiry"],
                        expires_at=ssl_result["expires_at"],
                        issued_at=ssl_result["issued_at"],
                        issuer=ssl_result["issuer"],
                        subject=ssl_result["subject"],
                        common_name=ssl_result["common_name"],
                        san_domains=ssl_result["san_domains"],
                        serial_number=ssl_result["serial_number"],
                        signature_algorithm=ssl_result["signature_algorithm"],
                        public_key_algorithm=ssl_result["public_key_algorithm"],
                        key_size=ssl_result["key_size"],
                        response_time=ssl_result["response_time"]
                    )
                    
                    results["successful_checks"] += 1
                else:
                    # Create failed check record
                    ssl_check = SSLCheckResponse(
                        domain=domain,
                        timestamp=datetime.now(timezone.utc),
                        is_valid=False,
                        error_message=ssl_result.get("error"),
                        response_time=ssl_result.get("response_time")
                    )
                    
                    results["failed_checks"] += 1
                
                # Store in database
                await db.ssl_checks.insert_one(ssl_check.dict())
                
                # Add to results
                results["results"].append({
                    "domain": domain,
                    "success": ssl_result["success"],
                    "is_valid": ssl_result.get("is_valid"),
                    "days_until_expiry": ssl_result.get("days_until_expiry"),
                    "error": ssl_result.get("error")
                })
                
            except Exception as e:
                logger.error(f"Error processing SSL result for domain {domain}: {str(e)}")
                results["failed_checks"] += 1
                results["results"].append({
                    "domain": domain,
                    "success": False,
                    "error": str(e)
                })
        
        logger.info(f"Multiple domain SSL checking completed: {results['successful_checks']}/{results['total_domains']} successful")
        
    except Exception as e:
        logger.error(f"Error in multiple domain SSL checking: {str(e)}")
        results["error"] = str(e)
    
    return results


async def _generate_ssl_alerts(db: AsyncIOMotorDatabase, expiring_count: int, expired_count: int):
    """Generate alerts for expiring/expired SSL certificates"""
    try:
        alert_data = {
            "type": "ssl_certificate",
            "severity": "warning" if expired_count == 0 else "critical",
            "title": "SSL Certificate Alert",
            "message": f"{expired_count} certificates expired, {expiring_count} expiring within 30 days",
            "timestamp": datetime.now(timezone.utc),
            "metadata": {
                "expired_count": expired_count,
                "expiring_count": expiring_count
            }
        }
        
        await db.alerts.insert_one(alert_data)
        logger.info(f"Generated SSL alert: {alert_data['message']}")
        
    except Exception as e:
        logger.error(f"Error generating SSL alert: {str(e)}")


@celery_app.task(bind=True, name="tasks.ssl_monitoring.task_cleanup_old_ssl_data")
def task_cleanup_old_ssl_data(self, days_to_keep: int = 90):
    """Celery task to cleanup old SSL check data"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_cleanup_old_ssl_data_async(days_to_keep))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_cleanup_old_ssl_data: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)


async def _cleanup_old_ssl_data_async(days_to_keep: int) -> Dict[str, Any]:
    """Async function to cleanup old SSL data"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Cleanup old SSL check records
        result = await db.ssl_checks.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} SSL check records older than {days_to_keep} days")
        
        return {
            "success": True,
            "records_deleted": result.deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old SSL data: {str(e)}")
        return {"success": False, "error": str(e)}