import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import re

async def fix_double_slash_urls():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.orion_nexus
    
    # Find all streams
    streams = await db.streams.find({}).to_list(length=None)
    print(f'Found {len(streams)} total streams')
    
    fixed_count = 0
    for stream in streams:
        old_url = stream.get("url")
        # Fix only triple or more slashes, but preserve legitimate double slashes
        # This regex only fixes cases like ///+ but preserves //live/ paths
        new_url = re.sub(r'(?<!:)/{3,}', '/', old_url)
        
        if old_url != new_url:
            print(f'Fixing: {old_url} -> {new_url}')
            await db.streams.update_one(
                {"_id": stream["_id"]},
                {"$set": {"url": new_url}}
            )
            fixed_count += 1
        else:
            print(f'No fix needed: {old_url}')
    
    print(f'Fixed {fixed_count} URLs')
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_double_slash_urls())