import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.auth import get_password_hash
from bson import ObjectId

async def fix_admin_password():
    print("=== FIXING ADMIN PASSWORD ===")
    
    # Connect to database
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    # Find the admin user
    admin_user = await db.users.find_one({"email": "admin@example.com"})
    
    if not admin_user:
        print("❌ Admin user not found!")
        return
    
    print(f"✓ Found admin user: {admin_user['email']}")
    print(f"  Current fields: {list(admin_user.keys())}")
    
    # Check if password field exists
    has_password = 'hashed_password' in admin_user or 'password' in admin_user
    print(f"  Has password field: {has_password}")
    
    if not has_password:
        # Add hashed password
        hashed_password = get_password_hash("admin123")
        
        # Update the user with hashed password
        result = await db.users.update_one(
            {"_id": admin_user["_id"]},
            {
                "$set": {
                    "hashed_password": hashed_password
                }
            }
        )
        
        if result.modified_count > 0:
            print("✅ Successfully added hashed password to admin user")
            print(f"   Password: admin123")
            print(f"   Hash: {hashed_password[:50]}...")
        else:
            print("❌ Failed to update admin user")
    else:
        print("✓ Admin user already has password field")
    
    # Verify the update
    updated_user = await db.users.find_one({"email": "admin@example.com"})
    print(f"\nVerification:")
    print(f"  Updated fields: {list(updated_user.keys())}")
    print(f"  Has hashed_password: {'hashed_password' in updated_user}")
    
    client.close()
    print("\n=== FIX COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(fix_admin_password())