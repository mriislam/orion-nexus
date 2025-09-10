from sqlalchemy import create_engine, text
import os
from datetime import datetime

engine = create_engine(os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/monitoring_db'))

with engine.connect() as conn:
    # Get device info
    result = conn.execute(text('SELECT name, last_report_time, last_successful_poll, updated_at FROM devices LIMIT 1')).fetchone()
    print(f'Device: {result[0]}')
    print(f'last_report_time: {result[1]}')
    print(f'last_successful_poll: {result[2]}')
    print(f'updated_at: {result[3]}')
    print(f'Current time: {datetime.utcnow()}')
    
    # Get latest health record
    health_result = conn.execute(text('SELECT timestamp FROM device_health WHERE device_id = (SELECT id FROM devices LIMIT 1) ORDER BY timestamp DESC LIMIT 1')).fetchone()
    print(f'Latest health timestamp: {health_result[0] if health_result else None}')