import asyncio
from core.database import get_database

async def check_monitors():
    db = await get_database()
    
    # Get all uptime monitors
    monitors = await db.uptime_monitors.find({}).to_list(length=None)
    print('Uptime Monitors:')
    for m in monitors:
        print(f'Name: {m.get("name")}')
        print(f'URL: {m.get("url")}')
        print(f'Expected Status: {m.get("expected_status_code", 200)}')
        print(f'Expected Content: {m.get("expected_content")}')
        print(f'Active: {m.get("is_active")}')
        print('---')
    
    # Get recent check results
    recent_results = await db.uptime_check_results.find({}).sort('checked_at', -1).limit(10).to_list(length=None)
    print('\nRecent Check Results:')
    for r in recent_results:
        print(f'Status: {r.get("status")}')
        print(f'Status Code: {r.get("status_code")}')
        print(f'Response Time: {r.get("response_time")}')
        print(f'Error: {r.get("error_message")}')
        print(f'Checked At: {r.get("checked_at")}')
        print('---')

if __name__ == "__main__":
    asyncio.run(check_monitors())