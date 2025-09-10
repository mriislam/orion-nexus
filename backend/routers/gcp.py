from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import json
import asyncio
import os
import re

from core.database import get_database
from core.gcp_collections import get_service_collection
from models.gcp import (
    GCPCredentials, GCPCredentialsCreate, GCPCredentialsUpdate, GCPCredentialsResponse,
    GCPResource, GCPResourceCreate, GCPResourceUpdate, GCPResourceResponse,
    GCPMetric, GCPMetricResponse, GCPMetricsQuery,
    GCPAlert, GCPAlertResponse, GCPServiceStatus,
    GCPServiceType, GCPMetricType,
    GCPResourceCount, GCPResourceCountsResponse,
    # Cloud Monitoring API models
    GCPTimeSeries, GCPTimeSeriesQuery, GCPTimeSeriesResponse, GCPTimeSeriesPoint,
    GCPMetricDescriptor, GCPMetricDescriptorResponse,
    GCPAlertPolicy, GCPAlertPolicyCreate, GCPAlertPolicyResponse,
    GCPNotificationChannel
)

# Import GCP libraries
try:
    from google.cloud import monitoring_v3
    from google.cloud import compute_v1
    from google.cloud import storage
    from google.cloud.sql.connector import Connector
    from googleapiclient import discovery
    from google.cloud import firestore
    from google.cloud import functions_v1
    from google.cloud import run_v2
    from google.cloud import container_v1
    from google.cloud import dns
    from google.cloud import kms
    from google.cloud import pubsub_v1
    from google.cloud import redis_v1
    from google.cloud import spanner_v1
    from google.oauth2 import service_account
    import google.auth
except ImportError:
    monitoring_v3 = None
    compute_v1 = None
    storage = None
    Connector = None
    discovery = None
    firestore = None
    functions_v1 = None
    run_v2 = None
    container_v1 = None
    dns = None
    kms = None
    pubsub_v1 = None
    redis_v1 = None
    spanner_v1 = None
    service_account = None
    google = None

router = APIRouter(prefix="/gcp", tags=["gcp-integration"])

# Note: Service account keys are now stored as plain JSON for simplicity

def get_bucket_size_info(bucket, storage_client, project_id: str) -> Dict[str, Any]:
    """Get storage size and object count for a bucket"""
    try:
        # Get bucket metrics by listing objects
        total_size = 0
        object_count = 0
        
        # List all objects and calculate total size
        blobs = list(bucket.list_blobs())
        for blob in blobs:
            if blob.size:
                total_size += blob.size
            object_count += 1
        
        return {
            'total_size_bytes': total_size,
            'total_size_gb': round(total_size / (1024 ** 3), 2) if total_size > 0 else 0,
            'object_count': object_count
        }
    except Exception as e:
        print(f"Error getting size info for bucket {bucket.name}: {e}")
        return {
            'total_size_bytes': 0,
            'total_size_gb': 0,
            'object_count': 0
        }

