import asyncio
from core.database import init_db, get_database

async def activate_device():
    await init_db()
    db = await get_database()
    
    # Find all devices and activate them
    devices = await db.devices.find().to_list(length=None)
    print(f"Found {len(devices)} devices")
    
    for device in devices:
        print(f"Device: {device.get('name', 'Unknown')} ({device.get('ip_address')}) - Current status: {device.get('is_active', False)}")
        
        if not device.get('is_active', False):
            # Activate the device
            result = await db.devices.update_one(
                {"_id": device["_id"]},
                {"$set": {"is_active": True}}
            )
            print(f"  -> Activated device. Modified: {result.modified_count} document(s)")
        else:
            print(f"  -> Device already active")
    
    print("\nFinal status:")
    devices = await db.devices.find().to_list(length=None)
    for d in devices:
        print(f"- {d.get('name', 'Unknown')} ({d.get('ip_address')}) - Active: {d.get('is_active', False)}")

if __name__ == "__main__":
    asyncio.run(activate_device())