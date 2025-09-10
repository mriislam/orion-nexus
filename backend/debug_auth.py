#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import get_database
from core.auth import get_current_user, create_superadmin_user
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

async def test_auth_scenarios():
    """Test different authentication scenarios"""
    print("Testing authentication scenarios...")
    
    # First initialize the database like the main app does
    from core.database import init_db
    await init_db()
    
    try:
        db = await get_database()
        print(f"✓ Database connection successful: {db}")
        if db is None:
            print("✗ Database is None - initialization failed")
            return
        
        # Test 1: No credentials (should create superadmin)
        print("\n1. Testing with no credentials (should create superadmin)...")
        try:
            user = await get_current_user(None, db)
            print(f"✓ User created/found: {user.email} (role: {user.role})")
        except Exception as e:
            print(f"✗ Error with no credentials: {e}")
        
        # Test 2: Invalid token
        print("\n2. Testing with invalid token...")
        try:
            fake_creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid_token")
            user = await get_current_user(fake_creds, db)
            print(f"✓ Unexpected success with invalid token: {user.email}")
        except HTTPException as e:
            print(f"✓ Correctly rejected invalid token: {e.detail}")
        except Exception as e:
            print(f"✗ Unexpected error with invalid token: {e}")
        
        # Test 3: Check superadmin exists
        print("\n3. Checking if superadmin exists in database...")
        superadmin = await db.users.find_one({"role": "superadmin"})
        if superadmin:
            print(f"✓ Superadmin found: {superadmin['email']}")
            print(f"  - Active: {superadmin.get('is_active', False)}")
            print(f"  - Permissions: {superadmin.get('permissions', [])}")
        else:
            print("✗ No superadmin found in database")
        
        # Test 4: Test analytics credentials endpoint logic
        print("\n4. Testing analytics credentials endpoint logic...")
        try:
            # Simulate the endpoint logic
            cursor = db.ga_credentials.find({"user_id": "test_user_id"})
            credentials_list = []
            async for doc in cursor:
                credentials_list.append(doc)
            print(f"✓ Analytics credentials query successful, found {len(credentials_list)} credentials")
        except Exception as e:
            print(f"✗ Error querying analytics credentials: {e}")
            
    except Exception as e:
        print(f"✗ Database connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_auth_scenarios())