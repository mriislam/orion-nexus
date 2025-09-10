from typing import Dict, Any, List, Optional
from bson import ObjectId
from datetime import datetime


def convert_objectid_to_str(data: Any) -> Any:
    """Recursively convert ObjectId instances to strings in data structures"""
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, dict):
        return {key: convert_objectid_to_str(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    else:
        return data


def build_aggregation_pipeline(
    query_filter: Dict[str, Any],
    group_by_field: str = "resource_id",
    sort_field: str = "created_at",
    sort_order: int = -1
) -> List[Dict[str, Any]]:
    """Build a common aggregation pipeline for getting latest records"""
    return [
        {"$match": query_filter},
        {"$sort": {sort_field: sort_order}},
        {
            "$group": {
                "_id": f"${group_by_field}",
                "latest_record": {"$first": "$$ROOT"}
            }
        },
        {"$replaceRoot": {"newRoot": "$latest_record"}},
        {"$sort": {sort_field: sort_order}}
    ]


def safe_get(data: Dict[str, Any], key: str, default: Any = "") -> Any:
    """Safely get a value from a dictionary with a default"""
    return data.get(key, default)


def extract_network_ip(metadata: Dict[str, Any], ip_type: str = "internal") -> str:
    """Extract IP address from GCP metadata network interfaces"""
    network_interfaces = metadata.get("network_interfaces", [])
    if not network_interfaces:
        return ""
    
    interface = network_interfaces[0] if network_interfaces else {}
    
    if ip_type == "internal":
        return interface.get("network_ip", "")
    elif ip_type == "external":
        access_configs = interface.get("access_configs", [])
        if access_configs:
            return access_configs[0].get("nat_ip", "")
    
    return ""


def format_datetime(dt: Any) -> Optional[datetime]:
    """Format datetime from various input types"""
    if isinstance(dt, datetime):
        return dt
    elif isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None
    return None


def validate_object_id(id_string: str) -> bool:
    """Validate if a string is a valid ObjectId"""
    try:
        ObjectId(id_string)
        return True
    except Exception:
        return False