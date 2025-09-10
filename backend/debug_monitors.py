import asyncio
from core.database import get_database

async def check_monitors():
    db = await get_database()
    monitors = await db.uptime_monitors.find({}).to_list(length=None)
    for m in monitors:
        print(f'Monitor: {m.get("name")}, expected_content: {repr(m.get("expected_content"))}')

if __name__ == "__main__":
    asyncio.run(check_monitors())