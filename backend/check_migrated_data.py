import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.database import init_db
import json

async def check_data():
    # Initialize database
    await init_db()
    
    # Get database instance
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.orion_nexus  # Use the correct database name
    
    # List all collections
    collections = await db.list_collection_names()
    print(f"Available collections: {collections}")
    
    # Check gcp_resources collection
    if "gcp_resources" in collections:
        count = await db.gcp_resources.count_documents({})
        print(f"\ngcp_resources collection has {count} documents")
        
        if count > 0:
            sample = await db.gcp_resources.find_one({})
            print("\nSample from gcp_resources:")
            print(json.dumps(sample, indent=2, default=str))
    
    # Check gcp_compute_engine collection
    if "gcp_compute_engine" in collections:
        count = await db.gcp_compute_engine.count_documents({})
        print(f"\ngcp_compute_engine collection has {count} documents")
        
        if count > 0:
            sample = await db.gcp_compute_engine.find_one({})
            print("\nSample from gcp_compute_engine:")
            print(json.dumps(sample, indent=2, default=str))
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_data())