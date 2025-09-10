import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.monitoring_portal
    
    # Check total credentials
    count = await db.ga_credentials.count_documents({})
    print(f'Total GA credentials in database: {count}')
    
    # Check for specific user
    user_id = "68c1142436b5440c78ae68a2"
    user_count = await db.ga_credentials.count_documents({"user_id": user_id})
    print(f'GA credentials for user {user_id}: {user_count}')
    
    # List all documents
    docs = []
    async for doc in db.ga_credentials.find({}):
        docs.append({
            '_id': str(doc['_id']),
            'user_id': doc.get('user_id'),
            'property_id': doc.get('property_id'),
            'service_account_email': doc.get('service_account_email'),
            'created_at': doc.get('created_at'),
            'is_active': doc.get('is_active')
        })
    
    print(f'All documents: {docs}')
    
    # Check if there are any collections in the database
    collections = await db.list_collection_names()
    print(f'Available collections: {collections}')
    
    client.close()

if __name__ == '__main__':
    asyncio.run(check_db())