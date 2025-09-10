#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

async def test_mongodb_connection():
    """Test MongoDB connection directly"""
    print(f"Testing MongoDB connection to: {settings.mongodb_url}")
    print(f"Database name: {settings.database_name}")
    
    try:
        # Create client
        client = AsyncIOMotorClient(settings.mongodb_url)
        
        # Test connection
        await client.admin.command('ping')
        print("✓ MongoDB connection successful")
        
        # Get database
        db = client[settings.database_name]
        
        # Test database operations
        collections = await db.list_collection_names()
        print(f"✓ Database accessible, collections: {collections}")
        
        # Test users collection
        users_count = await db.users.count_documents({})
        print(f"✓ Users collection accessible, count: {users_count}")
        
        # Check for superadmin
        superadmin = await db.users.find_one({"role": "superadmin"})
        if superadmin:
            print(f"✓ Superadmin found: {superadmin['email']}")
        else:
            print("⚠ No superadmin found")
        
        client.close()
        
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure MongoDB is running: brew services start mongodb-community")
        print("2. Check if MongoDB is listening on port 27017")
        print("3. Verify the connection string in config.py")

if __name__ == "__main__":
    asyncio.run(test_mongodb_connection())