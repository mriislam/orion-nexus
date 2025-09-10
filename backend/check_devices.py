import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

async def check_devices():
    # Connect to MongoDB
    mongodb_url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
    mongodb_database = os.getenv('MONGODB_DATABASE', 'orion_nexus')
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client[mongodb_database]
    
    print("=== All Devices in Database ===")
    devices_cursor = db.devices.find({})
    devices = await devices_cursor.to_list(length=None)
    
    for device in devices:
        print(f"ID: {device['_id']}")
        print(f"Name: {device['name']}")
        print(f"IP: {device['ip_address']}")
        print(f"Enabled: {device.get('enabled', 'N/A')}")
        print(f"Is Active: {device.get('is_active', 'N/A')}")
        print(f"SNMP Version: {device.get('snmp_version', 'N/A')}")
        print(f"SNMP Community: {device.get('snmp_community', 'N/A')}")
        print(f"Last Report Time: {device.get('last_report_time', 'N/A')}")
        print(f"Created At: {device.get('created_at', 'N/A')}")
        print("-" * 50)
    
    print(f"\nTotal devices: {len(devices)}")
    
    # Check active devices specifically
    print("\n=== Active Devices (is_active=True) ===")
    active_devices_cursor = db.devices.find({"is_active": True})
    active_devices = await active_devices_cursor.to_list(length=None)
    
    for device in active_devices:
        print(f"Active Device: {device['name']} ({device['ip_address']})")
    
    print(f"\nActive devices count: {len(active_devices)}")
    
    # Check recent health records
    print("\n=== Recent Health Records ===")
    health_cursor = db.device_health.find({}).sort("timestamp", -1).limit(10)
    health_records = await health_cursor.to_list(length=None)
    
    for record in health_records:
        print(f"Device ID: {record['device_id']}, Timestamp: {record['timestamp']}, Reachable: {record.get('is_reachable', 'N/A')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_devices())