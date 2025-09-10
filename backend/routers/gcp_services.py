from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId

from core.database import get_database
from core.gcp_collections import get_service_collection
from models.gcp import (
    GCPServiceType,
    GCPComputeEngineResponse,
    GCPCloudSQLResponse,
    GCPCloudStorageResponse,
    GCPLoadBalancerResponse,
    GCPKubernetesEngineResponse,
    GCPCloudFunctionsResponse
)
from utils.common import build_aggregation_pipeline, safe_get, extract_network_ip, validate_object_id
from utils.gcp_helpers import (
    extract_zone_from_url, extract_region_from_zone, 
    format_gcp_machine_type, get_gcp_service_status
)

router = APIRouter(tags=["gcp-services"])

# Compute Engine Endpoints
@router.get("/compute-engine", response_model=List[GCPComputeEngineResponse])
async def list_compute_engine_instances(
    credentials_id: Optional[str] = None,
    zone: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Compute Engine instances with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.COMPUTE_ENGINE)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if zone:
            query_filter["zone"] = zone
        if region:
            query_filter["region"] = region
        if status:
            query_filter["status"] = status
            
        # Use aggregation pipeline to get latest records for each resource
        pipeline = build_aggregation_pipeline(query_filter)
        
        cursor = collection.aggregate(pipeline)
        instances = await cursor.to_list(length=None)
        
        return [
            GCPComputeEngineResponse(
                id=str(instance["_id"]),
                credentials_id=str(instance["credentials_id"]),
                resource_id=instance["resource_id"],
                resource_name=safe_get(instance, "name"),
                zone=safe_get(instance, "zone"),
                region=safe_get(instance, "region"),
                machine_type=format_gcp_machine_type(safe_get(instance, "machine_type")),
                status=get_gcp_service_status(safe_get(instance, "status")),
                internal_ip=extract_network_ip(instance.get("metadata", {}), "internal"),
                external_ip=extract_network_ip(instance.get("metadata", {}), "external"),
                network_interfaces=instance.get("metadata", {}).get("network_interfaces", []),
                disks=instance.get("disks", []),
                service_accounts=instance.get("service_accounts", []),
                tags=instance.get("metadata", {}).get("tags", []),
                labels=instance.get("labels", {}),
                metadata=instance.get("metadata", {}),
                monitoring_enabled=instance.get("monitoring_enabled", False),
                created_at=instance["created_at"],
                updated_at=safe_get(instance, "last_updated", instance["created_at"])
            )
            for instance in instances
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Compute Engine instances: {str(e)}")

@router.get("/compute-engine/{instance_id}", response_model=GCPComputeEngineResponse)
async def get_compute_engine_instance(instance_id: str, db=Depends(get_database)):
    """Get a specific Compute Engine instance by ID"""
    try:
        collection = get_service_collection(db, GCPServiceType.COMPUTE_ENGINE)
        instance = await collection.find_one({"_id": ObjectId(instance_id)})
        
        if not instance:
            raise HTTPException(status_code=404, detail="Compute Engine instance not found")
            
        return GCPComputeEngineResponse(
            id=str(instance["_id"]),
            credentials_id=str(instance["credentials_id"]),
            resource_id=instance["resource_id"],
            resource_name=safe_get(instance, "name"),
            zone=safe_get(instance, "zone"),
            region=safe_get(instance, "region"),
            machine_type=format_gcp_machine_type(safe_get(instance, "machine_type")),
            status=get_gcp_service_status(safe_get(instance, "status")),
            internal_ip=extract_network_ip(instance.get("metadata", {}), "internal"),
            external_ip=extract_network_ip(instance.get("metadata", {}), "external"),
            network_interfaces=instance.get("metadata", {}).get("network_interfaces", []),
            disks=instance.get("disks", []),
            service_accounts=instance.get("service_accounts", []),
            tags=instance.get("metadata", {}).get("tags", []),
            labels=instance.get("labels", {}),
            metadata=instance.get("metadata", {}),
            monitoring_enabled=instance.get("monitoring_enabled", False),
            created_at=instance["created_at"],
            updated_at=safe_get(instance, "last_updated", instance["created_at"])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Compute Engine instance: {str(e)}")

# Cloud SQL Endpoints
@router.get("/cloud-sql", response_model=List[GCPCloudSQLResponse])
async def list_cloud_sql_instances(
    credentials_id: Optional[str] = None,
    region: Optional[str] = None,
    database_version: Optional[str] = None,
    state: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Cloud SQL instances with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_SQL)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if region:
            query_filter["region"] = region
        if database_version:
            query_filter["database_version"] = database_version
        if state:
            query_filter["state"] = state
            
        # Use aggregation pipeline to get latest records for each resource
        pipeline = build_aggregation_pipeline(query_filter, sort_field="resource_name", sort_order=1)
        
        cursor = collection.aggregate(pipeline)
        instances = await cursor.to_list(length=None)
        
        return [
            GCPCloudSQLResponse(
                id=str(instance["_id"]),
                credentials_id=instance["credentials_id"],
                resource_id=instance["resource_id"],
                resource_name=instance["resource_name"],
                region=instance.get("region", ""),
                database_version=instance.get("database_version", ""),
                tier=instance.get("tier", ""),
                state=instance.get("state", ""),
                ip_addresses=instance.get("ip_addresses", []),
                connection_name=instance.get("connection_name", ""),
                backend_type=instance.get("backend_type", ""),
                instance_type=instance.get("instance_type", ""),
                storage_size_gb=instance.get("storage_size_gb"),
                storage_type=instance.get("storage_type"),
                backup_enabled=instance.get("backup_enabled", False),
                labels=instance.get("labels", {}),
                settings=instance.get("settings", {}),
                monitoring_enabled=instance.get("monitoring_enabled", False),
                created_at=instance["created_at"],
                updated_at=instance["updated_at"]
            )
            for instance in instances
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Cloud SQL instances: {str(e)}")

@router.get("/cloud-sql/{instance_id}", response_model=GCPCloudSQLResponse)
async def get_cloud_sql_instance(instance_id: str, db=Depends(get_database)):
    """Get a specific Cloud SQL instance by ID"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_SQL)
        instance = await collection.find_one({"_id": ObjectId(instance_id)})
        
        if not instance:
            raise HTTPException(status_code=404, detail="Cloud SQL instance not found")
            
        return GCPCloudSQLResponse(
            id=str(instance["_id"]),
            credentials_id=instance["credentials_id"],
            resource_id=instance["resource_id"],
            resource_name=instance["resource_name"],
            region=instance.get("region", ""),
            database_version=instance.get("database_version", ""),
            tier=instance.get("tier", ""),
            state=instance.get("state", ""),
            ip_addresses=instance.get("ip_addresses", []),
            connection_name=instance.get("connection_name", ""),
            backend_type=instance.get("backend_type", ""),
            instance_type=instance.get("instance_type", ""),
            storage_size_gb=instance.get("storage_size_gb"),
            storage_type=instance.get("storage_type"),
            backup_enabled=instance.get("backup_enabled", False),
            labels=instance.get("labels", {}),
            settings=instance.get("settings", {}),
            monitoring_enabled=instance.get("monitoring_enabled", False),
            created_at=instance["created_at"],
            updated_at=instance["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Cloud SQL instance: {str(e)}")

# Cloud Storage Endpoints
@router.get("/cloud-storage", response_model=List[GCPCloudStorageResponse])
async def list_cloud_storage_buckets(
    credentials_id: Optional[str] = None,
    location: Optional[str] = None,
    storage_class: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Cloud Storage buckets with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_STORAGE)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if location:
            query_filter["location"] = location
        if storage_class:
            query_filter["storage_class"] = storage_class
            
        # Use aggregation pipeline to get latest records
        pipeline = [
            {"$match": query_filter},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$resource_id",
                    "latest_record": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_record"}},
            {"$sort": {"resource_name": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        buckets = await cursor.to_list(length=None)
        
        return [
            GCPCloudStorageResponse(
                id=str(bucket["_id"]),
                credentials_id=bucket["credentials_id"],
                resource_id=bucket["resource_id"],
                resource_name=bucket["resource_name"],
                location=bucket.get("location", ""),
                location_type=bucket.get("location_type", ""),
                storage_class=bucket.get("storage_class", ""),
                versioning_enabled=bucket.get("versioning_enabled", False),
                lifecycle_rules=bucket.get("lifecycle_rules", []),
                cors_config=bucket.get("cors_config", []),
                encryption=bucket.get("encryption"),
                iam_policy=bucket.get("iam_policy"),
                website_config=bucket.get("website_config"),
                logging_config=bucket.get("logging_config"),
                retention_policy=bucket.get("retention_policy"),
                labels=bucket.get("labels", {}),
                monitoring_enabled=bucket.get("monitoring_enabled", False),
                created_at=bucket["created_at"],
                updated_at=bucket["updated_at"]
            )
            for bucket in buckets
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Cloud Storage buckets: {str(e)}")

@router.get("/cloud-storage/{bucket_id}", response_model=GCPCloudStorageResponse)
async def get_cloud_storage_bucket(bucket_id: str, db=Depends(get_database)):
    """Get a specific Cloud Storage bucket by ID"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_STORAGE)
        bucket = await collection.find_one({"_id": ObjectId(bucket_id)})
        
        if not bucket:
            raise HTTPException(status_code=404, detail="Cloud Storage bucket not found")
            
        return GCPCloudStorageResponse(
            id=str(bucket["_id"]),
            credentials_id=bucket["credentials_id"],
            resource_id=bucket["resource_id"],
            resource_name=bucket["resource_name"],
            location=bucket.get("location", ""),
            location_type=bucket.get("location_type", ""),
            storage_class=bucket.get("storage_class", ""),
            versioning_enabled=bucket.get("versioning_enabled", False),
            lifecycle_rules=bucket.get("lifecycle_rules", []),
            cors_config=bucket.get("cors_config", []),
            encryption=bucket.get("encryption"),
            iam_policy=bucket.get("iam_policy"),
            website_config=bucket.get("website_config"),
            logging_config=bucket.get("logging_config"),
            retention_policy=bucket.get("retention_policy"),
            labels=bucket.get("labels", {}),
            monitoring_enabled=bucket.get("monitoring_enabled", False),
            created_at=bucket["created_at"],
            updated_at=bucket["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Cloud Storage bucket: {str(e)}")

# Load Balancer Endpoints
@router.get("/load-balancer", response_model=List[GCPLoadBalancerResponse])
async def list_load_balancers(
    credentials_id: Optional[str] = None,
    region: Optional[str] = None,
    load_balancing_scheme: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Load Balancers with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_LOAD_BALANCER)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if region:
            query_filter["region"] = region
        if load_balancing_scheme:
            query_filter["load_balancing_scheme"] = load_balancing_scheme
            
        # Use aggregation pipeline to get latest records
        pipeline = [
            {"$match": query_filter},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$resource_id",
                    "latest_record": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_record"}},
            {"$sort": {"resource_name": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        load_balancers = await cursor.to_list(length=None)
        
        return [
            GCPLoadBalancerResponse(
                id=str(lb["_id"]),
                credentials_id=lb["credentials_id"],
                resource_id=lb["resource_id"],
                resource_name=lb["resource_name"],
                region=lb.get("region"),
                load_balancing_scheme=lb.get("load_balancing_scheme", ""),
                ip_address=lb.get("ip_address"),
                ip_protocol=lb.get("ip_protocol", ""),
                port_range=lb.get("port_range"),
                backend_service=lb.get("backend_service"),
                url_map=lb.get("url_map"),
                target_proxy=lb.get("target_proxy"),
                forwarding_rules=lb.get("forwarding_rules", []),
                health_checks=lb.get("health_checks", []),
                labels=lb.get("labels", {}),
                monitoring_enabled=lb.get("monitoring_enabled", False),
                created_at=lb["created_at"],
                updated_at=lb["updated_at"]
            )
            for lb in load_balancers
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Load Balancers: {str(e)}")

# Kubernetes Engine Endpoints
@router.get("/kubernetes-engine", response_model=List[GCPKubernetesEngineResponse])
async def list_kubernetes_clusters(
    credentials_id: Optional[str] = None,
    zone: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Kubernetes Engine clusters with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.KUBERNETES_ENGINE)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if zone:
            query_filter["zone"] = zone
        if region:
            query_filter["region"] = region
        if status:
            query_filter["status"] = status
            
        # Use aggregation pipeline to get latest records
        pipeline = [
            {"$match": query_filter},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$resource_id",
                    "latest_record": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_record"}},
            {"$sort": {"resource_name": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        clusters = await cursor.to_list(length=None)
        
        return [
            GCPKubernetesEngineResponse(
                id=str(cluster["_id"]),
                credentials_id=cluster["credentials_id"],
                resource_id=cluster["resource_id"],
                resource_name=cluster["resource_name"],
                zone=cluster.get("zone"),
                region=cluster.get("region"),
                status=cluster.get("status", ""),
                current_master_version=cluster.get("current_master_version", ""),
                current_node_version=cluster.get("current_node_version", ""),
                initial_node_count=cluster.get("initial_node_count", 0),
                current_node_count=cluster.get("current_node_count", 0),
                endpoint=cluster.get("endpoint", ""),
                network=cluster.get("network", ""),
                subnetwork=cluster.get("subnetwork"),
                node_pools=cluster.get("node_pools", []),
                addons_config=cluster.get("addons_config", {}),
                master_auth=cluster.get("master_auth", {}),
                logging_service=cluster.get("logging_service"),
                monitoring_service=cluster.get("monitoring_service"),
                labels=cluster.get("labels", {}),
                monitoring_enabled=cluster.get("monitoring_enabled", False),
                created_at=cluster["created_at"],
                updated_at=cluster["updated_at"]
            )
            for cluster in clusters
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Kubernetes clusters: {str(e)}")

# Cloud Functions Endpoints
@router.get("/cloud-functions", response_model=List[GCPCloudFunctionsResponse])
async def list_cloud_functions(
    credentials_id: Optional[str] = None,
    region: Optional[str] = None,
    runtime: Optional[str] = None,
    status: Optional[str] = None,
    db=Depends(get_database)
):
    """List all Cloud Functions with optional filtering"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_FUNCTIONS)
        
        # Build query filter
        query_filter = {}
        if credentials_id:
            query_filter["credentials_id"] = credentials_id
        if region:
            query_filter["region"] = region
        if runtime:
            query_filter["runtime"] = runtime
        if status:
            query_filter["status"] = status
            
        # Use aggregation pipeline to get latest records
        pipeline = [
            {"$match": query_filter},
            {"$sort": {"created_at": -1}},
            {
                "$group": {
                    "_id": "$resource_id",
                    "latest_record": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_record"}},
            {"$sort": {"resource_name": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        functions = await cursor.to_list(length=None)
        
        return [
            GCPCloudFunctionsResponse(
                id=str(func["_id"]),
                credentials_id=func["credentials_id"],
                resource_id=func["resource_id"],
                resource_name=func["resource_name"],
                region=func.get("region", ""),
                status=func.get("status", ""),
                runtime=func.get("runtime", ""),
                entry_point=func.get("entry_point", ""),
                source_archive_url=func.get("source_archive_url"),
                source_repository=func.get("source_repository"),
                https_trigger=func.get("https_trigger"),
                event_trigger=func.get("event_trigger"),
                timeout=func.get("timeout"),
                available_memory_mb=func.get("available_memory_mb"),
                max_instances=func.get("max_instances"),
                min_instances=func.get("min_instances"),
                environment_variables=func.get("environment_variables", {}),
                build_environment_variables=func.get("build_environment_variables", {}),
                labels=func.get("labels", {}),
                monitoring_enabled=func.get("monitoring_enabled", False),
                created_at=func["created_at"],
                updated_at=func["updated_at"]
            )
            for func in functions
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list Cloud Functions: {str(e)}")

@router.get("/cloud-functions/{function_id}", response_model=GCPCloudFunctionsResponse)
async def get_cloud_function(function_id: str, db=Depends(get_database)):
    """Get a specific Cloud Function by ID"""
    try:
        collection = get_service_collection(db, GCPServiceType.CLOUD_FUNCTIONS)
        func = await collection.find_one({"_id": ObjectId(function_id)})
        
        if not func:
            raise HTTPException(status_code=404, detail="Cloud Function not found")
            
        return GCPCloudFunctionsResponse(
            id=str(func["_id"]),
            credentials_id=func["credentials_id"],
            resource_id=func["resource_id"],
            resource_name=func["resource_name"],
            region=func.get("region", ""),
            status=func.get("status", ""),
            runtime=func.get("runtime", ""),
            entry_point=func.get("entry_point", ""),
            source_archive_url=func.get("source_archive_url"),
            source_repository=func.get("source_repository"),
            https_trigger=func.get("https_trigger"),
            event_trigger=func.get("event_trigger"),
            timeout=func.get("timeout"),
            available_memory_mb=func.get("available_memory_mb"),
            max_instances=func.get("max_instances"),
            min_instances=func.get("min_instances"),
            environment_variables=func.get("environment_variables", {}),
            build_environment_variables=func.get("build_environment_variables", {}),
            labels=func.get("labels", {}),
            monitoring_enabled=func.get("monitoring_enabled", False),
            created_at=func["created_at"],
            updated_at=func["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Cloud Function: {str(e)}")