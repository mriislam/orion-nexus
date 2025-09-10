from datetime import datetime
import pytz

# API timestamp from the response
api_timestamp = "2025-09-08T03:57:27.818000"

# Parse the timestamp
time_obj = datetime.fromisoformat(api_timestamp.replace('Z', '+00:00'))
print(f"API timestamp: {api_timestamp}")
print(f"Parsed time (assuming UTC): {time_obj}")

# Current time
now_utc = datetime.utcnow()
now_local = datetime.now()

print(f"Current UTC time: {now_utc}")
print(f"Current local time: {now_local}")

# Calculate difference
diff_utc = now_utc - time_obj
diff_local = now_local - time_obj

print(f"Difference from UTC: {diff_utc}")
print(f"Difference from local: {diff_local}")

# Calculate minutes
diff_mins_utc = diff_utc.total_seconds() / 60
diff_mins_local = diff_local.total_seconds() / 60

print(f"Minutes ago (UTC): {diff_mins_utc:.1f}")
print(f"Minutes ago (local): {diff_mins_local:.1f}")

# What would the frontend show?
if diff_mins_local < 1:
    result = 'Just now'
elif diff_mins_local < 60:
    result = f'{int(diff_mins_local)} minute{"s" if int(diff_mins_local) > 1 else ""} ago'
else:
    diff_hours = int(diff_mins_local / 60)
    result = f'{diff_hours} hour{"s" if diff_hours > 1 else ""} ago'

print(f"Frontend would show: {result}")