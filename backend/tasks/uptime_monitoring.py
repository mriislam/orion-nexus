import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import logging
from celery import current_task
from motor.motor_asyncio import AsyncIOMotorDatabase

from tasks.celery_app import celery_app
from core.database import get_database, init_db
from services.network_diagnostics import NetworkDiagnostics
from models.uptime import (
    UptimeMonitorConfig,
    UptimeCheckResult,
    UptimeAlert,
    MonitorStatus
)
from models.diagnostics import UptimeCheck, UptimeCheckResponse, CheckType, PingResult, HTTPResult, PortResult

logger = logging.getLogger(__name__)


@celery_app.task
def check_all_uptime():
    """Check uptime for all active monitors"""
    try:
        logger.info("Starting uptime checks for all active monitors")
        
        # Run the async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_check_all_uptime_async())
        loop.close()
        
        return result
        
    except Exception as e:
        logger.error(f"Error in uptime monitoring: {str(e)}")
        return {"status": "error", "error": str(e)}


async def _check_all_uptime_async():
    """Async implementation of uptime checking"""
    try:
        # Initialize database connection for this worker process
        await init_db()
        db = await get_database()
        
        # Get all active monitors
        monitors = await db.uptime_monitors.find({"is_active": True}).to_list(length=None)
        
        if not monitors:
            logger.info("No active monitors found")
            return {"status": "completed", "monitors_checked": 0}
        
        checked_count = 0
        results = []
        
        # Check each monitor
        for monitor in monitors:
            try:
                # Check if it's time to run this monitor
                last_check = await db.uptime_check_results.find_one(
                    {"monitor_id": monitor["_id"]},
                    sort=[("checked_at", -1)]
                )
                
                if last_check:
                    time_since_last = datetime.utcnow() - last_check["checked_at"]
                    if time_since_last.total_seconds() < monitor["check_interval"]:
                        continue  # Skip this monitor, not time yet
                
                # Perform the check
                result = await perform_uptime_check(str(monitor["_id"]))
                results.append(result)
                checked_count += 1
                
            except Exception as e:
                logger.error(f"Error checking monitor {monitor['_id']}: {str(e)}")
                continue
        
        logger.info(f"Completed uptime checks: {checked_count} monitors checked")
        return {
            "status": "completed",
            "monitors_checked": checked_count,
            "results": results,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in async uptime checking: {str(e)}")
        raise


async def perform_uptime_check(monitor_id: str) -> Dict[str, Any]:
    """Perform uptime check for a specific monitor"""
    try:
        logger.info(f"Starting uptime check for monitor ID: {monitor_id}")
        db = await get_database()
        
        # Get monitor configuration
        from bson import ObjectId
        monitor = await db.uptime_monitors.find_one({"_id": ObjectId(monitor_id)})
        if not monitor:
            raise ValueError(f"Monitor {monitor_id} not found")
        
        logger.info(f"Found monitor: {monitor.get('name', 'Unknown')}, URL: {monitor.get('url', 'No URL')}")
        logger.debug(f"Monitor expected_content: {repr(monitor.get('expected_content'))}")
        logger.debug(f"Monitor data keys: {list(monitor.keys()) if monitor else 'None'}")
        
        # Perform the HTTP check
        logger.debug(f"About to call _perform_web_http_check")
        check_result = await _perform_web_http_check(monitor)
        logger.debug(f"_perform_web_http_check returned: {check_result}")
        
        # Store the result
        logger.info(f"Creating UptimeCheckResult with data: {check_result}")
        try:
            result_doc = UptimeCheckResult(
                monitor_id=monitor_id,
                location=check_result.get("location", "default"),
                status=check_result["status"],
                response_time=check_result.get("response_time"),
                status_code=check_result.get("status_code"),
                content_match=check_result.get("content_match"),
                error_message=check_result.get("error_message"),
                response_headers=check_result.get("response_headers", {}),
                response_size=check_result.get("response_size"),
                ssl_expiry=check_result.get("ssl_expiry"),
                dns_resolution_time=check_result.get("dns_resolution_time"),
                tcp_connection_time=check_result.get("tcp_connection_time"),
                tls_handshake_time=check_result.get("tls_handshake_time"),
                redirect_count=check_result.get("redirect_count", 0),
                retry_count=check_result.get("retry_count", 0),
                checked_at=datetime.utcnow()
            )
            logger.info(f"UptimeCheckResult created successfully")
        except Exception as model_error:
            logger.error(f"Error creating UptimeCheckResult: {str(model_error)}")
            raise
        
        await db.uptime_check_results.insert_one(result_doc.dict(by_alias=True))
        
        # Check for alerts
        await _check_and_trigger_alerts(monitor, check_result, db)
        
        logger.info(f"Uptime check completed for {monitor.get('name', 'Unknown')}: {check_result.get('status', 'Unknown')}")
        return check_result
        
    except Exception as e:
        logger.error(f"Error performing uptime check for {monitor_id}: {str(e)}")
        # Return a failed result instead of raising to prevent task failure
        return {
            "status": MonitorStatus.DOWN,
            "error_message": str(e),
            "response_time": None,
            "status_code": None
        }


async def _perform_web_http_check(monitor: Dict[str, Any]) -> Dict[str, Any]:
    """Perform the actual HTTP check for web application monitoring"""
    import aiohttp
    import ssl
    import socket
    import time
    from urllib.parse import urlparse
    
    logger.debug(f"Starting HTTP check for monitor: {monitor.get('name', 'Unknown')}")
    logger.debug(f"Monitor data: {monitor}")
    logger.debug(f"Monitor type: {type(monitor)}")
    logger.debug(f"Monitor keys: {list(monitor.keys()) if monitor else 'None'}")
    
    start_time = time.time()
    result = {
        "status": MonitorStatus.DOWN,
        "location": "default",
        "retry_count": 0
    }
    
    # Parse URL for SSL check
    parsed_url = urlparse(monitor["url"])
    is_https = parsed_url.scheme == "https"
    
    # Prepare request headers
    logger.debug(f"Getting headers from monitor...")
    headers = monitor.get("headers", {}) or {}
    logger.debug(f"Headers retrieved: {headers}, type: {type(headers)}")
    try:
        logger.debug(f"Checking if User-Agent in headers...")
        if "User-Agent" not in headers:
            headers["User-Agent"] = "UptimeMonitor/1.0"
        logger.debug(f"Headers after User-Agent check: {headers}")
    except TypeError as e:
        logger.error(f"TypeError in headers check: {str(e)}, headers type: {type(headers)}, headers value: {headers}")
        headers = {"User-Agent": "UptimeMonitor/1.0"}
    
    # Configure SSL context
    logger.debug(f"Configuring SSL context for HTTPS: {is_https}")
    ssl_context = None
    if is_https:
        ssl_context = ssl.create_default_context()
        logger.debug(f"Getting verify_ssl setting from monitor...")
        verify_ssl = monitor.get("verify_ssl", True)
        logger.debug(f"verify_ssl: {verify_ssl}")
        if not verify_ssl:
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
    
    # Perform retries
    logger.debug(f"Getting max_retries from monitor...")
    max_retries = monitor.get("max_retries", 3)
    logger.debug(f"max_retries: {max_retries}")
    
    for retry in range(max_retries + 1):
        try:
            logger.debug(f"Starting retry {retry} of {max_retries}")
            result["retry_count"] = retry
            
            # Create aiohttp session with timeout
            logger.debug(f"Getting timeout from monitor...")
            timeout_value = monitor.get("timeout", 30)
            logger.debug(f"timeout_value: {timeout_value}")
            timeout = aiohttp.ClientTimeout(total=timeout_value)
            
            async with aiohttp.ClientSession(
                timeout=timeout,
                connector=aiohttp.TCPConnector(ssl=ssl_context)
            ) as session:
                
                # Prepare request data
                logger.debug(f"Getting method from monitor...")
                method = monitor.get("method", "GET")
                logger.debug(f"method: {method}")
                logger.debug(f"Getting body from monitor...")
                body = monitor.get("body")
                logger.debug(f"body: {body}")
                data = body if method in ["POST", "PUT", "PATCH"] else None
                logger.debug(f"data: {data}")
                
                # Perform the request with timing
                request_start = time.time()
                
                async with session.request(
                    method=method,
                    url=monitor["url"],
                    headers=headers,
                    data=data,
                    allow_redirects=monitor.get("follow_redirects", True)
                ) as response:
                    
                    response_time = (time.time() - request_start) * 1000  # Convert to ms
                    
                    # Read response content
                    content = await response.text()
                    if content is None:
                        content = ""
                    
                    # Update result
                    result.update({
                        "response_time": round(response_time, 2),
                        "status_code": response.status,
                        "response_headers": dict(response.headers),
                        "response_size": len(content.encode('utf-8')),
                        "redirect_count": len(response.history)
                    })
                    
                    # Check status code
                    logger.debug(f"Getting expected_status_code from monitor...")
                    expected_status = monitor.get("expected_status_code", 200)
                    logger.debug(f"expected_status: {expected_status}, actual status: {response.status}")
                    if response.status == expected_status:
                        result["status"] = MonitorStatus.UP
                        logger.debug(f"Status check passed")
                        
                        # Check content if specified
                        logger.debug(f"Getting expected_content from monitor...")
                        expected_content = monitor.get("expected_content")
                        logger.info(f"Expected content: {repr(expected_content)}, Content type: {type(expected_content)}")
                        logger.info(f"Response content type: {type(content)}, Content length: {len(content) if content else 0}")
                        
                        if expected_content is not None and isinstance(expected_content, str) and expected_content.strip():
                            if content is None:
                                content_match = False
                                result["error_message"] = "Response content is None"
                            elif not isinstance(content, str):
                                content_match = False
                                result["error_message"] = f"Response content is not a string: {type(content)}"
                            else:
                                try:
                                    logger.info(f"About to check: {repr(expected_content)} in {type(content)} (len={len(content)})")
                                    content_match = expected_content in content
                                    logger.info(f"Content match result: {content_match}")
                                except TypeError as e:
                                    logger.error(f"TypeError in content matching: {str(e)}")
                                    content_match = False
                                    result["error_message"] = f"Content matching error: {str(e)}"
                            result["content_match"] = content_match
                            if not content_match:
                                result["status"] = MonitorStatus.DEGRADED
                                if result.get("error_message") is None:
                                    result["error_message"] = f"Expected content '{expected_content}' not found"
                        else:
                            result["content_match"] = True
                    else:
                        result["status"] = MonitorStatus.DOWN
                        result["error_message"] = f"Expected status {expected_status}, got {response.status}"
                    
                    # Get SSL certificate info for HTTPS
                    if is_https:
                        logger.debug(f"Getting verify_ssl for SSL info...")
                        verify_ssl = monitor.get("verify_ssl", True)
                        logger.debug(f"verify_ssl for SSL info: {verify_ssl}")
                        if verify_ssl:
                            try:
                                ssl_info = await _get_ssl_info(parsed_url.hostname, parsed_url.port or 443)
                                result["ssl_expiry"] = ssl_info.get("expiry")
                            except Exception as ssl_e:
                                logger.warning(f"Could not get SSL info: {str(ssl_e)}")
                    
                    # If successful, break out of retry loop
                    try:
                        logger.debug(f"Checking if should break retry loop, status: {result.get('status')}")
                        if result.get("status") in [MonitorStatus.UP, MonitorStatus.DEGRADED]:
                            logger.debug(f"Breaking retry loop due to successful status")
                            break
                    except TypeError as e:
                        logger.error(f"TypeError in status check: {str(e)}, result status: {result.get('status')}, type: {type(result.get('status'))}")
                        break
                        
        except asyncio.TimeoutError:
            result["error_message"] = "Request timeout"
            result["status"] = MonitorStatus.DOWN
        except aiohttp.ClientError as e:
            result["error_message"] = f"Client error: {str(e)}"
            result["status"] = MonitorStatus.DOWN
        except Exception as e:
            result["error_message"] = f"Unexpected error: {str(e)}"
            result["status"] = MonitorStatus.DOWN
        
        # If this was the last retry, break
        if retry == max_retries:
            break
        
        # Wait before retry (exponential backoff)
        if retry < max_retries:
            await asyncio.sleep(2 ** retry)
    
    return result


async def _get_ssl_info(hostname: str, port: int) -> Dict[str, Any]:
    """Get SSL certificate information"""
    import ssl
    import socket
    
    try:
        # Create SSL context
        context = ssl.create_default_context()
        
        # Connect and get certificate
        with socket.create_connection((hostname, port), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Parse expiry date
                expiry_str = cert.get('notAfter')
                if expiry_str:
                    expiry_date = datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
                    return {"expiry": expiry_date}
                
    except Exception as e:
        logger.warning(f"Error getting SSL info for {hostname}:{port}: {str(e)}")
    
    return {}


async def _check_and_trigger_alerts(monitor: Dict[str, Any], check_result: Dict[str, Any], db):
    """Check if alerts should be triggered based on check result"""
    try:
        if not monitor.get("alert_on_failure", True):
            return
        
        monitor_id = monitor["_id"]
        current_status = check_result["status"]
        
        # Get recent check results to determine consecutive failures
        recent_results = await db.uptime_check_results.find(
            {"monitor_id": monitor_id},
            sort=[("checked_at", -1)],
            limit=monitor.get("alert_threshold", 1)
        ).to_list(length=None)

        # Count consecutive failures
        consecutive_failures = 0
        if recent_results is not None:
            for result in recent_results:
                if result["status"] != MonitorStatus.UP:
                    consecutive_failures += 1
                else:
                    break
        
        # Add current failure if applicable
        if current_status != MonitorStatus.UP:
            consecutive_failures += 1
        
        # Check if we should trigger an alert
        alert_threshold = monitor.get("alert_threshold", 1)
        
        if consecutive_failures >= alert_threshold and current_status != MonitorStatus.UP:
            # Check if we already have an unresolved alert
            existing_alert = await db.uptime_alerts.find_one({
                "monitor_id": monitor_id,
                "is_resolved": False,
                "alert_type": "down"
            })
            
            if not existing_alert:
                # Create new alert
                alert = UptimeAlert(
                    monitor_id=monitor_id,
                    alert_type="down",
                    severity="critical" if consecutive_failures > alert_threshold else "warning",
                    message=f"Monitor '{monitor['name']}' is down. {consecutive_failures} consecutive failures.",
                    triggered_at=datetime.utcnow(),
                    metadata={
                        "consecutive_failures": consecutive_failures,
                        "last_error": check_result.get("error_message"),
                        "last_status_code": check_result.get("status_code")
                    }
                )
                
                await db.uptime_alerts.insert_one(alert.dict(by_alias=True))
                logger.warning(f"Alert triggered for monitor {monitor['name']}: {alert.message}")
        
        elif current_status == MonitorStatus.UP:
            # Resolve any existing down alerts
            await db.uptime_alerts.update_many(
                {
                    "monitor_id": monitor_id,
                    "is_resolved": False,
                    "alert_type": "down"
                },
                {
                    "$set": {
                        "is_resolved": True,
                        "resolved_at": datetime.utcnow()
                    }
                }
            )
        
        # Check for slow response time alerts
        response_time = check_result.get("response_time")
        if response_time and response_time > 5000:  # 5 seconds
            existing_slow_alert = await db.uptime_alerts.find_one({
                "monitor_id": monitor_id,
                "is_resolved": False,
                "alert_type": "slow"
            })
            
            if not existing_slow_alert:
                alert = UptimeAlert(
                    monitor_id=monitor_id,
                    alert_type="slow",
                    severity="warning",
                    message=f"Monitor '{monitor['name']}' is responding slowly: {response_time:.0f}ms",
                    triggered_at=datetime.utcnow(),
                    metadata={"response_time": response_time}
                )
                
                await db.uptime_alerts.insert_one(alert.dict(by_alias=True))
                logger.warning(f"Slow response alert for monitor {monitor['name']}: {response_time:.0f}ms")
        
    except Exception as e:
        logger.error(f"Error checking alerts for monitor {monitor['_id']}: {str(e)}")


@celery_app.task(bind=True, name="tasks.uptime_monitoring.task_perform_all_uptime_checks")
def task_perform_all_uptime_checks(self):
    """Celery task to perform all uptime checks"""
    try:
        # Check if there's already an event loop running
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, create a new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
        except RuntimeError:
            # No event loop exists, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(_perform_all_uptime_checks_async())
        return result
    except Exception as e:
        logger.error(f"Error in uptime checking task: {str(e)}")
        return {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "ping_checks": 0,
            "http_checks": 0,
            "port_checks": 0,
            "errors": [{"general_error": str(e)}]
        }


async def _perform_all_uptime_checks_async() -> Dict[str, Any]:
    """Async function to perform all uptime checks"""
    try:
        # Initialize database connection for this task
        await init_db()
        db = await get_database()
        
        if db is None:
            logger.error("Database connection is None")
            return {
                "total_checks": 0,
                "successful_checks": 0,
                "failed_checks": 0,
                "ping_checks": 0,
                "http_checks": 0,
                "port_checks": 0,
                "errors": [{"general_error": "Database connection failed"}]
            }
        
        network_diagnostics = NetworkDiagnostics()
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return {
            "total_checks": 0,
            "successful_checks": 0,
            "failed_checks": 0,
            "ping_checks": 0,
            "http_checks": 0,
            "port_checks": 0,
            "errors": [{"general_error": f"Database initialization failed: {str(e)}"}]
        }
    
    results = {
        "total_checks": 0,
        "successful_checks": 0,
        "failed_checks": 0,
        "ping_checks": 0,
        "http_checks": 0,
        "port_checks": 0,
        "errors": []
    }
    
    try:
        # Get all active uptime monitors
        monitors = await db.uptime_monitors.find({"is_active": True}).to_list(length=None)
        results["total_checks"] = len(monitors)
        
        if not monitors:
            logger.info("No active monitors found for uptime checking")
            return results
        
        # Perform checks for each monitor
        for monitor in monitors:
            monitor_id = str(monitor["_id"])
            
            try:
                # Perform uptime check for this monitor
                check_result = await perform_uptime_check(monitor_id)
                results["http_checks"] += 1
                
                if check_result.get("status") == MonitorStatus.UP:
                    results["successful_checks"] += 1
                else:
                    results["failed_checks"] += 1
                    results["errors"].append({
                        "monitor_id": monitor_id,
                        "monitor_name": monitor.get("name", "Unknown"),
                        "url": monitor.get("url", "Unknown"),
                        "error": check_result.get("error_message")
                    })
                    
            except Exception as e:
                logger.error(f"Error performing uptime check for monitor {monitor_id}: {str(e)}")
                results["failed_checks"] += 1
                results["errors"].append({
                    "monitor_id": monitor_id,
                    "monitor_name": monitor.get("name", "Unknown"),
                    "url": monitor.get("url", "Unknown"),
                    "error": str(e)
                })
        
        logger.info(f"Uptime checking completed: {results['successful_checks']}/{results['total_checks']} successful")
        
        # Generate alerts for failed checks
        if results["failed_checks"] > 0:
            await _generate_uptime_alerts(db, results["failed_checks"], results["errors"])
        
    except Exception as e:
        logger.error(f"Error in uptime checking task: {str(e)}")
        results["errors"].append({"general_error": str(e)})
    
    return results


async def _perform_ping_check(db: AsyncIOMotorDatabase, network_diagnostics: NetworkDiagnostics, target: str) -> Dict[str, Any]:
    """Perform ping check for a target"""
    try:
        # Perform ping
        ping_result = await network_diagnostics.ping_host(target)
        
        # Create ping result object
        ping_data = PingResult(
            is_up=ping_result["is_up"],
            response_time=ping_result["response_time"],
            packet_loss=ping_result["packet_loss"],
            packets_sent=ping_result.get("packets_sent"),
            packets_received=ping_result.get("packets_received"),
            min_time=ping_result.get("min_time"),
            max_time=ping_result.get("max_time"),
            avg_time=ping_result.get("avg_time")
        )
        
        # Create uptime check record
        uptime_check = UptimeCheckResponse(
            target=target,
            check_type=CheckType.PING,
            timestamp=datetime.now(timezone.utc),
            is_up=ping_result["is_up"],
            response_time=ping_result["response_time"],
            ping_result=ping_data,
            error_message=ping_result.get("error_message")
        )
        
        # Store in database
        await db.uptime_check_results.insert_one(uptime_check.dict())
        
        logger.debug(f"Successfully performed ping check for {target}")
        return {"success": True, "is_up": ping_result["is_up"]}
        
    except Exception as e:
        logger.error(f"Error performing ping check for {target}: {str(e)}")
        
        # Store error record
        try:
            uptime_check = UptimeCheckResponse(
                target=target,
                check_type=CheckType.PING,
                timestamp=datetime.now(timezone.utc),
                is_up=False,
                error_message=str(e)
            )
            await db.uptime_check_results.insert_one(uptime_check.dict())
        except Exception:
            pass
        
        return {"success": False, "error": str(e)}


async def _perform_http_check(db: AsyncIOMotorDatabase, network_diagnostics: NetworkDiagnostics, target: str) -> Dict[str, Any]:
    """Perform HTTP check for a target"""
    try:
        # Perform HTTP check
        http_result = await network_diagnostics.http_check(target)
        
        # Create HTTP result object
        http_data = HTTPResult(
            is_up=http_result["is_up"],
            response_time=http_result["response_time"],
            status_code=http_result.get("status_code"),
            response_size=http_result.get("response_size"),
            redirect_count=http_result.get("redirect_count"),
            final_url=http_result.get("final_url"),
            server=http_result.get("server"),
            content_type=http_result.get("content_type")
        )
        
        # Create uptime check record
        uptime_check = UptimeCheckResponse(
            target=target,
            check_type=CheckType.HTTP,
            timestamp=datetime.now(timezone.utc),
            is_up=http_result["is_up"],
            response_time=http_result["response_time"],
            http_result=http_data,
            error_message=http_result.get("error_message")
        )
        
        # Store in database
        await db.uptime_check_results.insert_one(uptime_check.dict())
        
        logger.debug(f"Successfully performed HTTP check for {target}")
        return {"success": True, "is_up": http_result["is_up"]}
        
    except Exception as e:
        logger.error(f"Error performing HTTP check for {target}: {str(e)}")
        
        # Store error record
        try:
            uptime_check = UptimeCheckResponse(
                target=target,
                check_type=CheckType.HTTP,
                timestamp=datetime.now(timezone.utc),
                is_up=False,
                error_message=str(e)
            )
            await db.uptime_check_results.insert_one(uptime_check.dict())
        except Exception:
            pass
        
        return {"success": False, "error": str(e)}


async def _perform_port_check(db: AsyncIOMotorDatabase, network_diagnostics: NetworkDiagnostics, target: str, port: int) -> Dict[str, Any]:
    """Perform port check for a target"""
    try:
        # Perform port check
        port_result = await network_diagnostics.port_check(target, port)
        
        # Create port result object
        port_data = PortResult(
            is_up=port_result["is_up"],
            response_time=port_result["response_time"],
            port=port
        )
        
        # Create uptime check record
        uptime_check = UptimeCheckResponse(
            target=target,
            check_type=CheckType.PORT,
            timestamp=datetime.now(timezone.utc),
            port=port,
            is_up=port_result["is_up"],
            response_time=port_result["response_time"],
            port_result=port_data,
            error_message=port_result.get("error_message")
        )
        
        # Store in database
        await db.uptime_check_results.insert_one(uptime_check.dict())
        
        logger.debug(f"Successfully performed port check for {target}:{port}")
        return {"success": True, "is_up": port_result["is_up"]}
        
    except Exception as e:
        logger.error(f"Error performing port check for {target}:{port}: {str(e)}")
        
        # Store error record
        try:
            uptime_check = UptimeCheckResponse(
                target=target,
                check_type=CheckType.PORT,
                timestamp=datetime.now(timezone.utc),
                port=port,
                is_up=False,
                error_message=str(e)
            )
            await db.uptime_check_results.insert_one(uptime_check.dict())
        except Exception:
            pass
        
        return {"success": False, "error": str(e)}


@celery_app.task(bind=True, name="tasks.uptime_monitoring.task_perform_single_check")
def task_perform_single_check(self, target: str, check_type: str, port: int = None):
    """Celery task to perform a single uptime check"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_perform_single_check_async(target, check_type, port))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_perform_single_check: {str(e)}")
        raise self.retry(exc=e, countdown=30, max_retries=3)


async def _perform_single_check_async(target: str, check_type: str, port: int = None) -> Dict[str, Any]:
    """Async function to perform a single uptime check"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    network_diagnostics = NetworkDiagnostics()
    
    try:
        check_type_enum = CheckType(check_type)
        
        if check_type_enum == CheckType.PING:
            result = await _perform_ping_check(db, network_diagnostics, target)
        elif check_type_enum == CheckType.HTTP:
            result = await _perform_http_check(db, network_diagnostics, target)
        elif check_type_enum == CheckType.PORT:
            if port is None:
                return {"success": False, "error": "Port number required for port check"}
            result = await _perform_port_check(db, network_diagnostics, target, port)
        else:
            return {"success": False, "error": f"Unknown check type: {check_type}"}
        
        return result
        
    except Exception as e:
        logger.error(f"Error performing single check for {target}: {str(e)}")
        return {"success": False, "error": str(e)}


@celery_app.task(bind=True, name="tasks.uptime_monitoring.task_perform_traceroute")
def task_perform_traceroute(self, target: str):
    """Celery task to perform traceroute"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_perform_traceroute_async(target))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_perform_traceroute: {str(e)}")
        raise self.retry(exc=e, countdown=60, max_retries=2)


async def _perform_traceroute_async(target: str) -> Dict[str, Any]:
    """Async function to perform traceroute"""
    # Initialize database connection for this worker process
    await init_db()
    network_diagnostics = NetworkDiagnostics()
    
    try:
        # Perform traceroute
        traceroute_result = await network_diagnostics.traceroute(target)
        
        return {
            "success": True,
            "target": target,
            "destination_ip": traceroute_result["destination_ip"],
            "hops": traceroute_result["hops"],
            "total_hops": traceroute_result["total_hops"],
            "completed": traceroute_result["completed"],
            "error_message": traceroute_result.get("error_message")
        }
        
    except Exception as e:
        logger.error(f"Error performing traceroute for {target}: {str(e)}")
        return {
            "success": False,
            "target": target,
            "error": str(e)
        }


async def _generate_uptime_alerts(db: AsyncIOMotorDatabase, failed_count: int, errors: List[Dict[str, Any]]):
    """Generate alerts for failed uptime checks with comprehensive monitoring"""
    try:
        # Group errors by target
        target_errors = {}
        for error in errors:
            target = error.get("target", "unknown")
            if target not in target_errors:
                target_errors[target] = []
            target_errors[target].append(error)
        
        # Create alert for each failed target with enhanced metadata
        for target, target_error_list in target_errors.items():
            # Check for consecutive failures to determine severity
            recent_failures = await db.uptime_check_results.count_documents({
                "target": target,
                "is_up": False,
                "timestamp": {"$gte": datetime.now(timezone.utc) - timedelta(minutes=30)}
            })
            
            severity = "critical" if recent_failures >= 3 else "warning"
            
            alert_data = {
                "type": "uptime_check",
                "severity": severity,
                "title": f"Uptime Check Failed: {target}",
                "message": f"Multiple uptime checks failed for {target} ({recent_failures} failures in last 30 minutes)",
                "timestamp": datetime.now(timezone.utc),
                "metadata": {
                    "target": target,
                    "failed_checks": len(target_error_list),
                    "consecutive_failures": recent_failures,
                    "errors": target_error_list,
                    "alert_threshold_reached": recent_failures >= 3
                }
            }
            
            # Check if similar alert already exists to avoid spam
            existing_alert = await db.alerts.find_one({
                "type": "uptime_check",
                "metadata.target": target,
                "timestamp": {"$gte": datetime.now(timezone.utc) - timedelta(hours=1)}
            })
            
            if not existing_alert:
                await db.alerts.insert_one(alert_data)
                logger.warning(f"Generated {severity} uptime alert for {target}")
            else:
                logger.debug(f"Skipped duplicate alert for {target}")
        
        logger.info(f"Processed uptime alerts for {len(target_errors)} targets")
        
    except Exception as e:
        logger.error(f"Error generating uptime alerts: {str(e)}")


@celery_app.task(bind=True, name="tasks.uptime_monitoring.task_cleanup_old_uptime_data")
def task_cleanup_old_uptime_data(self, days_to_keep: int = 30):
    """Celery task to cleanup old uptime check data"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_cleanup_old_uptime_data_async(days_to_keep))
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Error in task_cleanup_old_uptime_data: {str(e)}")
        raise self.retry(exc=e, countdown=300, max_retries=2)


async def _cleanup_old_uptime_data_async(days_to_keep: int) -> Dict[str, Any]:
    """Async function to cleanup old uptime data"""
    # Initialize database connection for this worker process
    await init_db()
    db = await get_database()
    
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        # Cleanup old uptime check records
        result = await db.uptime_check_results.delete_many({
            "checked_at": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} uptime check records older than {days_to_keep} days")
        
        return {
            "success": True,
            "records_deleted": result.deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up old uptime data: {str(e)}")
        return {"success": False, "error": str(e)}