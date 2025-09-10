from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.gcp import GCPServiceType

# Define collection names for each GCP service type
GCP_SERVICE_COLLECTIONS = {
    GCPServiceType.COMPUTE_ENGINE: "gcp_compute_engine",
    GCPServiceType.CLOUD_SQL: "gcp_cloud_sql", 
    GCPServiceType.CLOUD_STORAGE: "gcp_cloud_storage",
    GCPServiceType.CLOUD_LOAD_BALANCER: "gcp_load_balancer",
    GCPServiceType.KUBERNETES_ENGINE: "gcp_kubernetes_engine",
    GCPServiceType.CLOUD_FUNCTIONS: "gcp_cloud_functions",
    GCPServiceType.CLOUD_RUN: "gcp_cloud_run",
    GCPServiceType.CLOUD_DNS: "gcp_cloud_dns",
    GCPServiceType.CLOUD_KMS: "gcp_cloud_kms",
    GCPServiceType.PUBSUB_TOPIC: "gcp_pubsub",
    GCPServiceType.REDIS: "gcp_cloud_redis",
    GCPServiceType.SPANNER: "gcp_cloud_spanner",
    GCPServiceType.FIREBASE_DATABASE: "gcp_firestore"
}

def get_service_collection(db: AsyncIOMotorDatabase, service_type: GCPServiceType):
    """Get the MongoDB collection for a specific GCP service type"""
    collection_name = GCP_SERVICE_COLLECTIONS.get(service_type)
    if not collection_name:
        raise ValueError(f"Unknown service type: {service_type}")
    return getattr(db, collection_name)

def get_all_service_collections(db: AsyncIOMotorDatabase) -> Dict[GCPServiceType, Any]:
    """Get all GCP service collections"""
    return {
        service_type: getattr(db, collection_name)
        for service_type, collection_name in GCP_SERVICE_COLLECTIONS.items()
    }

async def create_service_indexes(db: AsyncIOMotorDatabase):
    """Create indexes for all GCP service collections"""
    for service_type, collection_name in GCP_SERVICE_COLLECTIONS.items():
        collection = getattr(db, collection_name)
        
        # Create common indexes for all service collections
        await collection.create_index("credentials_id")
        await collection.create_index("resource_id")
        await collection.create_index("resource_name")
        await collection.create_index("created_at")
        await collection.create_index("updated_at")
        await collection.create_index("monitoring_enabled")
        
        # Create service-specific indexes
        if service_type == GCPServiceType.COMPUTE_ENGINE:
            await collection.create_index("zone")
            await collection.create_index("region")
            await collection.create_index("machine_type")
            await collection.create_index("status")
        elif service_type == GCPServiceType.CLOUD_SQL:
            await collection.create_index("region")
            await collection.create_index("database_version")
            await collection.create_index("state")
        elif service_type == GCPServiceType.CLOUD_STORAGE:
            await collection.create_index("location")
            await collection.create_index("storage_class")
        elif service_type == GCPServiceType.CLOUD_LOAD_BALANCER:
            await collection.create_index("region")
            await collection.create_index("load_balancing_scheme")
        elif service_type == GCPServiceType.KUBERNETES_ENGINE:
            await collection.create_index("zone")
            await collection.create_index("region")
            await collection.create_index("status")
        elif service_type == GCPServiceType.CLOUD_FUNCTIONS:
            await collection.create_index("region")
            await collection.create_index("runtime")
            await collection.create_index("status")
        # Add more service-specific indexes as needed