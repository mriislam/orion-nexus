from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Depends
from typing import Dict, List, Any, Optional
from services.firebase_service import firebase_analytics_service
from core.database import get_database
from models.analytics import GACredentials, GACredentialsCreate, GACredentialsResponse
from bson import ObjectId
from datetime import datetime
import logging
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/firebase-analytics",
    tags=["Firebase Analytics"]
)

@router.get("/status")
async def get_connection_status(db=Depends(get_database)) -> Dict[str, Any]:
    """Get Firebase Analytics connection status."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        is_connected = firebase_analytics_service.is_connected()
        return {
            "connected": is_connected,
            "status": "Connected to Firebase Analytics" if is_connected else "Not connected to Firebase Analytics",
            "service": "Firebase Analytics"
        }
    except Exception as e:
        logger.error(f"Error checking Firebase Analytics status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check connection status")

@router.get("/overview")
async def get_overview_metrics(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get Firebase Analytics overview metrics."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        metrics = await firebase_analytics_service.get_overview_metrics(days=days)
        return {
            "success": True,
            "data": metrics,
            "period_days": days,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching overview metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch overview metrics")

@router.get("/top-pages")
async def get_top_pages(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of pages to return"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get top pages by page views."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        pages = await firebase_analytics_service.get_top_pages(days=days, limit=limit)
        return {
            "success": True,
            "data": pages,
            "period_days": days,
            "limit": limit,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching top pages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch top pages")

@router.get("/demographics")
async def get_user_demographics(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get user demographics data."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        demographics = await firebase_analytics_service.get_user_demographics(days=days)
        return {
            "success": True,
            "data": demographics,
            "period_days": days,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching user demographics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user demographics")

@router.get("/events")
async def get_top_events(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of events to return"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get top events data."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        events = await firebase_analytics_service.get_top_events(days=days, limit=limit)
        return {
            "success": True,
            "data": events,
            "period_days": days,
            "limit": limit,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching top events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch top events")

@router.get("/audiences")
async def get_audience_data(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get audience segmentation data."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        audience = await firebase_analytics_service.get_audience_data(days=days)
        return {
            "success": True,
            "data": audience,
            "period_days": days,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching audience data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch audience data")

@router.get("/funnels")
async def get_funnel_data(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get funnel analysis data."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        funnel = await firebase_analytics_service.get_funnel_data(days=days)
        return {
            "success": True,
            "data": funnel,
            "period_days": days,
            "connected": firebase_analytics_service.is_connected()
        }
    except Exception as e:
        logger.error(f"Error fetching funnel data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch funnel data")

@router.get("/metrics")
async def get_all_metrics(
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch data for"),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Get all Firebase Analytics metrics in a single response."""
    try:
        # Initialize service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        
        # Fetch all data concurrently
        overview_task = firebase_analytics_service.get_overview_metrics(days=days)
        pages_task = firebase_analytics_service.get_top_pages(days=days, limit=10)
        demographics_task = firebase_analytics_service.get_user_demographics(days=days)
        events_task = firebase_analytics_service.get_top_events(days=days, limit=10)
        audience_task = firebase_analytics_service.get_audience_data(days=days)
        funnel_task = firebase_analytics_service.get_funnel_data(days=days)
        
        # Wait for all tasks to complete
        overview = await overview_task
        top_pages = await pages_task
        demographics = await demographics_task
        events = await events_task
        audience = await audience_task
        funnel = await funnel_task
        
        return {
            "success": True,
            "data": {
                "overview": overview,
                "topPages": top_pages,
                "demographics": demographics,
                "events": events,
                "audience": audience,
                "funnel": funnel
            },
            "period_days": days,
            "connected": firebase_analytics_service.is_connected(),
            "timestamp": None
        }
    except Exception as e:
        logger.error(f"Error fetching all metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch metrics")

@router.post("/reconnect")
async def reconnect_firebase(db=Depends(get_database)) -> Dict[str, Any]:
    """Attempt to reconnect to Firebase Analytics."""
    try:
        # Reinitialize the Firebase service with database credentials
        await firebase_analytics_service.initialize_from_database(db)
        is_connected = firebase_analytics_service.is_connected()
        
        return {
            "success": True,
            "connected": is_connected,
            "message": "Reconnection successful" if is_connected else "Reconnection failed - check configuration"
        }
    except Exception as e:
        logger.error(f"Error reconnecting to Firebase Analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reconnect to Firebase Analytics")

