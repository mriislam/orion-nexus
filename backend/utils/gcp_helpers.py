from typing import Dict, Any, List, Optional
from datetime import datetime
import json

# Import GCP libraries with error handling
try:
    from google.cloud import monitoring_v3
    from google.cloud import compute_v1
    from google.cloud import storage
    from google.oauth2 import service_account
    import google.auth
    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False
    monitoring_v3 = None
    compute_v1 = None
    storage = None
    service_account = None
    google = None


def is_gcp_available() -> bool:
    """Check if GCP libraries are available"""
    return GCP_AVAILABLE


def create_gcp_credentials(service_account_key: Dict[str, Any]):
    """Create GCP credentials from service account key"""
    if not is_gcp_available():
        raise ImportError("GCP libraries not available")
    
    return service_account.Credentials.from_service_account_info(service_account_key)


def validate_service_account_key(key_data: Dict[str, Any]) -> bool:
    """Validate GCP service account key structure"""
    required_fields = [
        'type', 'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri'
    ]
    
    return all(field in key_data for field in required_fields)


def extract_project_id(service_account_key: Dict[str, Any]) -> Optional[str]:
    """Extract project ID from service account key"""
    return service_account_key.get('project_id')


def format_gcp_resource_name(name: str, project_id: str, zone: Optional[str] = None) -> str:
    """Format GCP resource name consistently"""
    if zone:
        return f"projects/{project_id}/zones/{zone}/instances/{name}"
    return f"projects/{project_id}/global/{name}"


def parse_gcp_resource_url(url: str) -> Dict[str, str]:
    """Parse GCP resource URL to extract components"""
    parts = url.split('/')
    result = {}
    
    for i, part in enumerate(parts):
        if part == 'projects' and i + 1 < len(parts):
            result['project_id'] = parts[i + 1]
        elif part == 'zones' and i + 1 < len(parts):
            result['zone'] = parts[i + 1]
        elif part == 'regions' and i + 1 < len(parts):
            result['region'] = parts[i + 1]
        elif part == 'instances' and i + 1 < len(parts):
            result['instance_name'] = parts[i + 1]
    
    return result


def get_gcp_resource_labels(resource: Dict[str, Any]) -> Dict[str, str]:
    """Extract labels from GCP resource"""
    return resource.get('labels', {})


def format_gcp_machine_type(machine_type_url: str) -> str:
    """Extract machine type from full URL"""
    if '/' in machine_type_url:
        return machine_type_url.split('/')[-1]
    return machine_type_url


def calculate_storage_size_gb(size_bytes: int) -> float:
    """Convert bytes to GB"""
    return round(size_bytes / (1024 ** 3), 2)


def get_gcp_service_status(status: str) -> str:
    """Normalize GCP service status"""
    status_mapping = {
        'RUNNING': 'running',
        'STOPPED': 'stopped',
        'TERMINATED': 'terminated',
        'PROVISIONING': 'provisioning',
        'STAGING': 'staging',
        'STOPPING': 'stopping',
        'SUSPENDING': 'suspending',
        'SUSPENDED': 'suspended',
        'REPAIRING': 'repairing'
    }
    
    return status_mapping.get(status.upper(), status.lower())


def extract_zone_from_url(zone_url: str) -> str:
    """Extract zone name from GCP zone URL"""
    if '/' in zone_url:
        return zone_url.split('/')[-1]
    return zone_url


def extract_region_from_zone(zone: str) -> str:
    """Extract region from zone name (e.g., us-central1-a -> us-central1)"""
    parts = zone.split('-')
    if len(parts) >= 3:
        return '-'.join(parts[:-1])
    return zone


def format_gcp_timestamp(timestamp_str: str) -> Optional[datetime]:
    """Parse GCP timestamp string to datetime"""
    if not timestamp_str:
        return None
    
    try:
        # Handle RFC3339 format
        if timestamp_str.endswith('Z'):
            timestamp_str = timestamp_str[:-1] + '+00:00'
        return datetime.fromisoformat(timestamp_str)
    except (ValueError, AttributeError):
        return None