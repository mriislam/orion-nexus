import requests
import json

try:
    response = requests.post('http://localhost:8000/api/v1/gcp/metrics/collect')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")