@router.get("/config")
async def get_configuration() -> Dict[str, Any]:
    """Get Firebase Analytics configuration status."""
    try:
        import os
        
        config_status = {
            "google_application_credentials": bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS')),
            "firebase_project_id": bool(os.getenv('FIREBASE_PROJECT_ID')),
            "ga4_property_id": bool(os.getenv('GA4_PROPERTY_ID')),
            "credentials_file_exists": False
        }
        
        # Check if credentials file exists
        creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        if creds_path:
            config_status["credentials_file_exists"] = os.path.exists(creds_path)
        
        return {
            "success": True,
            "configuration": config_status,
            "connected": firebase_analytics_service.is_connected(),
            "required_env_vars": [
                "GOOGLE_APPLICATION_CREDENTIALS",
                "FIREBASE_PROJECT_ID", 
                "GA4_PROPERTY_ID"
            ]
        }
    except Exception as e:
        logger.error(f"Error getting configuration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get configuration")

@router.post("/config")
async def save_config(
    service_account_file: UploadFile = File(...),
    firebase_project_id: str = Form(...),
    ga4_property_id: str = Form(...),
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Save Firebase Analytics configuration to database"""
    try:
        # Validate file type
        if not service_account_file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Service account file must be a JSON file")
        
        # Read and validate JSON content
        content = await service_account_file.read()
        try:
            service_account_data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
        
        # Validate required fields in service account JSON
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in service_account_data]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Service account JSON missing required fields: {', '.join(missing_fields)}"
            )
        
        # Check if credentials with same property_id already exist
        existing = await db.ga_credentials.find_one({"property_id": ga4_property_id})
        if existing:
            # Update existing credentials
            update_data = {
                "service_account_json": content.decode('utf-8'),
                "service_account_email": service_account_data.get('client_email'),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            await db.ga_credentials.update_one(
                {"_id": existing["_id"]},
                {"$set": update_data}
            )
            credentials_id = str(existing["_id"])
        else:
            # Create new credentials
            creds_doc = GACredentials(
                user_id="default",  # For now, using default user
                property_id=ga4_property_id,
                service_account_json=content.decode('utf-8'),
                service_account_email=service_account_data.get('client_email'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                is_active=True
            )
            
            result = await db.ga_credentials.insert_one(creds_doc.dict(by_alias=True, exclude={"id"}))
            credentials_id = str(result.inserted_id)
        
        # Also save to config files for backward compatibility (optional)
        config_dir = Path("config")
        config_dir.mkdir(exist_ok=True)
        
        service_account_path = config_dir / "firebase_service_account.json"
        with open(service_account_path, "w") as f:
            json.dump(service_account_data, f, indent=2)
        
        config_data = {
            "FIREBASE_SERVICE_ACCOUNT_PATH": str(service_account_path.absolute()),
            "FIREBASE_PROJECT_ID": firebase_project_id,
            "GA4_PROPERTY_ID": ga4_property_id
        }
        
        config_file_path = config_dir / "firebase_config.json"
        with open(config_file_path, "w") as f:
            json.dump(config_data, f, indent=2)
        
        # Update environment variables for current session
        os.environ.update(config_data)
        
        logger.info(
            f"Firebase Analytics configuration saved to database - project_id: {firebase_project_id}, property_id: {ga4_property_id}"
        )
        
        return {
            "success": True,
            "message": "Firebase Analytics configuration saved successfully to database",
            "data": {
                "credentials_id": credentials_id,
                "firebase_project_id": firebase_project_id,
                "ga4_property_id": ga4_property_id,
                "service_account_configured": True,
                "stored_in_database": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
         logger.error(f"Error saving Firebase Analytics configuration: {str(e)}")
         raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")

@router.post("/config/test")
async def test_config(
    service_account_file: UploadFile = File(...),
    firebase_project_id: str = Form(...),
    ga4_property_id: str = Form(...)
) -> Dict[str, Any]:
    """Test Firebase Analytics configuration without saving"""
    try:
        # Validate file type
        if not service_account_file.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Service account file must be a JSON file")
        
        # Read and validate JSON content
        content = await service_account_file.read()
        try:
            service_account_data = json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
        
        # Validate required fields in service account JSON
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in service_account_data]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Service account JSON missing required fields: {', '.join(missing_fields)}"
            )
        
        # Validate service account type
        if service_account_data.get('type') != 'service_account':
            raise HTTPException(
                status_code=400, 
                detail="Invalid service account type. Expected 'service_account'"
            )
        
        # Validate project ID matches
        if service_account_data.get('project_id') != firebase_project_id:
            logger.warning(
                f"Project ID mismatch - service_account_project: {service_account_data.get('project_id')}, provided_project: {firebase_project_id}"
            )
        
        # Test Firebase Analytics connection (basic validation)
        try:
            from services.firebase_service import firebase_analytics_service
            # Create temporary service instance for testing
            test_result = await firebase_analytics_service.test_connection(
                service_account_data, firebase_project_id, ga4_property_id
            )
        except Exception as conn_error:
            logger.warning(f"Connection test failed: {str(conn_error)}")
            test_result = {
                "connection_status": "warning",
                "message": "Configuration appears valid but connection test failed. This may be due to API permissions or network issues."
            }
        
        logger.info(
            f"Firebase Analytics configuration tested - project_id: {firebase_project_id}, property_id: {ga4_property_id}, test_status: {test_result.get('connection_status', 'unknown')}"
        )
        
        return {
            "success": True,
            "message": "Configuration validation completed",
            "data": {
                "firebase_project_id": firebase_project_id,
                "ga4_property_id": ga4_property_id,
                "service_account_valid": True,
                "project_id_match": service_account_data.get('project_id') == firebase_project_id,
                "test_result": test_result
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing Firebase Analytics configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to test configuration: {str(e)}")


# Database-based Firebase Analytics Credentials Management
@router.post("/credentials", response_model=GACredentialsResponse)
async def create_firebase_credentials(
    credentials: GACredentialsCreate,
    db=Depends(get_database)
) -> GACredentialsResponse:
    """Create new Firebase Analytics credentials configuration"""
    try:
        # Validate service account JSON
        try:
            service_account_data = json.loads(credentials.service_account_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid service account JSON")
        
        # Validate required fields
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        missing_fields = [field for field in required_fields if field not in service_account_data]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Service account JSON missing required fields: {', '.join(missing_fields)}"
            )
        
        # Check if credentials with same property_id already exist
        existing = await db.ga_credentials.find_one({"property_id": credentials.property_id})
        if existing:
            raise HTTPException(status_code=400, detail="Credentials for this GA4 property already exist")
        
        # Create credentials document
        creds_doc = GACredentials(
            user_id="default",  # For now, using default user
            property_id=credentials.property_id,
            service_account_json=credentials.service_account_json,
            service_account_email=service_account_data.get('client_email'),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True
        )
        
        # Insert into database
        result = await db.ga_credentials.insert_one(creds_doc.dict(by_alias=True, exclude={"id"}))
        
        # Return response
        return GACredentialsResponse(
            id=str(result.inserted_id),
            property_id=credentials.property_id,
            service_account_email=service_account_data.get('client_email'),
            created_at=creds_doc.created_at,
            updated_at=creds_doc.updated_at,
            is_active=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Firebase Analytics credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create credentials: {str(e)}")


@router.get("/credentials", response_model=List[GACredentialsResponse])
async def list_firebase_credentials(db=Depends(get_database)) -> List[GACredentialsResponse]:
    """List all Firebase Analytics credentials configurations"""
    try:
        cursor = db.ga_credentials.find({})
        credentials = await cursor.to_list(length=None)
        
        return [
            GACredentialsResponse(
                id=str(cred["_id"]),
                property_id=cred["property_id"],
                service_account_email=cred.get("service_account_email"),
                created_at=cred["created_at"],
                updated_at=cred["updated_at"],
                is_active=cred.get("is_active", True)
            )
            for cred in credentials
        ]
        
    except Exception as e:
        logger.error(f"Error listing Firebase Analytics credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list credentials: {str(e)}")


@router.get("/credentials/{credentials_id}", response_model=GACredentialsResponse)
async def get_firebase_credentials(
    credentials_id: str,
    db=Depends(get_database)
) -> GACredentialsResponse:
    """Get specific Firebase Analytics credentials configuration"""
    try:
        cred = await db.ga_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not cred:
            raise HTTPException(status_code=404, detail="Firebase Analytics credentials not found")
        
        return GACredentialsResponse(
            id=str(cred["_id"]),
            property_id=cred["property_id"],
            service_account_email=cred.get("service_account_email"),
            created_at=cred["created_at"],
            updated_at=cred["updated_at"],
            is_active=cred.get("is_active", True)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Firebase Analytics credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get credentials: {str(e)}")


@router.delete("/credentials/{credentials_id}")
async def delete_firebase_credentials(
    credentials_id: str,
    db=Depends(get_database)
) -> Dict[str, Any]:
    """Delete Firebase Analytics credentials configuration"""
    try:
        result = await db.ga_credentials.delete_one({"_id": ObjectId(credentials_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Firebase Analytics credentials not found")
        
        return {
            "success": True,
            "message": "Firebase Analytics credentials deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting Firebase Analytics credentials: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete credentials: {str(e)}")