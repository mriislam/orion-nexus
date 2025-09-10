#!/usr/bin/env python3
import asyncio
import sys
sys.path.append('.')
from services.snmp_poller import SNMPPoller, SNMPCredentials
from models.device import SNMPVersion
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_device_types():
    """Check what type of devices we're dealing with"""
    
    device_ips = ["192.168.5.14", "192.168.5.33", "192.168.5.153", "192.168.5.121"]
    
    credentials = SNMPCredentials(
        version=SNMPVersion.V2C,
        community="public"
    )
    
    poller = SNMPPoller()
    
    for device_ip in device_ips:
        print(f"\n=== Checking device {device_ip} ===")
        
        try:
            # Get system description
            result = await poller._snmp_get(device_ip, credentials, ['1.3.6.1.2.1.1.1.0'])
            sys_desc = result.get('1.3.6.1.2.1.1.1.0', 'Unknown')
            print(f"System Description: {sys_desc}")
            
            # Check if it's a network device that might not have traditional disk storage
            if any(keyword in str(sys_desc).lower() for keyword in ['router', 'switch', 'cisco', 'juniper', 'mikrotik']):
                print("-> This appears to be a network device (router/switch)")
                print("-> Network devices typically don't expose disk storage via SNMP")
                print("-> They may have flash memory but not traditional disk storage")
            elif any(keyword in str(sys_desc).lower() for keyword in ['linux', 'windows', 'server', 'host']):
                print("-> This appears to be a server/host device")
                print("-> Should have disk storage information available")
            else:
                print("-> Device type unclear from system description")
                
        except Exception as e:
            print(f"Error checking device {device_ip}: {e}")

if __name__ == "__main__":
    asyncio.run(check_device_types())