import asyncio
from core.database import get_database, init_db

async def check_resources():
    await init_db()
    db = await get_database()
    
    # Get all resources
    resources = await db.gcp_resources.find({}).to_list(length=None)
    print(f'Total resources in DB: {len(resources)}')
    
    # Group by service type
    service_counts = {}
    for r in resources:
        service_type = r.get('service_type')
        service_counts[service_type] = service_counts.get(service_type, 0) + 1
    
    print('\nResources by service type:')
    for service, count in service_counts.items():
        print(f'  {service}: {count}')
    
    # Show first few resources
    print('\nFirst 5 resources:')
    for r in resources[:5]:
        print(f'  Service: {r.get("service_type")}, Name: {r.get("resource_name")}, ID: {r.get("resource_id")}')
    
    # Check GCP credentials
    creds = await db.gcp_credentials.find({}).to_list(length=None)
    print(f'\nGCP Credentials: {len(creds)}')
    for c in creds:
        print(f'  Project: {c.get("project_id")}, Enabled: {c.get("enabled")}, ID: {c.get("_id")}')

if __name__ == '__main__':
    asyncio.run(check_resources())