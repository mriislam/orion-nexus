#!/usr/bin/env python3
import asyncio
import sys
sys.path.append('.')
from services.snmp_poller import SNMPPoller, SNMPCredentials
from models.device import SNMPVersion
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_disk_oids():
    """Test various disk-related OIDs on Linux servers"""
    
    device_ip = "192.168.5.14"  # Linux server
    
    credentials = SNMPCredentials(
        version=SNMPVersion.V2C,
        community="public"
    )
    
    poller = SNMPPoller()
    
    print(f"\n=== Testing disk OIDs for {device_ip} ===")
    
    # Test 1: Check if UCD-SNMP-MIB is properly configured
    print("\n1. Testing UCD-SNMP-MIB disk configuration...")
    try:
        # Check if disk monitoring is configured in snmpd.conf
        disk_config = await poller._snmp_walk(device_ip, credentials, '1.3.6.1.4.1.2021.9.1.2')  # dskPath
        print(f"Disk configuration: {disk_config}")
        
        if not disk_config or any('No Such' in str(v) for v in disk_config.values()):
            print("-> UCD-SNMP disk monitoring not configured in snmpd.conf")
            print("-> Need to add 'disk /' lines to snmpd.conf")
        else:
            print("-> UCD-SNMP disk monitoring is configured")
            
    except Exception as e:
        print(f"UCD-SNMP test failed: {e}")
    
    # Test 2: Check HOST-RESOURCES-MIB storage types
    print("\n2. Testing HOST-RESOURCES-MIB storage types...")
    try:
        storage_types = await poller._snmp_walk(device_ip, credentials, '1.3.6.1.2.1.25.2.3.1.2')  # hrStorageType
        storage_descr = await poller._snmp_walk(device_ip, credentials, '1.3.6.1.2.1.25.2.3.1.3')  # hrStorageDescr
        
        print(f"Storage types: {storage_types}")
        print(f"Storage descriptions: {storage_descr}")
        
        # Check for fixed disk storage type (1.3.6.1.2.1.25.2.1.4)
        fixed_disk_oid = '1.3.6.1.2.1.25.2.1.4'
        for index, storage_type in (storage_types or {}).items():
            if str(storage_type).endswith('.4'):  # Fixed disk type
                print(f"Found fixed disk storage at index {index}")
                storage_index = index.split('.')[-1]
                
                # Get details for this storage
                size_oid = f"1.3.6.1.2.1.25.2.3.1.5.{storage_index}"
                used_oid = f"1.3.6.1.2.1.25.2.3.1.6.{storage_index}"
                units_oid = f"1.3.6.1.2.1.25.2.3.1.4.{storage_index}"
                
                details = await poller._snmp_get(device_ip, credentials, [size_oid, used_oid, units_oid])
                print(f"  Size: {details.get(size_oid)}")
                print(f"  Used: {details.get(used_oid)}")
                print(f"  Units: {details.get(units_oid)}")
                
    except Exception as e:
        print(f"HOST-RESOURCES storage types test failed: {e}")
    
    # Test 3: Check for NET-SNMP specific disk OIDs
    print("\n3. Testing NET-SNMP specific OIDs...")
    try:
        # Try to get disk information from NET-SNMP extend
        net_snmp_oids = [
            '1.3.6.1.4.1.8072.1.3.2.3.1.2',  # nsExtendOutput1Line
            '1.3.6.1.4.1.2021.4.3.0',        # memTotalSwap
            '1.3.6.1.4.1.2021.4.4.0',        # memAvailSwap
        ]
        
        for oid in net_snmp_oids:
            result = await poller._snmp_get(device_ip, credentials, [oid])
            print(f"OID {oid}: {result.get(oid, 'Not available')}")
            
    except Exception as e:
        print(f"NET-SNMP test failed: {e}")
    
    # Test 4: Walk the entire HOST-RESOURCES storage tree
    print("\n4. Walking entire HOST-RESOURCES storage tree...")
    try:
        # Walk all storage entries
        all_storage = await poller._snmp_walk(device_ip, credentials, '1.3.6.1.2.1.25.2.3.1')
        
        # Group by storage index
        storage_entries = {}
        for oid, value in (all_storage or {}).items():
            parts = oid.split('.')
            if len(parts) >= 2:
                table_oid = parts[-2]  # 3=descr, 4=units, 5=size, 6=used, 2=type
                index = parts[-1]
                
                if index not in storage_entries:
                    storage_entries[index] = {}
                
                if table_oid == '2':  # type
                    storage_entries[index]['type'] = value
                elif table_oid == '3':  # description
                    storage_entries[index]['description'] = value
                elif table_oid == '4':  # units
                    storage_entries[index]['units'] = value
                elif table_oid == '5':  # size
                    storage_entries[index]['size'] = value
                elif table_oid == '6':  # used
                    storage_entries[index]['used'] = value
        
        print("\nStorage entries found:")
        for index, entry in storage_entries.items():
            print(f"Index {index}:")
            print(f"  Type: {entry.get('type', 'N/A')}")
            print(f"  Description: {entry.get('description', 'N/A')}")
            print(f"  Units: {entry.get('units', 'N/A')}")
            print(f"  Size: {entry.get('size', 'N/A')}")
            print(f"  Used: {entry.get('used', 'N/A')}")
            
            # Calculate if this looks like disk storage
            desc = str(entry.get('description', '')).lower()
            if any(keyword in desc for keyword in ['/', 'disk', 'filesystem', 'ext', 'xfs', 'ntfs']):
                size = entry.get('size')
                used = entry.get('used')
                units = entry.get('units', 1)
                
                if size and used and str(size).isdigit() and str(used).isdigit():
                    total_bytes = int(size) * int(units)
                    used_bytes = int(used) * int(units)
                    print(f"  -> DISK STORAGE FOUND!")
                    print(f"  -> Total: {total_bytes:,} bytes ({total_bytes/1024/1024/1024:.2f} GB)")
                    print(f"  -> Used: {used_bytes:,} bytes ({used_bytes/1024/1024/1024:.2f} GB)")
                    print(f"  -> Utilization: {(used_bytes/total_bytes*100):.1f}%")
            print()
            
    except Exception as e:
        print(f"Storage tree walk failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_disk_oids())