def get_bucket_size_from_monitoring(project_id: str, bucket_name: str, credentials) -> Optional[int]:
    """Get bucket size using Cloud Monitoring API (faster for large buckets)"""
    try:
        if not monitoring_v3:
            return None
            
        client = monitoring_v3.MetricServiceClient(credentials=credentials)
        project_name = f"projects/{project_id}"
        
        # Get current time and 24 hours ago
        now = datetime.utcnow()
        start_time = now - timedelta(days=1)
        
        # Build the filter for storage metrics
        filter_str = (
            f'metric.type="storage.googleapis.com/storage/total_bytes" '
            f'AND resource.labels.bucket_name="{bucket_name}"'
        )
        
        # Create time interval
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(now.timestamp())},
            "start_time": {"seconds": int(start_time.timestamp())},
        })
        
        results = client.list_time_series(
            request={
                "name": project_name,
                "filter": filter_str,
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )
        
        # Get the latest value
        for time_series in results:
            for point in time_series.points:
                if point.value.int64_value:
                    return point.value.int64_value
        
        return None
        
    except Exception as e:
        print(f"Error getting monitoring data for {bucket_name}: {e}")
        return None

async def discover_gcp_resources(credentials_id: str, service_account_key: Dict[str, Any], db) -> List[Dict[str, Any]]:
    """Automatically discover GCP resources for the given credentials"""
    discovered_resources = []
    
    try:
        print(f"Starting resource discovery for credentials_id: {credentials_id}")
        # Create credentials from service account key
        credentials = service_account.Credentials.from_service_account_info(service_account_key)
        project_id = service_account_key['project_id']
        print(f"Project ID: {project_id}")
        
        # Discover Compute Engine instances
        if compute_v1:
            try:
                print("Starting Compute Engine discovery...")
                compute_client = compute_v1.InstancesClient(credentials=credentials)
                zones_client = compute_v1.ZonesClient(credentials=credentials)
                
                # Get all zones for the project
                zones_request = compute_v1.ListZonesRequest(project=project_id)
                zones = zones_client.list(request=zones_request)
                print(f"Found {len(list(zones))} zones")
                
                zone_count = 0
                for zone in zones:
                    zone_count += 1
                    try:
                        print(f"Checking zone {zone_count}: {zone.name}")
                        # List instances in each zone
                        instances_request = compute_v1.ListInstancesRequest(
                            project=project_id,
                            zone=zone.name
                        )
                        instances = compute_client.list(request=instances_request)
                        
                        instance_count = 0
                        for instance in instances:
                            instance_count += 1
                            print(f"Found instance {instance_count}: {instance.name}")
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': str(instance.id),
                                'resource_name': instance.name,
                                'service_type': GCPServiceType.COMPUTE_ENGINE,
                                'zone': zone.name,
                                'region': zone.region.split('/')[-1] if zone.region else None,
                                'labels': dict(instance.labels) if instance.labels else {},
                                'metadata': {
                                    'machine_type': instance.machine_type.split('/')[-1] if instance.machine_type else None,
                                    'status': instance.status,
                                    'creation_timestamp': instance.creation_timestamp,
                                    'network_interfaces': [
                                        {
                                            'name': ni.name,
                                            'network': ni.network.split('/')[-1] if ni.network else 'unknown',
                                            'internal_ip': ni.network_ip if hasattr(ni, 'network_ip') else 'unknown',
                                            'external_ip': ni.access_configs[0].nat_ip if ni.access_configs and hasattr(ni.access_configs[0], 'nat_ip') else 'none'
                                        } for ni in instance.network_interfaces
                                    ] if instance.network_interfaces else []
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                        
                        if instance_count == 0:
                            print(f"No instances found in zone {zone.name}")
                    except Exception as e:
                        print(f"Error discovering instances in zone {zone.name}: {str(e)}")
                        continue
                
                print(f"Finished checking {zone_count} zones, found {len(discovered_resources)} compute instances")
            except Exception as e:
                print(f"Error discovering Compute Engine resources: {str(e)}")
        
        # Discover Cloud Storage buckets
        if storage:
            try:
                storage_client = storage.Client(credentials=credentials, project=project_id)
                buckets = storage_client.list_buckets()
                
                for bucket in buckets:
                    # Try to get size from monitoring API first (faster for large buckets)
                    size_bytes = get_bucket_size_from_monitoring(project_id, bucket.name, credentials)
                    
                    # If monitoring API doesn't return data, fall back to listing objects
                    if size_bytes is None:
                        size_info = get_bucket_size_info(bucket, storage_client, project_id)
                        size_bytes = size_info['total_size_bytes']
                        object_count = size_info['object_count']
                        size_gb = size_info['total_size_gb']
                    else:
                        # Calculate GB and get object count separately if using monitoring API
                        size_gb = round(size_bytes / (1024 ** 3), 2) if size_bytes > 0 else 0
                        try:
                            # Quick object count (limit to avoid timeout)
                            blobs = list(bucket.list_blobs(max_results=10000))
                            object_count = len(blobs)
                            # If we hit the limit, indicate it's approximate
                            if len(blobs) == 10000:
                                object_count = f"{object_count}+"
                        except:
                            object_count = "N/A"
                    
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': bucket.name,
                        'resource_name': bucket.name,
                        'service_type': GCPServiceType.CLOUD_STORAGE,
                        'zone': None,
                        'region': bucket.location,
                        'labels': dict(bucket.labels) if bucket.labels else {},
                        'metadata': {
                            'storage_class': bucket.storage_class,
                            'creation_time': bucket.time_created.isoformat() if bucket.time_created else None,
                            'total_size_bytes': size_bytes,
                            'total_size_gb': size_gb,
                            'object_count': object_count
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
            except Exception as e:
                print(f"Error discovering Cloud Storage resources: {str(e)}")
        
        # Discover Cloud SQL instances
        print(f"Discovery module available: {discovery is not None}")
        if discovery:
            try:
                print("Starting Cloud SQL discovery...")
                # Build the SQL Admin API service
                sql_service = discovery.build('sqladmin', 'v1beta4', credentials=credentials)
                
                # List all Cloud SQL instances in the project
                request = sql_service.instances().list(project=project_id)
                response = request.execute()
                
                print(f"Cloud SQL API response: {response}")
                
                if 'items' in response:
                    print(f"Found {len(response['items'])} Cloud SQL instances")
                    for instance in response['items']:
                        print(f"Processing Cloud SQL instance: {instance['name']} in region {instance.get('region', 'unknown')}")
                        # Focus on asia-southeast1-b location as requested
                        if 'region' in instance and 'asia-southeast1' in instance['region']:
                            print(f"Found Cloud SQL instance: {instance['name']} in {instance['region']}")
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': instance['name'],
                                'resource_name': instance['name'],
                                'service_type': GCPServiceType.CLOUD_SQL,
                                'zone': instance.get('gceZone'),
                                'region': instance.get('region'),
                                'labels': instance.get('settings', {}).get('userLabels', {}),
                                'metadata': {
                                    'database_version': instance.get('databaseVersion'),
                                    'state': instance.get('state'),
                                    'backend_type': instance.get('backendType'),
                                    'instance_type': instance.get('instanceType'),
                                    'connection_name': instance.get('connectionName'),
                                    'ip_addresses': instance.get('ipAddresses', [])
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                        else:
                            print(f"Skipping Cloud SQL instance {instance['name']} - not in asia-southeast1 region")
                else:
                    print("No Cloud SQL instances found in the project")
                        
            except Exception as e:
                print(f"Error discovering Cloud SQL resources: {str(e)}")
        
        # Discover Firestore databases
        if firestore:
            try:
                print("Starting Firestore discovery...")
                firestore_client = firestore.Client(credentials=credentials, project=project_id)
                
                # Firestore databases are project-level resources
                resource_data = {
                    'credentials_id': ObjectId(credentials_id),
                    'resource_id': f"{project_id}-firestore",
                    'resource_name': f"Firestore Database ({project_id})",
                    'service_type': GCPServiceType.FIREBASE_DATABASE,
                    'zone': None,
                    'region': 'global',
                    'labels': {},
                    'metadata': {
                        'project_id': project_id,
                        'database_type': 'firestore'
                    },
                    'monitoring_enabled': True,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                discovered_resources.append(resource_data)
                print(f"Found Firestore database for project: {project_id}")
            except Exception as e:
                print(f"Error discovering Firestore resources: {str(e)}")
        
        # Discover Cloud Functions
        if functions_v1:
            try:
                print("Starting Cloud Functions discovery...")
                functions_client = functions_v1.CloudFunctionsServiceClient(credentials=credentials)
                
                # Get all regions for the project to search for functions
                parent = f"projects/{project_id}/locations/-"
                request = functions_v1.ListFunctionsRequest(parent=parent)
                functions = functions_client.list_functions(request=request)
                
                for function in functions:
                    print(f"Found Cloud Function: {function.name}")
                    function_name = function.name.split('/')[-1]
                    location = function.name.split('/')[3]
                    
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': function.name,
                        'resource_name': function_name,
                        'service_type': GCPServiceType.CLOUD_FUNCTIONS,
                        'zone': None,
                        'region': location,
                        'labels': dict(function.labels) if function.labels else {},
                        'metadata': {
                            'runtime': function.runtime,
                            'status': function.status.name if function.status else 'UNKNOWN',
                            'entry_point': function.entry_point,
                            'update_time': function.update_time.isoformat() if function.update_time else None
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
            except Exception as e:
                print(f"Error discovering Cloud Functions resources: {str(e)}")
        
        # Discover Pub/Sub topics
        if pubsub_v1:
            try:
                print("Starting Pub/Sub discovery...")
                publisher_client = pubsub_v1.PublisherClient(credentials=credentials)
                
                project_path = publisher_client.common_project_path(project_id)
                topics = publisher_client.list_topics(request={"project": project_path})
                
                for topic in topics:
                    print(f"Found Pub/Sub topic: {topic.name}")
                    topic_name = topic.name.split('/')[-1]
                    
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': topic.name,
                        'resource_name': topic_name,
                        'service_type': GCPServiceType.PUBSUB_TOPIC,
                        'zone': None,
                        'region': 'global',
                        'labels': dict(topic.labels) if topic.labels else {},
                        'metadata': {
                            'full_name': topic.name
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
            except Exception as e:
                print(f"Error discovering Pub/Sub resources: {str(e)}")
        
        # Discover Load Balancers
        if compute_v1:
            try:
                print("Starting Load Balancer discovery...")
                # Global forwarding rules (HTTP/HTTPS load balancers)
                global_forwarding_rules_client = compute_v1.GlobalForwardingRulesClient(credentials=credentials)
                global_forwarding_rules = global_forwarding_rules_client.list(project=project_id)
                
                for rule in global_forwarding_rules:
                    print(f"Found global load balancer: {rule.name}")
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': rule.name,
                        'resource_name': rule.name,
                        'service_type': GCPServiceType.CLOUD_LOAD_BALANCER,
                        'zone': None,
                        'region': 'global',
                        'labels': dict(rule.labels) if rule.labels else {},
                        'metadata': {
                            'ip_address': getattr(rule, 'IPAddress', None),
                            'port_range': getattr(rule, 'port_range', None),
                            'target': getattr(rule, 'target', None),
                            'load_balancing_scheme': getattr(rule, 'load_balancing_scheme', None)
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
                
                # Regional forwarding rules (internal load balancers)
                regions_client = compute_v1.RegionsClient(credentials=credentials)
                regions = regions_client.list(project=project_id)
                
                for region in regions:
                    try:
                        regional_forwarding_rules_client = compute_v1.ForwardingRulesClient(credentials=credentials)
                        regional_rules = regional_forwarding_rules_client.list(project=project_id, region=region.name)
                        
                        for rule in regional_rules:
                            print(f"Found regional load balancer: {rule.name} in {region.name}")
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': f"{region.name}/{rule.name}",
                                'resource_name': rule.name,
                                'service_type': GCPServiceType.CLOUD_LOAD_BALANCER,
                                'zone': None,
                                'region': region.name,
                                'labels': dict(rule.labels) if rule.labels else {},
                                'metadata': {
                                    'ip_address': getattr(rule, 'IPAddress', None),
                                    'port_range': getattr(rule, 'port_range', None),
                                    'target': getattr(rule, 'target', None),
                                    'load_balancing_scheme': getattr(rule, 'load_balancing_scheme', None)
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                    except Exception as e:
                        print(f"Error discovering regional load balancers in {region.name}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error discovering Load Balancer resources: {str(e)}")
        
        # Discover VPC Networks
        if compute_v1:
            try:
                print("Starting VPC Networks discovery...")
                networks_client = compute_v1.NetworksClient(credentials=credentials)
                networks = networks_client.list(project=project_id)
                
                for network in networks:
                    print(f"Found VPC network: {network.name}")
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': network.name,
                        'resource_name': network.name,
                        'service_type': GCPServiceType.NETWORK_INTERFACE,
                        'zone': None,
                        'region': 'global',
                        'labels': {},
                        'metadata': {
                            'auto_create_subnetworks': network.auto_create_subnetworks,
                            'routing_mode': network.routing_config.routing_mode if network.routing_config else None,
                            'creation_timestamp': network.creation_timestamp
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
            except Exception as e:
                print(f"Error discovering VPC Networks: {str(e)}")
        
        # Discover Cloud Routers
        if compute_v1:
            try:
                print("Starting Cloud Router discovery...")
                regions_client = compute_v1.RegionsClient(credentials=credentials)
                regions = regions_client.list(project=project_id)
                
                for region in regions:
                    try:
                        routers_client = compute_v1.RoutersClient(credentials=credentials)
                        routers = routers_client.list(project=project_id, region=region.name)
                        
                        for router in routers:
                            print(f"Found Cloud Router: {router.name} in {region.name}")
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': f"{region.name}/{router.name}",
                                'resource_name': router.name,
                                'service_type': GCPServiceType.CLOUD_ROUTERS,
                                'zone': None,
                                'region': region.name,
                                'labels': {},
                                'metadata': {
                                    'network': router.network,
                                    'creation_timestamp': router.creation_timestamp,
                                    'nats_count': len(router.nats) if router.nats else 0
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                    except Exception as e:
                        print(f"Error discovering routers in {region.name}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error discovering Cloud Router resources: {str(e)}")
        
        # Discover Cloud Run services
        if run_v2:
            try:
                print("Starting Cloud Run discovery...")
                services_client = run_v2.ServicesClient(credentials=credentials)
                
                # Get all regions for the project to search for Cloud Run services
                regions_client = compute_v1.RegionsClient(credentials=credentials)
                regions = regions_client.list(project=project_id)
                
                for region in regions:
                    try:
                        parent = f"projects/{project_id}/locations/{region.name}"
                        services = services_client.list_services(parent=parent)
                        
                        for service in services:
                            print(f"Found Cloud Run service: {service.name}")
                            service_name = service.name.split('/')[-1]
                            
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': service.name,
                                'resource_name': service_name,
                                'service_type': GCPServiceType.CLOUD_RUN,
                                'zone': None,
                                'region': region.name,
                                'labels': dict(service.labels) if service.labels else {},
                                'metadata': {
                                    'uri': service.uri,
                                    'generation': service.generation,
                                    'creation_timestamp': service.create_time.isoformat() if service.create_time else None,
                                    'update_timestamp': service.update_time.isoformat() if service.update_time else None
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                    except Exception as e:
                        print(f"Error discovering Cloud Run services in {region.name}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error discovering Cloud Run resources: {str(e)}")
        
        # Discover Google Kubernetes Engine (GKE) clusters
        if container_v1:
            try:
                print("Starting GKE discovery...")
                cluster_manager_client = container_v1.ClusterManagerClient(credentials=credentials)
                
                # Get all zones and regions for the project to search for GKE clusters
                zones_client = compute_v1.ZonesClient(credentials=credentials)
                zones = zones_client.list(project=project_id)
                
                for zone in zones:
                    try:
                        parent = f"projects/{project_id}/locations/{zone.name}"
                        clusters = cluster_manager_client.list_clusters(parent=parent)
                        
                        for cluster in clusters.clusters:
                            print(f"Found GKE cluster: {cluster.name} in {zone.name}")
                            
                            resource_data = {
                                'credentials_id': ObjectId(credentials_id),
                                'resource_id': f"{zone.name}/{cluster.name}",
                                'resource_name': cluster.name,
                                'service_type': GCPServiceType.KUBERNETES_ENGINE,
                                'zone': zone.name,
                                'region': zone.region.split('/')[-1] if zone.region else None,
                                'labels': dict(cluster.resource_labels) if cluster.resource_labels else {},
                                'metadata': {
                                    'status': cluster.status.name if cluster.status else 'UNKNOWN',
                                    'current_master_version': cluster.current_master_version,
                                    'current_node_version': cluster.current_node_version,
                                    'initial_node_count': cluster.initial_node_count,
                                    'endpoint': cluster.endpoint,
                                    'network': cluster.network,
                                    'subnetwork': cluster.subnetwork
                                },
                                'monitoring_enabled': True,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                            discovered_resources.append(resource_data)
                    except Exception as e:
                        print(f"Error discovering GKE clusters in {zone.name}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error discovering GKE resources: {str(e)}")
        
        # Discover Cloud DNS zones
        if dns:
            try:
                print("Starting Cloud DNS discovery...")
                dns_client = dns.Client(credentials=credentials, project=project_id)
                zones = dns_client.list_zones()
                
                for zone in zones:
                    print(f"Found Cloud DNS zone: {zone.name}")
                    
                    resource_data = {
                        'credentials_id': ObjectId(credentials_id),
                        'resource_id': zone.name,
                        'resource_name': zone.name,
                        'service_type': GCPServiceType.CLOUD_DNS,
                        'zone': None,
                        'region': 'global',
                        'labels': {},
                        'metadata': {
                            'dns_name': zone.dns_name,
                            'description': zone.description,
                            'creation_time': zone.created.isoformat() if zone.created else None
                        },
                        'monitoring_enabled': True,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    discovered_resources.append(resource_data)
            except Exception as e:
                print(f"Error discovering Cloud DNS resources: {str(e)}")
        
        print(f"Resource discovery completed. Found {len(discovered_resources)} total resources.")
        
        # Save discovered resources to database
        if discovered_resources:
            for resource in discovered_resources:
                # Get service-specific collection
                service_type = GCPServiceType(resource['service_type'])
                collection = get_service_collection(db, service_type)
                
                # Check if resource already exists
                existing = await collection.find_one({
                    'credentials_id': resource['credentials_id'],
                    'resource_id': resource['resource_id']
                })
                
                if not existing:
                    await collection.insert_one(resource)
        
        return discovered_resources
        
    except Exception as e:
        print(f"Error in resource discovery: {str(e)}")
        return []

async def discover_gcp_resources_filtered(
    credentials_id: str, 
    service_account_key: Dict[str, Any], 
    db, 
    regions: Optional[List[str]] = None, 
    zones: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Discover GCP resources with optional region/zone filtering"""
    discovered_resources = []
    
    try:
        print(f"Starting filtered resource discovery for credentials_id: {credentials_id}")
        if regions:
            print(f"Filtering by regions: {regions}")
        if zones:
            print(f"Filtering by zones: {zones}")
            
        # Create credentials from service account key
        credentials = service_account.Credentials.from_service_account_info(service_account_key)
        project_id = service_account_key['project_id']
        print(f"Project ID: {project_id}")
        
        # Discover Compute Engine instances with filtering
        if compute_v1:
            try:
                instances_client = compute_v1.InstancesClient(credentials=credentials)
                
                # Get all zones if no specific zones provided
                target_zones = zones if zones else []
                if not target_zones and regions:
                    # Get zones for specified regions
                    zones_client = compute_v1.ZonesClient(credentials=credentials)
                    zones_request = compute_v1.ListZonesRequest(project=project_id)
                    all_zones = zones_client.list(request=zones_request)
                    
                    for zone in all_zones:
                        zone_region = zone.region.split('/')[-1] if zone.region else 'unknown'
                        if zone_region in regions:
                            target_zones.append(zone.name)
                elif not target_zones and not regions:
                    # Get all zones if no filtering
                    zones_client = compute_v1.ZonesClient(credentials=credentials)
                    zones_request = compute_v1.ListZonesRequest(project=project_id)
                    all_zones = zones_client.list(request=zones_request)
                    target_zones = [zone.name for zone in all_zones]
                
                # Discover instances in target zones
                for zone in target_zones:
                    print(f"Checking zone {zone} for instances...")
                    try:
                        request = compute_v1.ListInstancesRequest(
                            project=project_id,
                            zone=zone
                        )
                        instances = instances_client.list(request=request)
                        
                        for instance in instances:
                            print(f"Found instance: {instance.name} in zone {zone}")
                            resource = {
                                "credentials_id": credentials_id,
                                "resource_id": str(instance.id),
                                "name": instance.name,
                                "type": "compute_instance",
                                "service_type": GCPServiceType.COMPUTE_ENGINE,
                                "zone": zone,
                                "region": zone.rsplit('-', 1)[0] if '-' in zone else zone,
                                "status": instance.status,
                                "machine_type": instance.machine_type.split('/')[-1] if instance.machine_type else "unknown",
                                "created_at": datetime.now(),
                                "last_updated": datetime.now(),
                                "metadata": {
                                    "self_link": instance.self_link,
                                    "description": instance.description,
                                    "tags": list(instance.tags.items) if instance.tags else [],
                                    "machine_type": instance.machine_type.split('/')[-1] if instance.machine_type else "unknown",
                                    "status": instance.status,
                                    "network_interfaces": [
                                        {
                                            "name": ni.name,
                                            "network": ni.network.split('/')[-1] if ni.network else "unknown",
                                            "internal_ip": ni.network_ip if hasattr(ni, 'network_ip') else "unknown",
                                            "external_ip": ni.access_configs[0].nat_ip if ni.access_configs and hasattr(ni.access_configs[0], 'nat_ip') else "none"
                                        } for ni in instance.network_interfaces
                                    ] if instance.network_interfaces else []
                                }
                            }
                            discovered_resources.append(resource)
                            
                            # Store in database (upsert to avoid duplicates)
                            service_type = GCPServiceType(resource["service_type"])
                            collection = get_service_collection(db, service_type)
                            await collection.replace_one(
                                {
                                    "credentials_id": resource["credentials_id"],
                                    "resource_id": resource["resource_id"]
                                },
                                resource,
                                upsert=True
                            )
                            
                    except Exception as zone_error:
                        print(f"Error checking zone {zone}: {str(zone_error)}")
                        continue
                        
            except Exception as compute_error:
                print(f"Error discovering compute instances: {str(compute_error)}")
        
        print(f"Filtered resource discovery completed. Found {len(discovered_resources)} resources.")
        return discovered_resources
        
    except Exception as e:
        print(f"Error in filtered resource discovery: {str(e)}")
        return []

async def validate_gcp_credentials(service_account_key: Dict[str, Any], skip_api_validation: bool = True) -> bool:
    """Validate GCP service account credentials"""
    try:
        # Basic validation - check required fields in service account key
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in service_account_key:
                raise HTTPException(status_code=400, detail=f"Missing required field in service account key: {field}")
        
        if service_account_key.get('type') != 'service_account':
            raise HTTPException(status_code=400, detail="Invalid service account key type")
        
        # Validate email format (basic check)
        client_email = service_account_key.get('client_email', '')
        if not ('@' in client_email and '.' in client_email):
            raise HTTPException(status_code=400, detail="Invalid client_email format")
        
        # Skip API validation by default (for faster credential creation)
        if skip_api_validation:
            return True
            
        # Only perform API validation if explicitly requested
        if not monitoring_v3:
            raise HTTPException(status_code=500, detail="GCP monitoring library not available")
            
        # Create credentials from service account key
        credentials = service_account.Credentials.from_service_account_info(service_account_key)
        
        # Optional API validation with timeout (only when explicitly requested)
        import asyncio
        import concurrent.futures
        
        def _test_api_access():
            """Test API access in a separate thread with timeout"""
            client = monitoring_v3.MetricServiceClient(credentials=credentials)
            project_name = f"projects/{service_account_key['project_id']}"
            request = monitoring_v3.ListMetricDescriptorsRequest(
                name=project_name,
                page_size=1
            )
            response = client.list_metric_descriptors(request=request)
            list(response)  # Force evaluation
            return True
        
        # Run API validation with 10-second timeout
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(_test_api_access)
            try:
                await asyncio.wait_for(
                    asyncio.wrap_future(future),
                    timeout=10.0
                )
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=400, 
                    detail="GCP API validation timed out. Credentials may be valid but API is slow to respond."
                )
        
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid GCP credentials: {str(e)}")

# GCP Credentials Management
@router.post("/credentials", response_model=GCPCredentialsResponse)
async def create_gcp_credentials(
    credentials: GCPCredentialsCreate, 
    validate_api: bool = False,
    auto_discover: bool = True,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db=Depends(get_database)
):
    """Create new GCP credentials configuration
    
    Args:
        credentials: The GCP credentials data
        validate_api: If True, performs full API validation (slower but more thorough)
        db: Database dependency
    """
    try:
        # Validate credentials (no API calls by default for fast creation)
        await validate_gcp_credentials(credentials.service_account_key, skip_api_validation=not validate_api)
        
        # Check if credentials with same project_id already exist
        existing = await db.gcp_credentials.find_one({"project_id": credentials.project_id})
        if existing:
            raise HTTPException(status_code=400, detail="Credentials for this project already exist")
        
        # Create credentials document (storing plain JSON)
        creds_doc = GCPCredentials(
            name=credentials.name,
            project_id=credentials.project_id,
            service_account_key=credentials.service_account_key,  # Store plain JSON
            enabled=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.gcp_credentials.insert_one(creds_doc.dict(by_alias=True, exclude={"id"}))
        
        # Trigger automatic resource discovery if enabled
        if auto_discover:
            if credentials.selected_regions:
                # Use filtered discovery with selected regions
                background_tasks.add_task(
                    discover_gcp_resources_filtered,
                    str(result.inserted_id),
                    credentials.service_account_key,
                    db,
                    credentials.selected_regions,
                    None  # zones
                )
            else:
                # Use full discovery for all regions
                background_tasks.add_task(
                    discover_gcp_resources,
                    str(result.inserted_id),
                    credentials.service_account_key,
                    db
                )
        
        # Return response without sensitive data
        return GCPCredentialsResponse(
            id=str(result.inserted_id),
            name=credentials.name,
            project_id=credentials.project_id,
            enabled=True,
            created_at=creds_doc.created_at,
            updated_at=creds_doc.updated_at,
            last_used=None,
            has_service_account_key=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create GCP credentials: {str(e)}")

@router.get("/credentials", response_model=List[GCPCredentialsResponse])
async def list_gcp_credentials(db=Depends(get_database)):
    """List all GCP credentials configurations"""
    try:
        cursor = db.gcp_credentials.find({})
        credentials = await cursor.to_list(length=None)
        
        return [
            GCPCredentialsResponse(
                id=str(cred["_id"]),
                name=cred["name"],
                project_id=cred["project_id"],
                enabled=cred["enabled"],
                created_at=cred["created_at"],
                updated_at=cred["updated_at"],
                last_used=cred.get("last_used"),
                has_service_account_key="service_account_key" in cred
            )
            for cred in credentials
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list GCP credentials: {str(e)}")

@router.get("/credentials/{credentials_id}", response_model=GCPCredentialsResponse)
async def get_gcp_credentials(credentials_id: str, db=Depends(get_database)):
    """Get specific GCP credentials configuration"""
    try:
        cred = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not cred:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        return GCPCredentialsResponse(
            id=str(cred["_id"]),
            name=cred["name"],
            project_id=cred["project_id"],
            enabled=cred["enabled"],
            created_at=cred["created_at"],
            updated_at=cred["updated_at"],
            last_used=cred.get("last_used"),
            has_service_account_key="service_account_key" in cred
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get GCP credentials: {str(e)}")

@router.put("/credentials/{credentials_id}", response_model=GCPCredentialsResponse)
async def update_gcp_credentials(
    credentials_id: str, 
    update_data: GCPCredentialsUpdate, 
    validate_api: bool = False,
    db=Depends(get_database)
):
    """Update GCP credentials configuration
    
    Args:
        credentials_id: The ID of the credentials to update
        update_data: The update data
        validate_api: If True, performs full API validation (slower but more thorough)
        db: Database dependency
    """
    try:
        # Check if credentials exist
        existing = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        update_dict = {"updated_at": datetime.utcnow()}
        
        # Update fields
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.project_id is not None:
            update_dict["project_id"] = update_data.project_id
        if update_data.enabled is not None:
            update_dict["enabled"] = update_data.enabled
        
        # Handle service account key update
        if update_data.service_account_key is not None:
            await validate_gcp_credentials(update_data.service_account_key, skip_api_validation=not validate_api)
            update_dict["service_account_key"] = update_data.service_account_key  # Store plain JSON
        
        # Update document
        await db.gcp_credentials.update_one(
            {"_id": ObjectId(credentials_id)},
            {"$set": update_dict}
        )
        
        # Get updated document
        updated = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        
        return GCPCredentialsResponse(
            id=str(updated["_id"]),
            name=updated["name"],
            project_id=updated["project_id"],
            enabled=updated["enabled"],
            created_at=updated["created_at"],
            updated_at=updated["updated_at"],
            last_used=updated.get("last_used"),
            has_service_account_key="service_account_key" in updated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update GCP credentials: {str(e)}")

@router.delete("/credentials/{credentials_id}")
async def delete_gcp_credentials(credentials_id: str, db=Depends(get_database)):
    """Delete GCP credentials configuration"""
    try:
        # Check if credentials exist
        existing = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        # Delete associated resources first
        await db.gcp_resources.delete_many({"credentials_id": ObjectId(credentials_id)})
        
        # Delete credentials
        result = await db.gcp_credentials.delete_one({"_id": ObjectId(credentials_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        return {"message": "GCP credentials deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete GCP credentials: {str(e)}")

# GCP Resources Management
@router.get("/regions/{credentials_id}")
async def get_available_regions(
    credentials_id: str,
    db=Depends(get_database)
):
    """Get available GCP regions and zones for the given credentials"""
    try:
        # Get credentials
        creds = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not creds:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        if not creds.get("enabled", False):
            raise HTTPException(status_code=400, detail="Credentials are disabled")
        
        # Create credentials from service account key
        service_account_key = creds["service_account_key"]
        credentials = service_account.Credentials.from_service_account_info(service_account_key)
        project_id = service_account_key['project_id']
        
        regions_zones = []
        
        if compute_v1:
            try:
                # Get all regions
                regions_client = compute_v1.RegionsClient(credentials=credentials)
                regions_request = compute_v1.ListRegionsRequest(project=project_id)
                regions = regions_client.list(request=regions_request)
                
                # Get zones for each region
                zones_client = compute_v1.ZonesClient(credentials=credentials)
                zones_request = compute_v1.ListZonesRequest(project=project_id)
                zones = zones_client.list(request=zones_request)
                
                # Group zones by region
                region_zone_map = {}
                for zone in zones:
                    region_name = zone.region.split('/')[-1] if zone.region else 'unknown'
                    if region_name not in region_zone_map:
                        region_zone_map[region_name] = []
                    region_zone_map[region_name].append({
                        'name': zone.name,
                        'status': zone.status
                    })
                
                # Build response
                for region in regions:
                    region_data = {
                        'name': region.name,
                        'description': region.description,
                        'status': region.status,
                        'zones': region_zone_map.get(region.name, [])
                    }
                    regions_zones.append(region_data)
                    
            except Exception as e:
                print(f"Error fetching regions/zones: {str(e)}")
                # Return a default set of common regions if API fails
                regions_zones = [
                    {'name': 'us-central1', 'description': 'Iowa', 'status': 'UP', 'zones': [{'name': 'us-central1-a', 'status': 'UP'}, {'name': 'us-central1-b', 'status': 'UP'}, {'name': 'us-central1-c', 'status': 'UP'}]},
                    {'name': 'us-east1', 'description': 'South Carolina', 'status': 'UP', 'zones': [{'name': 'us-east1-a', 'status': 'UP'}, {'name': 'us-east1-b', 'status': 'UP'}, {'name': 'us-east1-c', 'status': 'UP'}]},
                    {'name': 'us-west1', 'description': 'Oregon', 'status': 'UP', 'zones': [{'name': 'us-west1-a', 'status': 'UP'}, {'name': 'us-west1-b', 'status': 'UP'}, {'name': 'us-west1-c', 'status': 'UP'}]},
                    {'name': 'europe-west1', 'description': 'Belgium', 'status': 'UP', 'zones': [{'name': 'europe-west1-a', 'status': 'UP'}, {'name': 'europe-west1-b', 'status': 'UP'}, {'name': 'europe-west1-c', 'status': 'UP'}]},
                    {'name': 'asia-southeast1', 'description': 'Singapore', 'status': 'UP', 'zones': [{'name': 'asia-southeast1-a', 'status': 'UP'}, {'name': 'asia-southeast1-b', 'status': 'UP'}, {'name': 'asia-southeast1-c', 'status': 'UP'}]}
                ]
        
        return {"regions": regions_zones}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get regions: {str(e)}")

@router.post("/credentials/{credentials_id}/discover-resources")
async def discover_resources_for_credentials(
    credentials_id: str,
    background_tasks: BackgroundTasks,
    regions: Optional[List[str]] = None,
    zones: Optional[List[str]] = None,
    db=Depends(get_database)
):
    """Manually trigger resource discovery for existing credentials"""
    try:
        # Get credentials
        creds = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
        if not creds:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        if not creds.get("enabled", False):
            raise HTTPException(status_code=400, detail="Credentials are disabled")
        
        # Trigger resource discovery with optional region/zone filtering
        if regions or zones:
            # Use filtered discovery when specific regions/zones are requested
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                credentials_id,
                creds["service_account_key"],
                db,
                regions,
                zones
            )
        else:
            # Use full discovery when no filters are provided
            background_tasks.add_task(
                discover_gcp_resources,
                credentials_id,
                creds["service_account_key"],
                db
            )
        
        return {"message": "Resource discovery started", "status": "in_progress"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start resource discovery: {str(e)}")

@router.post("/resources", response_model=GCPResourceResponse)
async def create_gcp_resource(resource: GCPResourceCreate, db=Depends(get_database)):
    """Create new GCP resource for monitoring"""
    try:
        # Validate credentials exist
        creds = await db.gcp_credentials.find_one({"_id": ObjectId(resource.credentials_id)})
        if not creds:
            raise HTTPException(status_code=404, detail="GCP credentials not found")
        
        # Check if resource already exists
        existing = await db.gcp_resources.find_one({
            "credentials_id": ObjectId(resource.credentials_id),
            "resource_id": resource.resource_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Resource already exists")
        
        # Create resource document
        resource_doc = GCPResource(
            credentials_id=ObjectId(resource.credentials_id),
            resource_id=resource.resource_id,
            resource_name=resource.resource_name,
            service_type=resource.service_type,
            zone=resource.zone,
            region=resource.region,
            labels=resource.labels,
            metadata=resource.metadata,
            monitoring_enabled=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.gcp_resources.insert_one(resource_doc.dict(by_alias=True, exclude={"id"}))
        
        return GCPResourceResponse(
            id=str(result.inserted_id),
            credentials_id=resource.credentials_id,
            resource_id=resource.resource_id,
            resource_name=resource.resource_name,
            service_type=resource.service_type,
            zone=resource.zone,
            region=resource.region,
            labels=resource.labels,
            metadata=resource.metadata,
            monitoring_enabled=True,
            created_at=resource_doc.created_at,
            updated_at=resource_doc.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create GCP resource: {str(e)}")

@router.get("/resources", response_model=List[GCPResourceResponse])
async def list_gcp_resources(credentials_id: Optional[str] = None, db=Depends(get_database)):
    """List GCP resources"""
    try:
        query = {}
        if credentials_id:
            try:
                query["credentials_id"] = ObjectId(credentials_id)
            except Exception:
                # If credentials_id is not a valid ObjectId, return empty list
                return []
        
        cursor = db.gcp_resources.find(query)
        resources = await cursor.to_list(length=None)
        
        return [
            GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("resource_name", resource.get("name", "Unknown")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource.get("created_at", resource.get("last_updated")),
                updated_at=resource.get("updated_at", resource.get("last_updated"))
            )
            for resource in resources
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list GCP resources: {str(e)}")

@router.get("/resources/storage-with-size", response_model=List[GCPResourceResponse])
async def list_storage_resources_with_size(credentials_id: Optional[str] = None, db=Depends(get_database)):
    """List Cloud Storage resources with size information"""
    try:
        query = {"service_type": "cloud_storage"}
        if credentials_id:
            try:
                query["credentials_id"] = ObjectId(credentials_id)
            except Exception:
                return []
        
        cursor = db.gcp_resources.find(query)
        resources = await cursor.to_list(length=None)
        
        return [
            GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("resource_name", resource.get("name", "Unknown")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource.get("created_at", resource.get("last_updated")),
                updated_at=resource.get("updated_at", resource.get("last_updated"))
            )
            for resource in resources
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list storage resources: {str(e)}")

@router.get("/resources/vms/grouped")
async def get_grouped_vm_instances(db=Depends(get_database)):
    """Get all VM instances without grouping"""
    try:
        resources = await db.gcp_resources.find({"service_type": "compute_engine"}).to_list(length=None)
        
        instances = []
        
        for resource in resources:
            # Skip resources without name
            if "name" not in resource:
                continue
            
            # Skip resources without zone
            if "zone" not in resource:
                continue
            
            # Process instance data - use available fields if present
            instance_data = {
                "id": str(resource["_id"]),
                "name": resource["name"],
                "zone": resource["zone"],
                "status": resource.get("status", "FETCH_REQUIRED"),
                "machine_type": resource.get("machine_type", "FETCH_REQUIRED"),
                "internal_ip": "N/A",
                "external_ip": "N/A",
                "needs_gcp_api_call": resource.get("status") is None or resource.get("machine_type") is None
            }
            
            # Extract network info if available
            if network_interfaces := resource.get("metadata", {}).get("network_interfaces"):
                if network_interfaces and len(network_interfaces) > 0:
                    instance_data["internal_ip"] = network_interfaces[0].get("internal_ip", "N/A")
                    external_ip = network_interfaces[0].get("external_ip", "N/A")
                    instance_data["external_ip"] = external_ip if external_ip != "none" else "N/A"
            
            instances.append(instance_data)
        
        return instances
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get grouped VM instances: {str(e)}")

# Service-specific endpoints for individual GCP services

@router.get("/resources/compute-engine", response_model=List[GCPResourceResponse])
async def list_compute_engine_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Compute Engine instances (deduplicated, latest records only)"""
    try:
        query_filter = {"service_type": GCPServiceType.COMPUTE_ENGINE}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        # Aggregate to get the latest record for each unique resource_id
        pipeline = [
            {"$match": query_filter},
            {"$sort": {"created_at": -1}},  # Sort by creation date descending
            {
                "$group": {
                    "_id": "$resource_id",  # Group by resource_id
                    "latest_record": {"$first": "$$ROOT"}  # Take the first (latest) record
                }
            },
            {"$replaceRoot": {"newRoot": "$latest_record"}}  # Replace root with the latest record
        ]
        
        cursor = db.gcp_resources.aggregate(pipeline)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list compute engine resources: {str(e)}")

@router.get("/resources/cloud-sql", response_model=List[GCPResourceResponse])
async def list_cloud_sql_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Cloud SQL instances"""
    try:
        query_filter = {"service_type": GCPServiceType.CLOUD_SQL}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cloud sql resources: {str(e)}")

@router.get("/resources/cloud-functions", response_model=List[GCPResourceResponse])
async def list_cloud_functions_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Cloud Functions"""
    try:
        query_filter = {"service_type": GCPServiceType.CLOUD_FUNCTIONS}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cloud functions resources: {str(e)}")

@router.get("/resources/cloud-run", response_model=List[GCPResourceResponse])
async def list_cloud_run_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Cloud Run services"""
    try:
        query_filter = {"service_type": GCPServiceType.CLOUD_RUN}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cloud run resources: {str(e)}")

@router.get("/resources/kubernetes-engine", response_model=List[GCPResourceResponse])
async def list_gke_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP GKE clusters"""
    try:
        query_filter = {"service_type": GCPServiceType.KUBERNETES_ENGINE}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list gke resources: {str(e)}")

@router.get("/resources/pubsub-topic", response_model=List[GCPResourceResponse])
async def list_pubsub_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Pub/Sub topics"""
    try:
        query_filter = {"service_type": GCPServiceType.PUBSUB}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list pubsub resources: {str(e)}")

@router.get("/resources/cloud-dns", response_model=List[GCPResourceResponse])
async def list_cloud_dns_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Cloud DNS zones"""
    try:
        query_filter = {"service_type": GCPServiceType.CLOUD_DNS}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cloud dns resources: {str(e)}")

@router.get("/resources/load-balancing", response_model=List[GCPResourceResponse])
async def list_load_balancer_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Load Balancers"""
    try:
        query_filter = {"service_type": GCPServiceType.LOAD_BALANCER}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list load balancer resources: {str(e)}")

@router.get("/resources/cloud-routers", response_model=List[GCPResourceResponse])
async def list_cloud_router_resources(
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """List GCP Cloud Routers"""
    try:
        query_filter = {"service_type": GCPServiceType.CLOUD_ROUTER}
        if credentials_id:
            query_filter["credentials_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_resources.find(query_filter)
        resources = await cursor.to_list(length=None)
        
        response_resources = []
        for resource in resources:
            response_resources.append(GCPResourceResponse(
                id=str(resource["_id"]),
                credentials_id=str(resource["credentials_id"]),
                resource_id=resource["resource_id"],
                resource_name=resource.get("name", resource.get("resource_name", "")),
                service_type=resource["service_type"],
                zone=resource.get("zone"),
                region=resource.get("region"),
                labels=resource.get("labels", {}),
                metadata=resource.get("metadata", {}),
                monitoring_enabled=resource.get("monitoring_enabled", True),
                created_at=resource["created_at"],
                updated_at=resource.get("updated_at", resource.get("last_updated", resource["created_at"]))
            ))
        
        return response_resources
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cloud router resources: {str(e)}")

# Refresh endpoints for individual services

@router.post("/resources/compute-engine/refresh")
async def refresh_compute_engine_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Compute Engine instances"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for compute engine only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                str(creds["_id"]),
                creds["service_account_key"],
                db
            )
            # Also trigger metrics collection after resource discovery
            background_tasks.add_task(
                _collect_metrics_task,
                str(creds["_id"]),
                db
            )
        
        return {
            "message": "Compute Engine resource refresh and metrics collection initiated", 
            "status": "success",
            "includes_metrics_collection": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh compute engine resources: {str(e)}")

@router.post("/resources/cloud-sql/refresh")
async def refresh_cloud_sql_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud SQL instances"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud sql only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                str(creds["_id"]),
                creds["service_account_key"],
                db
            )
            # Also trigger metrics collection after resource discovery
            background_tasks.add_task(
                _collect_metrics_task,
                str(creds["_id"]),
                db
            )
        
        return {
            "message": "Cloud SQL resource refresh and metrics collection initiated", 
            "status": "success",
            "includes_metrics_collection": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cloud sql resources: {str(e)}")

@router.post("/resources/cloud-functions/refresh")
async def refresh_cloud_functions_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud Functions"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud functions only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                str(creds["_id"]),
                creds["service_account_key"],
                db
            )
            # Also trigger metrics collection after resource discovery
            background_tasks.add_task(
                _collect_metrics_task,
                str(creds["_id"]),
                db
            )
        
        return {
            "message": "Cloud Functions resource refresh and metrics collection initiated", 
            "status": "success",
            "includes_metrics_collection": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cloud functions resources: {str(e)}")

@router.post("/resources/cloud-run/refresh")
async def refresh_cloud_run_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud Run services"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud run only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.CLOUD_RUN]
            )
        
        return {"message": "Cloud Run resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cloud run resources: {str(e)}")

@router.post("/resources/storage/refresh")
async def refresh_storage_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud Storage buckets"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud storage only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.CLOUD_STORAGE]
            )
        
        return {"message": "Cloud Storage resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh storage resources: {str(e)}")

@router.post("/resources/kubernetes-engine/refresh")
async def refresh_gke_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP GKE clusters"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for gke only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.KUBERNETES_ENGINE]
            )
        
        return {"message": "GKE resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh gke resources: {str(e)}")

@router.post("/resources/pubsub-topic/refresh")
async def refresh_pubsub_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Pub/Sub topics"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for pubsub only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.PUBSUB]
            )
        
        return {"message": "Pub/Sub resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh pubsub resources: {str(e)}")

@router.post("/resources/cloud-dns/refresh")
async def refresh_cloud_dns_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud DNS zones"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud dns only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.CLOUD_DNS]
            )
        
        return {"message": "Cloud DNS resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cloud dns resources: {str(e)}")

@router.post("/resources/load-balancing/refresh")
async def refresh_load_balancer_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Load Balancers"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for load balancer only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.LOAD_BALANCER]
            )
        
        return {"message": "Load Balancer resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh load balancer resources: {str(e)}")

@router.post("/resources/cloud-routers/refresh")
async def refresh_cloud_router_resources(
    background_tasks: BackgroundTasks,
    credentials_id: Optional[str] = None,
    db=Depends(get_database)
):
    """Refresh GCP Cloud Routers"""
    try:
        # Get credentials
        if credentials_id:
            credentials = await db.gcp_credentials.find_one({"_id": ObjectId(credentials_id)})
            if not credentials:
                raise HTTPException(status_code=404, detail="Credentials not found")
            credentials_list = [credentials]
        else:
            cursor = db.gcp_credentials.find({})
            credentials_list = await cursor.to_list(length=None)
        
        # Trigger discovery for cloud router only
        for creds in credentials_list:
            background_tasks.add_task(
                discover_gcp_resources_filtered,
                creds,
                db,
                [GCPServiceType.CLOUD_ROUTER]
            )
        
        return {"message": "Cloud Router resource refresh initiated", "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh cloud router resources: {str(e)}")

# GCP Metrics Collection
@router.post("/metrics/collect")
async def collect_gcp_metrics(background_tasks: BackgroundTasks, credentials_id: Optional[str] = None, db=Depends(get_database)):
    """Trigger sequential GCP metrics collection"""
    try:
        if not monitoring_v3:
            raise HTTPException(status_code=500, detail="GCP monitoring library not available")
        
        # Check how many resources will be monitored
        query = {"enabled": True}
        if credentials_id:
            query["_id"] = ObjectId(credentials_id)
        
        credentials_count = await db.gcp_credentials.count_documents(query)
        if credentials_count == 0:
            raise HTTPException(status_code=404, detail="No enabled GCP credentials found")
        
        # Count total resources to be monitored
        resources_query = {"monitoring_enabled": True}
        if credentials_id:
            resources_query["credentials_id"] = ObjectId(credentials_id)
        
        total_resources = await db.gcp_resources.count_documents(resources_query)
        
        # Add background task to collect metrics sequentially
        background_tasks.add_task(_collect_metrics_task, credentials_id, db)
        
        return {
            "message": "Sequential metrics collection started", 
            "status": "in_progress",
            "credentials_count": credentials_count,
            "total_resources": total_resources,
            "collection_mode": "sequential",
            "started_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start metrics collection: {str(e)}")

@router.get("/metrics/collection-status")
async def get_metrics_collection_status(credentials_id: Optional[str] = None, db=Depends(get_database)):
    """Get the status of the last metrics collection"""
    try:
        # Build query for credentials
        query = {"enabled": True}
        if credentials_id:
            query["_id"] = ObjectId(credentials_id)
        
        # Get credentials with collection info
        cursor = db.gcp_credentials.find(query)
        credentials_list = await cursor.to_list(length=None)
        
        collection_status = []
        total_resources = 0
        total_monitored = 0
        
        for creds in credentials_list:
            # Get resources for this credentials
            resources_cursor = db.gcp_resources.find({
                "credentials_id": creds["_id"],
                "monitoring_enabled": True
            })
            resources = await resources_cursor.to_list(length=None)
            
            # Count recent metrics (last 10 minutes)
            recent_metrics_count = await db.gcp_metrics.count_documents({
                "collected_at": {"$gte": datetime.utcnow() - timedelta(minutes=10)}
            })
            
            status_info = {
                "credentials_id": str(creds["_id"]),
                "project_id": creds.get("project_id", "unknown"),
                "last_used": creds.get("last_used"),
                "last_metrics_collection": creds.get("last_metrics_collection"),
                "total_resources": len(resources),
                "total_resources_monitored": creds.get("total_resources_monitored", 0),
                "recent_metrics_count": recent_metrics_count,
                "resources": []
            }
            
            # Add resource details
            for resource in resources:
                resource_info = {
                    "resource_id": str(resource["_id"]),
                    "name": resource.get("name", resource["resource_id"]),
                    "service_type": resource["service_type"],
                    "last_monitored": resource.get("last_monitored"),
                    "monitoring_enabled": resource["monitoring_enabled"]
                }
                status_info["resources"].append(resource_info)
            
            collection_status.append(status_info)
            total_resources += len(resources)
            total_monitored += creds.get("total_resources_monitored", 0)
        
        return {
            "collection_status": collection_status,
            "summary": {
                "total_credentials": len(credentials_list),
                "total_resources": total_resources,
                "total_monitored_last_run": total_monitored,
                "collection_mode": "sequential"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collection status: {str(e)}")

@router.get("/metrics", response_model=List[GCPMetricResponse])
async def get_gcp_metrics(
    resource_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    limit: int = 100,
    db=Depends(get_database)
):
    """Get GCP metrics with query parameters"""
    try:
        # Build query filter
        filter_dict = {}
        
        if resource_id:
            filter_dict["resource_id"] = ObjectId(resource_id)
        
        if metric_type:
            filter_dict["metric_type"] = metric_type
        
        if start_time or end_time:
            time_filter = {}
            if start_time:
                time_filter["$gte"] = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            if end_time:
                time_filter["$lte"] = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            filter_dict["timestamp"] = time_filter
        
        # Query metrics
        cursor = db.gcp_metrics.find(filter_dict).sort("timestamp", -1).limit(limit)
        metrics = await cursor.to_list(length=None)
        
        return [
            GCPMetricResponse(
                id=str(metric["_id"]),
                resource_id=str(metric["resource_id"]),
                metric_type=metric["metric_type"],
                metric_name=metric["metric_name"],
                value=metric["value"],
                unit=metric["unit"],
                timestamp=metric["timestamp"],
                labels=metric.get("labels", {}),
                collected_at=metric["collected_at"]
            )
            for metric in metrics
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get GCP metrics: {str(e)}")

@router.post("/metrics/query", response_model=List[GCPMetricResponse])
async def query_gcp_metrics(query: GCPMetricsQuery, db=Depends(get_database)):
    """Query GCP metrics"""
    try:
        # Build query filter
        filter_dict = {}
        
        if query.resource_ids:
            filter_dict["resource_id"] = {"$in": [ObjectId(rid) for rid in query.resource_ids]}
        
        if query.metric_types:
            filter_dict["metric_type"] = {"$in": query.metric_types}
        
        if query.start_time or query.end_time:
            time_filter = {}
            if query.start_time:
                time_filter["$gte"] = query.start_time
            if query.end_time:
                time_filter["$lte"] = query.end_time
            filter_dict["timestamp"] = time_filter
        
        # Query metrics
        cursor = db.gcp_metrics.find(filter_dict).sort("timestamp", -1).limit(query.limit)
        metrics = await cursor.to_list(length=None)
        
        return [
            GCPMetricResponse(
                id=str(metric["_id"]),
                resource_id=str(metric["resource_id"]),
                metric_type=metric["metric_type"],
                metric_name=metric["metric_name"],
                value=metric["value"],
                unit=metric["unit"],
                timestamp=metric["timestamp"],
                labels=metric.get("labels", {}),
                collected_at=metric["collected_at"]
            )
            for metric in metrics
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query GCP metrics: {str(e)}")

@router.get("/alerts", response_model=List[GCPAlertResponse])
async def list_gcp_alerts(resolved: Optional[bool] = None, db=Depends(get_database)):
    """List GCP alerts"""
    try:
        query = {}
        if resolved is not None:
            query["is_resolved"] = resolved
        
        cursor = db.gcp_alerts.find(query).sort("triggered_at", -1)
        alerts = await cursor.to_list(length=None)
        
        return [
            GCPAlertResponse(
                id=str(alert["_id"]),
                resource_id=str(alert["resource_id"]),
                metric_type=alert["metric_type"],
                alert_type=alert["alert_type"],
                severity=alert["severity"],
                message=alert["message"],
                threshold_value=alert.get("threshold_value"),
                current_value=alert["current_value"],
                triggered_at=alert["triggered_at"],
                resolved_at=alert.get("resolved_at"),
                is_resolved=alert["is_resolved"],
                metadata=alert.get("metadata", {})
            )
            for alert in alerts
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list GCP alerts: {str(e)}")

@router.get("/status", response_model=GCPServiceStatus)
async def get_gcp_service_status(db=Depends(get_database)):
    """Get GCP integration service status"""
    try:
        # Count credentials and resources
        credentials_count = await db.gcp_credentials.count_documents({})
        resources_count = await db.gcp_resources.count_documents({})
        active_resources_count = await db.gcp_resources.count_documents({"monitoring_enabled": True})
        
        # Get last collection time
        last_metric = await db.gcp_metrics.find_one({}, sort=[("collected_at", -1)])
        last_collection_time = last_metric["collected_at"] if last_metric else None
        
        return GCPServiceStatus(
            credentials_count=credentials_count,
            resources_count=resources_count,
            active_resources_count=active_resources_count,
            last_collection_time=last_collection_time,
            collection_errors=[]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get GCP service status: {str(e)}")

@router.get("/resource-counts", response_model=GCPResourceCountsResponse)
async def get_gcp_resource_counts(db=Depends(get_database)):
    """Get GCP resource counts by service type (counting unique resource_ids, only RUNNING VMs)"""
    try:
        # Aggregate resources by service type, counting unique resource_ids
        # For compute_engine, only count RUNNING instances
        pipeline = [
            {
                "$match": {
                    "$or": [
                        {"service_type": {"$ne": "compute_engine"}},
                        {
                            "service_type": "compute_engine",
                            "metadata.status": "RUNNING"
                        }
                    ]
                }
            },
            {
                "$group": {
                    "_id": {
                        "service_type": "$service_type",
                        "resource_id": "$resource_id"
                    }
                }
            },
            {
                "$group": {
                    "_id": "$_id.service_type",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        cursor = db.gcp_resources.aggregate(pipeline)
        aggregation_result = await cursor.to_list(length=None)
        
        # Convert to response format
        resource_counts = []
        total_resources = 0
        
        for item in aggregation_result:
            service_type = item["_id"]
            count = item["count"]
            total_resources += count
            
            # Ensure service_type is valid
            try:
                validated_service_type = GCPServiceType(service_type)
                resource_counts.append(GCPResourceCount(
                    service_type=validated_service_type,
                    count=count
                ))
            except ValueError:
                # Skip invalid service types
                continue
        
        return GCPResourceCountsResponse(
            resource_counts=resource_counts,
            total_resources=total_resources,
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get GCP resource counts: {str(e)}")

# Background task for metrics collection
async def _collect_metrics_task(credentials_id: Optional[str], db):
    """Background task to collect GCP metrics sequentially"""
    try:
        # Get credentials to use
        query = {"enabled": True}
        if credentials_id:
            query["_id"] = ObjectId(credentials_id)
        
        cursor = db.gcp_credentials.find(query)
        credentials_list = await cursor.to_list(length=None)
        
        total_metrics_collected = 0
        
        # Process credentials sequentially
        for creds in credentials_list:
            try:
                print(f"Starting metrics collection for credentials {creds['_id']}")
                
                # Get service account key (now stored as plain JSON)
                service_account_key = creds["service_account_key"]
                
                # Get resources for this credentials
                resources_cursor = db.gcp_resources.find({
                    "credentials_id": creds["_id"],
                    "monitoring_enabled": True
                })
                resources = await resources_cursor.to_list(length=None)
                
                print(f"Found {len(resources)} resources to monitor for credentials {creds['_id']}")
                
                # Collect metrics for each resource sequentially
                for i, resource in enumerate(resources, 1):
                    try:
                        print(f"Collecting metrics for resource {i}/{len(resources)}: {resource.get('name', resource['resource_id'])}")
                        metrics_count = await _collect_resource_metrics(service_account_key, resource, db)
                        total_metrics_collected += metrics_count
                        
                        # Update resource last_monitored timestamp
                        await db.gcp_resources.update_one(
                            {"_id": resource["_id"]},
                            {"$set": {"last_monitored": datetime.utcnow()}}
                        )
                        
                        print(f"Collected {metrics_count} metrics for resource {resource.get('name', resource['resource_id'])}")
                        
                    except Exception as e:
                        print(f"Error collecting metrics for resource {resource.get('name', resource['resource_id'])}: {str(e)}")
                        # Continue with next resource instead of stopping
                        continue
                
                # Update credentials last used timestamp and collection stats
                await db.gcp_credentials.update_one(
                    {"_id": creds["_id"]},
                    {"$set": {
                        "last_used": datetime.utcnow(),
                        "last_metrics_collection": datetime.utcnow(),
                        "total_resources_monitored": len(resources)
                    }}
                )
                
                print(f"Completed metrics collection for credentials {creds['_id']}")
                
            except Exception as e:
                print(f"Error collecting metrics for credentials {creds['_id']}: {str(e)}")
                continue
        
        print(f"Metrics collection completed. Total metrics collected: {total_metrics_collected}")
        
    except Exception as e:
        print(f"Error in metrics collection task: {str(e)}")

async def _collect_resource_metrics(service_account_key: Dict[str, Any], resource: Dict[str, Any], db) -> int:
    """Collect metrics for a specific GCP resource and return count of metrics collected"""
    metrics_collected = 0
    
    try:
        # Check if required libraries are available
        if service_account is None or monitoring_v3 is None:
            raise HTTPException(status_code=500, detail="Google Cloud libraries not installed")
        
        # Create credentials and client
        credentials = service_account.Credentials.from_service_account_info(service_account_key)
        client = monitoring_v3.MetricServiceClient(credentials=credentials)
        
        project_name = f"projects/{service_account_key['project_id']}"
        
        # Define metric mappings based on service type
        metric_mappings = {
            GCPServiceType.COMPUTE_ENGINE: [
                ("compute.googleapis.com/instance/cpu/utilization", GCPMetricType.CPU_UTILIZATION, "percent"),
                ("compute.googleapis.com/instance/memory/utilization", GCPMetricType.MEMORY_UTILIZATION, "percent"),
                ("compute.googleapis.com/instance/disk/read_bytes_count", GCPMetricType.DISK_IO_READ, "bytes"),
                ("compute.googleapis.com/instance/disk/write_bytes_count", GCPMetricType.DISK_IO_WRITE, "bytes"),
            ],
            GCPServiceType.CLOUD_LOAD_BALANCER: [
                ("loadbalancing.googleapis.com/https/request_count", GCPMetricType.REQUEST_COUNT, "count"),
                ("loadbalancing.googleapis.com/https/backend_latencies", GCPMetricType.LATENCY, "ms"),
            ]
        }
        
        service_type = resource["service_type"]
        if service_type not in metric_mappings:
            print(f"No metric mappings found for service type: {service_type}")
            return 0
        
        # Collect metrics for this service type sequentially
        for metric_name, metric_type, unit in metric_mappings[service_type]:
            try:
                print(f"  Collecting metric: {metric_name}")
                
                # Query metric data
                interval = monitoring_v3.TimeInterval({
                    "end_time": {"seconds": int(datetime.utcnow().timestamp())},
                    "start_time": {"seconds": int((datetime.utcnow() - timedelta(minutes=5)).timestamp())}
                })
                
                request = monitoring_v3.ListTimeSeriesRequest({
                    "name": project_name,
                    "filter": f'metric.type="{metric_name}" AND resource.label.instance_id="{resource["resource_id"]}"',
                    "interval": interval,
                    "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL
                })
                
                results = client.list_time_series(request=request)
                
                # Process results and count metrics
                metric_points_count = 0
                for result in results:
                    for point in result.points:
                        # Extract value based on type
                        if hasattr(point.value, 'double_value'):
                            value = point.value.double_value
                        elif hasattr(point.value, 'int64_value'):
                            value = float(point.value.int64_value)
                        else:
                            continue
                        
                        # Create metric document
                        metric_doc = GCPMetric(
                            resource_id=resource["_id"],
                            metric_type=metric_type,
                            metric_name=metric_name,
                            value=value,
                            unit=unit,
                            timestamp=datetime.fromtimestamp(point.interval.end_time.timestamp()) if hasattr(point.interval.end_time, 'timestamp') else (datetime.fromtimestamp(point.interval.end_time.seconds) if hasattr(point.interval.end_time, 'seconds') else point.interval.end_time.ToDatetime()),
                            labels=dict(result.resource.labels),
                            collected_at=datetime.utcnow()
                        )
                        
                        # Insert metric into database
                        await db.gcp_metrics.insert_one(metric_doc.dict(by_alias=True, exclude={"id"}))
                        metric_points_count += 1
                        metrics_collected += 1
                
                print(f"    Collected {metric_points_count} data points for {metric_name}")
                
            except Exception as e:
                print(f"Error collecting metric {metric_name} for resource {resource['resource_id']}: {str(e)}")
                continue
        
        return metrics_collected
        
    except Exception as e:
        print(f"Error collecting metrics for resource {resource['resource_id']}: {str(e)}")
        return metrics_collected

# Health check
@router.get("/health")
async def gcp_health_check():
    """Health check for GCP integration service"""
    return {
        "service": "gcp-integration",
        "status": "healthy",
        "features": {
            "credentials_management": True,
            "resource_monitoring": True,
            "metrics_collection": monitoring_v3 is not None,
            "encryption": True
        },
        "timestamp": datetime.utcnow()
    }

# GCP Cloud Monitoring API Endpoints
@router.post("/monitoring/timeseries/query", response_model=List[GCPTimeSeriesResponse])
async def query_time_series(query: GCPTimeSeriesQuery, db=Depends(get_database)):
    """Query time series data from GCP Cloud Monitoring API"""
    if not monitoring_v3:
        raise HTTPException(status_code=500, detail="GCP monitoring library not available")
    
    try:
        # Get credentials for the project
        credentials_doc = await db.gcp_credentials.find_one({"project_id": query.project_id, "enabled": True})
        if not credentials_doc:
            raise HTTPException(status_code=404, detail=f"No enabled credentials found for project {query.project_id}")
        
        # Create credentials and client
        credentials = service_account.Credentials.from_service_account_info(credentials_doc["service_account_key"])
        client = monitoring_v3.MetricServiceClient(credentials=credentials)
        
        # Build the request
        project_name = f"projects/{query.project_id}"
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(query.interval_end_time.timestamp())},
            "start_time": {"seconds": int(query.interval_start_time.timestamp())}
        })
        
        request = monitoring_v3.ListTimeSeriesRequest(
            name=project_name,
            filter=query.filter,
            interval=interval,
            page_size=query.page_size
        )
        
        if query.aggregation:
            request.aggregation = query.aggregation
        
        # Execute the query
        page_result = client.list_time_series(request=request)
        
        # Process results
        time_series_list = []
        for time_series in page_result:
            # Convert points
            points = []
            for point in time_series.points:
                # Handle DatetimeWithNanoseconds properly
                try:
                    if hasattr(point.interval.end_time, 'timestamp'):
                        timestamp = datetime.fromtimestamp(point.interval.end_time.timestamp())
                    elif hasattr(point.interval.end_time, 'seconds'):
                        timestamp = datetime.fromtimestamp(point.interval.end_time.seconds)
                    else:
                        # Convert protobuf timestamp to datetime
                        timestamp = point.interval.end_time.ToDatetime()
                except Exception as e:
                    print(f"Error converting timestamp: {e}")
                    timestamp = datetime.utcnow()
                value = float(point.value.double_value or point.value.int64_value or 0)
                points.append(GCPTimeSeriesPoint(timestamp=timestamp, value=value))
            
            # Store in database
            ts_doc = GCPTimeSeries(
                project_id=query.project_id,
                metric_type=time_series.metric.type,
                resource_type=time_series.resource.type,
                resource_labels=dict(time_series.resource.labels),
                metric_labels=dict(time_series.metric.labels),
                points=points,
                unit=time_series.unit or "",
                value_type=str(time_series.value_type),
                metric_kind=str(time_series.metric_kind)
            )
            
            result = await db.gcp_timeseries.insert_one(ts_doc.dict(by_alias=True, exclude={"id"}))
            
            time_series_list.append(GCPTimeSeriesResponse(
                id=str(result.inserted_id),
                project_id=query.project_id,
                metric_type=time_series.metric.type,
                resource_type=time_series.resource.type,
                resource_labels=dict(time_series.resource.labels),
                metric_labels=dict(time_series.metric.labels),
                points=points,
                unit=time_series.unit or "",
                value_type=str(time_series.value_type),
                metric_kind=str(time_series.metric_kind),
                created_at=ts_doc.created_at
            ))
        
        return time_series_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query time series: {str(e)}")

@router.get("/monitoring/timeseries", response_model=List[GCPTimeSeriesResponse])
async def list_stored_time_series(
    project_id: Optional[str] = None,
    metric_type: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    db=Depends(get_database)
):
    """List stored time series data"""
    try:
        # Build query filter
        filter_dict = {}
        if project_id:
            filter_dict["project_id"] = project_id
        if metric_type:
            filter_dict["metric_type"] = metric_type
        if resource_type:
            filter_dict["resource_type"] = resource_type
        
        # Query database
        cursor = db.gcp_timeseries.find(filter_dict).sort("created_at", -1).limit(limit)
        time_series_docs = await cursor.to_list(length=limit)
        
        # Convert to response models
        time_series_list = []
        for doc in time_series_docs:
            points = [GCPTimeSeriesPoint(**point) for point in doc.get("points", [])]
            time_series_list.append(GCPTimeSeriesResponse(
                id=str(doc["_id"]),
                project_id=doc["project_id"],
                metric_type=doc["metric_type"],
                resource_type=doc["resource_type"],
                resource_labels=doc.get("resource_labels", {}),
                metric_labels=doc.get("metric_labels", {}),
                points=points,
                unit=doc.get("unit", ""),
                value_type=doc.get("value_type", "DOUBLE"),
                metric_kind=doc.get("metric_kind", "GAUGE"),
                created_at=doc["created_at"]
            ))
        
        return time_series_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list time series: {str(e)}")

@router.get("/monitoring/metric-descriptors", response_model=List[GCPMetricDescriptorResponse])
async def list_metric_descriptors(project_id: str, db=Depends(get_database)):
    """List metric descriptors from GCP Cloud Monitoring API"""
    if not monitoring_v3:
        raise HTTPException(status_code=500, detail="GCP monitoring library not available")
    
    try:
        # Get credentials for the project
        credentials_doc = await db.gcp_credentials.find_one({"project_id": project_id, "enabled": True})
        if not credentials_doc:
            raise HTTPException(status_code=404, detail=f"No enabled credentials found for project {project_id}")
        
        # Create credentials and client
        credentials = service_account.Credentials.from_service_account_info(credentials_doc["service_account_key"])
        client = monitoring_v3.MetricServiceClient(credentials=credentials)
        
        # Build the request
        project_name = f"projects/{project_id}"
        request = monitoring_v3.ListMetricDescriptorsRequest(
            name=project_name,
            page_size=1000
        )
        
        # Execute the query
        page_result = client.list_metric_descriptors(request=request)
        
        # Process results
        descriptors_list = []
        for descriptor in page_result:
            # Convert labels
            labels = []
            for label in descriptor.labels:
                labels.append({
                    "key": label.key,
                    "value_type": str(label.value_type),
                    "description": label.description
                })
            
            # Store in database
            desc_doc = GCPMetricDescriptor(
                project_id=project_id,
                name=descriptor.name,
                type=descriptor.type,
                display_name=descriptor.display_name,
                description=descriptor.description,
                unit=descriptor.unit,
                value_type=str(descriptor.value_type),
                metric_kind=str(descriptor.metric_kind),
                labels=labels
            )
            
            # Upsert to avoid duplicates
            await db.gcp_metric_descriptors.update_one(
                {"project_id": project_id, "type": descriptor.type},
                {"$set": desc_doc.dict(by_alias=True, exclude={"id"})},
                upsert=True
            )
            
            descriptors_list.append(GCPMetricDescriptorResponse(
                id=f"{project_id}_{descriptor.type}",
                project_id=project_id,
                name=descriptor.name,
                type=descriptor.type,
                display_name=descriptor.display_name,
                description=descriptor.description,
                unit=descriptor.unit,
                value_type=str(descriptor.value_type),
                metric_kind=str(descriptor.metric_kind),
                labels=labels,
                created_at=desc_doc.created_at
            ))
        
        return descriptors_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list metric descriptors: {str(e)}")

@router.post("/monitoring/alert-policies", response_model=GCPAlertPolicyResponse)
async def create_alert_policy(policy: GCPAlertPolicyCreate, db=Depends(get_database)):
    """Create a new alert policy in GCP Cloud Monitoring"""
    if not monitoring_v3:
        raise HTTPException(status_code=500, detail="GCP monitoring library not available")
    
    try:
        # Get credentials for the project
        credentials_doc = await db.gcp_credentials.find_one({"project_id": policy.project_id, "enabled": True})
        if not credentials_doc:
            raise HTTPException(status_code=404, detail=f"No enabled credentials found for project {policy.project_id}")
        
        # Create credentials and client
        credentials = service_account.Credentials.from_service_account_info(credentials_doc["service_account_key"])
        client = monitoring_v3.AlertPolicyServiceClient(credentials=credentials)
        
        # Build the alert policy
        project_name = f"projects/{policy.project_id}"
        alert_policy = monitoring_v3.AlertPolicy(
            display_name=policy.display_name,
            documentation=monitoring_v3.AlertPolicy.Documentation(content=policy.documentation) if policy.documentation else None,
            conditions=policy.conditions,
            notification_channels=policy.notification_channels,
            enabled=policy.enabled,
            combiner=getattr(monitoring_v3.AlertPolicy.ConditionCombinerType, policy.combiner, monitoring_v3.AlertPolicy.ConditionCombinerType.OR)
        )
        
        # Create the alert policy
        request = monitoring_v3.CreateAlertPolicyRequest(
            name=project_name,
            alert_policy=alert_policy
        )
        
        created_policy = client.create_alert_policy(request=request)
        
        # Store in database
        policy_doc = GCPAlertPolicy(
            project_id=policy.project_id,
            name=created_policy.name,
            display_name=created_policy.display_name,
            documentation=created_policy.documentation.content if created_policy.documentation else None,
            conditions=policy.conditions,
            notification_channels=policy.notification_channels,
            enabled=created_policy.enabled,
            combiner=policy.combiner,
            creation_record={"time": datetime.utcnow().isoformat()},
            mutation_record={"time": datetime.utcnow().isoformat()}
        )
        
        result = await db.gcp_alert_policies.insert_one(policy_doc.dict(by_alias=True, exclude={"id"}))
        
        return GCPAlertPolicyResponse(
            id=str(result.inserted_id),
            project_id=policy.project_id,
            name=created_policy.name,
            display_name=created_policy.display_name,
            documentation=created_policy.documentation.content if created_policy.documentation else None,
            conditions=policy.conditions,
            notification_channels=policy.notification_channels,
            enabled=created_policy.enabled,
            combiner=policy.combiner,
            created_at=policy_doc.created_at,
            updated_at=policy_doc.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert policy: {str(e)}")

@router.get("/monitoring/alert-policies", response_model=List[GCPAlertPolicyResponse])
async def list_alert_policies(project_id: str, db=Depends(get_database)):
    """List alert policies from GCP Cloud Monitoring API"""
    if not monitoring_v3:
        raise HTTPException(status_code=500, detail="GCP monitoring library not available")
    
    try:
        # Get credentials for the project
        credentials_doc = await db.gcp_credentials.find_one({"project_id": project_id, "enabled": True})
        if not credentials_doc:
            raise HTTPException(status_code=404, detail=f"No enabled credentials found for project {project_id}")
        
        # Create credentials and client
        credentials = service_account.Credentials.from_service_account_info(credentials_doc["service_account_key"])
        client = monitoring_v3.AlertPolicyServiceClient(credentials=credentials)
        
        # Build the request
        project_name = f"projects/{project_id}"
        request = monitoring_v3.ListAlertPoliciesRequest(
            name=project_name,
            page_size=1000
        )
        
        # Execute the query
        page_result = client.list_alert_policies(request=request)
        
        # Process results
        policies_list = []
        for policy in page_result:
            # Store in database
            policy_doc = GCPAlertPolicy(
                project_id=project_id,
                name=policy.name,
                display_name=policy.display_name,
                documentation=policy.documentation.content if policy.documentation else None,
                conditions=[dict(condition) for condition in policy.conditions],
                notification_channels=list(policy.notification_channels),
                enabled=policy.enabled,
                combiner=str(policy.combiner)
            )
            
            # Upsert to avoid duplicates
            await db.gcp_alert_policies.update_one(
                {"project_id": project_id, "name": policy.name},
                {"$set": policy_doc.dict(by_alias=True, exclude={"id"})},
                upsert=True
            )
            
            policies_list.append(GCPAlertPolicyResponse(
                id=f"{project_id}_{policy.name.split('/')[-1]}",
                project_id=project_id,
                name=policy.name,
                display_name=policy.display_name,
                documentation=policy.documentation.content if policy.documentation else None,
                conditions=[dict(condition) for condition in policy.conditions],
                notification_channels=list(policy.notification_channels),
                enabled=policy.enabled,
                combiner=str(policy.combiner),
                created_at=policy_doc.created_at,
                updated_at=policy_doc.updated_at
            ))
        
        return policies_list
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list alert policies: {str(e)}")


@router.get("/scheduler/status")
async def get_gcp_scheduler_status():
    """Get the status of the GCP metrics scheduler"""
    try:
        from tasks.gcp_scheduler import get_gcp_scheduler_status
        status = await get_gcp_scheduler_status()
        return {
            "status": "success",
            "scheduler": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler status: {str(e)}")