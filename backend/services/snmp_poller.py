import asyncio
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pysnmp.hlapi.asyncio import *
from pysnmp.proto.rfc1902 import Counter32, Counter64, Gauge32, Integer32
from pysnmp.error import PySnmpError
import logging
from core.config import settings
from models.device import SNMPVersion, SNMPAuthProtocol, SNMPPrivProtocol

logger = logging.getLogger(__name__)


class SNMPCredentials:
    """SNMP credentials container"""
    def __init__(
        self,
        version: SNMPVersion,
        community: Optional[str] = None,
        username: Optional[str] = None,
        auth_protocol: Optional[SNMPAuthProtocol] = None,
        auth_password: Optional[str] = None,
        priv_protocol: Optional[SNMPPrivProtocol] = None,
        priv_password: Optional[str] = None
    ):
        self.version = version
        self.community = community
        self.username = username
        self.auth_protocol = auth_protocol
        self.auth_password = auth_password
        self.priv_protocol = priv_protocol
        self.priv_password = priv_password


class SNMPPoller:
    """SNMP polling service for network devices"""
    
    # Standard SNMP OIDs
    OID_SYSTEM_DESCR = '1.3.6.1.2.1.1.1.0'
    OID_SYSTEM_UPTIME = '1.3.6.1.2.1.1.3.0'
    OID_SYSTEM_NAME = '1.3.6.1.2.1.1.5.0'
    
    # CPU Load OIDs (Cisco specific)
    OID_CPU_1MIN = '1.3.6.1.4.1.9.9.109.1.1.1.1.7.1'
    OID_CPU_5MIN = '1.3.6.1.4.1.9.9.109.1.1.1.1.8.1'
    OID_CPU_15MIN = '1.3.6.1.4.1.9.9.109.1.1.1.1.9.1'
    
    # Cisco IOS-XE CPU OIDs
    OID_CISCO_CPU_5SEC = '1.3.6.1.4.1.9.9.109.1.1.1.1.6.1'
    OID_CISCO_CPU_1MIN_NEW = '1.3.6.1.4.1.9.9.109.1.1.1.1.7.1'
    OID_CISCO_CPU_5MIN_NEW = '1.3.6.1.4.1.9.9.109.1.1.1.1.8.1'
    
    # Juniper CPU OIDs
    OID_JUNIPER_CPU_UTIL = '1.3.6.1.4.1.2636.3.1.13.1.8'  # jnxOperatingCPU
    OID_JUNIPER_CPU_5MIN = '1.3.6.1.4.1.2636.3.1.13.1.21'  # jnxOperating5MinLoadAvg
    OID_JUNIPER_CPU_15MIN = '1.3.6.1.4.1.2636.3.1.13.1.22'  # jnxOperating15MinLoadAvg
    
    # Memory OIDs (Cisco specific)
    OID_MEMORY_POOL_USED = '1.3.6.1.4.1.9.9.48.1.1.1.5'
    OID_MEMORY_POOL_FREE = '1.3.6.1.4.1.9.9.48.1.1.1.6'
    
    # Cisco Memory Pool OIDs (Enhanced)
    OID_CISCO_MEMORY_POOL_NAME = '1.3.6.1.4.1.9.9.48.1.1.1.2'
    OID_CISCO_MEMORY_POOL_TOTAL = '1.3.6.1.4.1.9.9.48.1.1.1.5'
    OID_CISCO_MEMORY_POOL_USED = '1.3.6.1.4.1.9.9.48.1.1.1.5'
    OID_CISCO_MEMORY_POOL_FREE = '1.3.6.1.4.1.9.9.48.1.1.1.6'
    
    # Additional vendor-specific disk/storage OIDs
    OID_CISCO_DISK_UTIL = '1.3.6.1.4.1.9.9.10.1.1.4.2.1.7'  # Cisco flash utilization
    OID_JUNIPER_DISK_UTIL = '1.3.6.1.4.1.2636.3.1.13.1.14'  # Juniper storage utilization
    OID_WIN_DISK_TOTAL = '1.3.6.1.4.1.311.1.1.3.1.1.5.2.0'  # Windows total disk bytes
    OID_WIN_DISK_FREE = '1.3.6.1.4.1.311.1.1.3.1.1.5.3.0'   # Windows free disk bytes
    OID_LINUX_DISK_TOTAL = '1.3.6.1.4.1.2021.9.1.6'         # Linux disk total (UCD-SNMP)
    OID_LINUX_DISK_USED = '1.3.6.1.4.1.2021.9.1.8'          # Linux disk used (UCD-SNMP)
    OID_LINUX_DISK_AVAIL = '1.3.6.1.4.1.2021.9.1.7'         # Linux disk available (UCD-SNMP)
    
    # Enhanced storage OID aliases for better readability
    OID_STORAGE_DESCR = '1.3.6.1.2.1.25.2.3.1.3'  # hrStorageDescr
    OID_STORAGE_SIZE = '1.3.6.1.2.1.25.2.3.1.5'   # hrStorageSize
    OID_STORAGE_USED = '1.3.6.1.2.1.25.2.3.1.6'   # hrStorageUsed
    OID_STORAGE_UNITS = '1.3.6.1.2.1.25.2.3.1.4'  # hrStorageAllocationUnits
    
    # Juniper Memory OIDs
    OID_JUNIPER_MEMORY_UTIL = '1.3.6.1.4.1.2636.3.1.13.1.11'  # jnxOperatingBuffer
    OID_JUNIPER_MEMORY_TOTAL = '1.3.6.1.4.1.2636.3.1.13.1.11'
    OID_JUNIPER_MEMORY_FREE = '1.3.6.1.4.1.2636.3.1.13.1.11'
    
    # Standard HOST-RESOURCES-MIB OIDs (RFC 2790)
    OID_HR_PROCESSOR_LOAD = '1.3.6.1.2.1.25.3.3.1.2'  # hrProcessorLoad
    OID_HR_STORAGE_INDEX = '1.3.6.1.2.1.25.2.3.1.1'   # hrStorageIndex
    OID_HR_STORAGE_TYPE = '1.3.6.1.2.1.25.2.3.1.2'    # hrStorageType
    OID_HR_STORAGE_DESCR = '1.3.6.1.2.1.25.2.3.1.3'   # hrStorageDescr
    OID_HR_STORAGE_UNITS = '1.3.6.1.2.1.25.2.3.1.4'   # hrStorageAllocationUnits
    OID_HR_STORAGE_SIZE = '1.3.6.1.2.1.25.2.3.1.5'    # hrStorageSize
    OID_HR_STORAGE_USED = '1.3.6.1.2.1.25.2.3.1.6'    # hrStorageUsed
    
    # Standard memory OIDs
    OID_MEMORY_TOTAL = '1.3.6.1.4.1.2021.4.5.0'       # memTotalReal (UCD-SNMP-MIB)
    OID_MEMORY_AVAIL = '1.3.6.1.4.1.2021.4.6.0'       # memAvailReal (UCD-SNMP-MIB)
    OID_MEMORY_FREE = '1.3.6.1.4.1.2021.4.11.0'       # memTotalFree (UCD-SNMP-MIB)
    
    # Standard CPU load OIDs
    OID_LOAD_1MIN = '1.3.6.1.4.1.2021.10.1.3.1'       # laLoad.1 (UCD-SNMP-MIB)
    OID_LOAD_5MIN = '1.3.6.1.4.1.2021.10.1.3.2'       # laLoad.5 (UCD-SNMP-MIB)
    OID_LOAD_15MIN = '1.3.6.1.4.1.2021.10.1.3.3'      # laLoad.15 (UCD-SNMP-MIB)
    
    # UCD-SNMP-MIB Disk OIDs
    OID_DISK_PATH = '1.3.6.1.4.1.2021.9.1.2'          # dskPath (UCD-SNMP-MIB)
    OID_DISK_TOTAL = '1.3.6.1.4.1.2021.9.1.6'         # dskTotal (UCD-SNMP-MIB)
    OID_DISK_AVAIL = '1.3.6.1.4.1.2021.9.1.7'         # dskAvail (UCD-SNMP-MIB)
    OID_DISK_USED = '1.3.6.1.4.1.2021.9.1.8'          # dskUsed (UCD-SNMP-MIB)
    OID_DISK_PERCENT = '1.3.6.1.4.1.2021.9.1.9'       # dskPercent (UCD-SNMP-MIB)
    
    # Windows SNMP OIDs (Microsoft Windows)
    OID_WIN_CPU_UTIL = '1.3.6.1.2.1.25.3.3.1.2'      # hrProcessorLoad
    OID_WIN_MEMORY_TOTAL = '1.3.6.1.4.1.311.1.1.3.1.1.5.4.0'  # Memory\Total Bytes
    OID_WIN_MEMORY_AVAIL = '1.3.6.1.4.1.311.1.1.3.1.1.5.24.0' # Memory\Available Bytes
    OID_WIN_DISK_FREE_BYTES = '1.3.6.1.4.1.311.1.1.3.1.1.5.1.0'  # LogicalDisk\Free Megabytes
    
    # Linux/Unix specific OIDs (NET-SNMP)
    OID_LINUX_CPU_USER = '1.3.6.1.4.1.2021.11.9.0'   # ssCpuUser
    OID_LINUX_CPU_SYSTEM = '1.3.6.1.4.1.2021.11.10.0' # ssCpuSystem
    OID_LINUX_CPU_IDLE = '1.3.6.1.4.1.2021.11.11.0'  # ssCpuIdle
    OID_LINUX_LOAD_1MIN = '1.3.6.1.4.1.2021.10.1.3.1' # laLoad.1
    OID_LINUX_LOAD_5MIN = '1.3.6.1.4.1.2021.10.1.3.2' # laLoad.5
    OID_LINUX_LOAD_15MIN = '1.3.6.1.4.1.2021.10.1.3.3' # laLoad.15
    
    # Cisco Flash/Disk OIDs
    OID_CISCO_FLASH_SIZE = '1.3.6.1.4.1.9.9.10.1.1.4.2.1.4'
    OID_CISCO_FLASH_USED = '1.3.6.1.4.1.9.9.10.1.1.4.2.1.5'
    OID_CISCO_FLASH_FREE = '1.3.6.1.4.1.9.9.10.1.1.4.2.1.6'
    
    # Juniper Storage OIDs
    OID_JUNIPER_STORAGE_DESCR = '1.3.6.1.4.1.2636.3.1.13.1.10'
    OID_JUNIPER_STORAGE_SIZE = '1.3.6.1.4.1.2636.3.1.13.1.12'
    OID_JUNIPER_STORAGE_USED = '1.3.6.1.4.1.2636.3.1.13.1.13'
    
    # Interface OIDs
    OID_IF_INDEX = '1.3.6.1.2.1.2.2.1.1'
    OID_IF_DESCR = '1.3.6.1.2.1.2.2.1.2'
    OID_IF_TYPE = '1.3.6.1.2.1.2.2.1.3'
    OID_IF_SPEED = '1.3.6.1.2.1.2.2.1.5'
    OID_IF_ADMIN_STATUS = '1.3.6.1.2.1.2.2.1.7'
    OID_IF_OPER_STATUS = '1.3.6.1.2.1.2.2.1.8'
    OID_IF_IN_OCTETS = '1.3.6.1.2.1.2.2.1.10'
    OID_IF_OUT_OCTETS = '1.3.6.1.2.1.2.2.1.16'
    OID_IF_IN_UCAST_PKTS = '1.3.6.1.2.1.2.2.1.11'
    OID_IF_OUT_UCAST_PKTS = '1.3.6.1.2.1.2.2.1.17'
    OID_IF_IN_ERRORS = '1.3.6.1.2.1.2.2.1.14'
    OID_IF_OUT_ERRORS = '1.3.6.1.2.1.2.2.1.20'
    OID_IF_IN_DISCARDS = '1.3.6.1.2.1.2.2.1.13'
    OID_IF_OUT_DISCARDS = '1.3.6.1.2.1.2.2.1.19'
    
    def __init__(self):
        self.timeout = settings.snmp_timeout
        self.retries = settings.snmp_retries
    
    def _create_auth_data(self, credentials: SNMPCredentials):
        """Create SNMP authentication data based on version"""
        if credentials.version == SNMPVersion.V2C:
            return CommunityData(credentials.community or 'public')
        
        elif credentials.version == SNMPVersion.V3:
            auth_protocol = None
            priv_protocol = None
            
            # Map auth protocols
            if credentials.auth_protocol:
                auth_map = {
                    SNMPAuthProtocol.MD5: usmHMACMD5AuthProtocol,
                    SNMPAuthProtocol.SHA: usmHMACSHAAuthProtocol,
                    SNMPAuthProtocol.SHA224: usmHMAC128SHA224AuthProtocol,
                    SNMPAuthProtocol.SHA256: usmHMAC192SHA256AuthProtocol,
                    SNMPAuthProtocol.SHA384: usmHMAC256SHA384AuthProtocol,
                    SNMPAuthProtocol.SHA512: usmHMAC384SHA512AuthProtocol,
                }
                auth_protocol = auth_map.get(credentials.auth_protocol)
            
            # Map privacy protocols
            if credentials.priv_protocol:
                priv_map = {
                    SNMPPrivProtocol.DES: usmDESPrivProtocol,
                    SNMPPrivProtocol.AES: usmAesCfb128Protocol,
                    SNMPPrivProtocol.AES192: usmAesCfb192Protocol,
                    SNMPPrivProtocol.AES256: usmAesCfb256Protocol,
                    SNMPPrivProtocol.TRIPLE_DES: usm3DESEDEPrivProtocol,
                }
                priv_protocol = priv_map.get(credentials.priv_protocol)
            
            return UsmUserData(
                credentials.username,
                authKey=credentials.auth_password,
                privKey=credentials.priv_password,
                authProtocol=auth_protocol,
                privProtocol=priv_protocol
            )
        
        raise ValueError(f"Unsupported SNMP version: {credentials.version}")
    
    def _create_transport_target(self, device_ip: str, port: int = 161):
        """Create SNMP transport target"""
        return UdpTransportTarget((device_ip, port), timeout=self.timeout, retries=self.retries)
    
    def _convert_snmp_value(self, value) -> Union[int, float, str, None]:
        """Convert SNMP value to Python type"""
        if isinstance(value, (Counter32, Counter64, Gauge32, Integer32)):
            return int(value)
        elif hasattr(value, 'prettyPrint'):
            return value.prettyPrint()
        else:
            return str(value)
    
    async def _snmp_get(self, device_ip: str, credentials: SNMPCredentials, oids: List[str], port: int = 161) -> Dict[str, Any]:
        """Perform SNMP GET operation"""
        try:
            auth_data = self._create_auth_data(credentials)
            transport_target = self._create_transport_target(device_ip, port)
            
            # Convert OIDs to ObjectType objects
            object_types = [ObjectType(ObjectIdentity(oid)) for oid in oids]
            
            # Perform SNMP GET
            iterator = getCmd(
                SnmpEngine(),
                auth_data,
                transport_target,
                ContextData(),
                *object_types
            )
            
            error_indication, error_status, error_index, var_binds = await iterator
            
            if error_indication:
                raise Exception(f"SNMP error indication: {error_indication}")
            
            if error_status:
                raise Exception(f"SNMP error status: {error_status.prettyPrint()} at {error_index}")
            
            # Process results
            results = {}
            for oid, var_bind in zip(oids, var_binds):
                name, value = var_bind
                results[oid] = self._convert_snmp_value(value)
            
            return results
            
        except Exception as e:
            logger.error(f"SNMP GET failed for {device_ip}: {str(e)}")
            raise
    
    async def _snmp_walk(self, device_ip: str, credentials: SNMPCredentials, oid: str, port: int = 161) -> Dict[str, Any]:
        """Perform SNMP WALK operation"""
        try:
            auth_data = self._create_auth_data(credentials)
            transport_target = self._create_transport_target(device_ip, port)
            
            results = {}
            
            # Use a simple SNMP GET for basic OIDs instead of WALK for now
            # This is a workaround for the async iterator issue
            basic_oids = [
                oid + '.1',  # Try with .1 suffix
                oid + '.0',  # Try with .0 suffix
                oid          # Try the base OID
            ]
            
            for test_oid in basic_oids:
                try:
                    get_result = await self._snmp_get(device_ip, credentials, [test_oid], port)
                    if get_result:
                        results.update(get_result)
                        break
                except Exception:
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"SNMP WALK failed for {device_ip}: {str(e)}")
            raise
    
    async def get_system_health(self, device_ip: str, credentials: SNMPCredentials, port: int = 161) -> Dict[str, Any]:
        """Get system health metrics from device"""
        try:
            # Basic system information
            basic_oids = [
                self.OID_SYSTEM_DESCR,
                self.OID_SYSTEM_UPTIME,
                self.OID_SYSTEM_NAME
            ]
            
            basic_info = await self._snmp_get(device_ip, credentials, basic_oids, port)
            
            health_data = {
                'device_ip': device_ip,
                'timestamp': datetime.utcnow(),
                'system_description': basic_info.get(self.OID_SYSTEM_DESCR),
                'system_uptime': basic_info.get(self.OID_SYSTEM_UPTIME),
                'system_name': basic_info.get(self.OID_SYSTEM_NAME)
            }
            
            # Try to get CPU information (try Cisco specific first, then standard)
            cpu_data_found = False
            try:
                # Try Cisco specific CPU OIDs first
                cpu_oids = [self.OID_CPU_1MIN, self.OID_CPU_5MIN, self.OID_CPU_15MIN]
                cpu_info = await self._snmp_get(device_ip, credentials, cpu_oids, port)
                
                cpu_1min = cpu_info.get(self.OID_CPU_1MIN)
                cpu_5min = cpu_info.get(self.OID_CPU_5MIN)
                cpu_15min = cpu_info.get(self.OID_CPU_15MIN)
                
                # Check if we got valid data (not error strings)
                if (cpu_1min and "No Such Object" not in str(cpu_1min) and 
                    cpu_5min and "No Such Object" not in str(cpu_5min) and
                    cpu_15min and "No Such Object" not in str(cpu_15min)):
                    
                    health_data.update({
                        'cpu_load_1min': cpu_1min,
                        'cpu_load_5min': cpu_5min,
                        'cpu_load_15min': cpu_15min,
                        'cpu_usage_1min': cpu_1min,
                        'cpu_usage_5min': cpu_5min,  # Map CPU Usage to 5min value
                        'cpu_usage_15min': cpu_15min,
                        'cpu_usage': cpu_5min  # Primary CPU Usage mapped to 5min value
                    })
                    cpu_data_found = True
            except Exception as e:
                logger.debug(f"Cisco CPU OIDs failed for {device_ip}: {str(e)}")
            
            # If Cisco OIDs failed, try Juniper OIDs
            if not cpu_data_found:
                try:
                    juniper_oids = [self.OID_JUNIPER_CPU_UTIL, self.OID_JUNIPER_CPU_5MIN, self.OID_JUNIPER_CPU_15MIN]
                    juniper_info = await self._snmp_get(device_ip, credentials, juniper_oids, port)
                    
                    cpu_util = juniper_info.get(self.OID_JUNIPER_CPU_UTIL)
                    cpu_5min = juniper_info.get(self.OID_JUNIPER_CPU_5MIN)
                    cpu_15min = juniper_info.get(self.OID_JUNIPER_CPU_15MIN)
                    
                    if (cpu_util and "No Such Object" not in str(cpu_util)):
                        health_data.update({
                            'cpu_load_1min': cpu_util,
                            'cpu_load_5min': cpu_5min or cpu_util,
                            'cpu_load_15min': cpu_15min or cpu_util,
                            'cpu_usage_1min': cpu_util,
                            'cpu_usage_5min': cpu_5min or cpu_util,  # Map CPU Usage to 5min value
                            'cpu_usage_15min': cpu_15min or cpu_util,
                            'cpu_usage': cpu_5min or cpu_util  # Primary CPU Usage mapped to 5min value
                        })
                        cpu_data_found = True
                        logger.debug(f"Juniper CPU data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Juniper CPU OIDs failed for {device_ip}: {str(e)}")
            
            # If Juniper OIDs failed, try standard load average OIDs (Linux/Unix)
            if not cpu_data_found:
                try:
                    load_oids = [self.OID_LOAD_1MIN, self.OID_LOAD_5MIN, self.OID_LOAD_15MIN]
                    load_info = await self._snmp_get(device_ip, credentials, load_oids, port)
                    
                    load_1min = load_info.get(self.OID_LOAD_1MIN)
                    load_5min = load_info.get(self.OID_LOAD_5MIN)
                    load_15min = load_info.get(self.OID_LOAD_15MIN)
                    
                    if (load_1min and "No Such Object" not in str(load_1min)):
                        health_data.update({
                            'cpu_load_1min': load_1min,
                            'cpu_load_5min': load_5min,
                            'cpu_load_15min': load_15min,
                            'cpu_usage_1min': load_1min,
                            'cpu_usage_5min': load_5min,  # Map CPU Usage to 5min value
                            'cpu_usage_15min': load_15min,
                            'cpu_usage': load_5min  # Primary CPU Usage mapped to 5min value
                        })
                        cpu_data_found = True
                        logger.debug(f"Standard load average data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Standard load OIDs failed for {device_ip}: {str(e)}")
            
            # Try Linux/Unix specific CPU OIDs
            if not cpu_data_found:
                try:
                    linux_cpu_oids = [self.OID_LINUX_CPU_USER, self.OID_LINUX_CPU_SYSTEM, self.OID_LINUX_CPU_IDLE]
                    linux_cpu_info = await self._snmp_get(device_ip, credentials, linux_cpu_oids, port)
                    
                    cpu_user = linux_cpu_info.get(self.OID_LINUX_CPU_USER)
                    cpu_system = linux_cpu_info.get(self.OID_LINUX_CPU_SYSTEM)
                    cpu_idle = linux_cpu_info.get(self.OID_LINUX_CPU_IDLE)
                    
                    if cpu_user and cpu_system and cpu_idle:
                        cpu_usage = 100 - float(cpu_idle)
                        health_data.update({
                            'cpu_load_1min': cpu_usage,
                            'cpu_load_5min': cpu_usage,
                            'cpu_load_15min': cpu_usage,
                            'cpu_usage_1min': cpu_usage,
                            'cpu_usage_5min': cpu_usage,  # Map CPU Usage to calculated value
                            'cpu_usage_15min': cpu_usage,
                            'cpu_usage': cpu_usage  # Primary CPU Usage
                        })
                        cpu_data_found = True
                        logger.debug(f"Linux CPU data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Linux CPU OIDs failed for {device_ip}: {str(e)}")
            
            # If still no CPU data, try HOST-RESOURCES-MIB processor load
            if not cpu_data_found:
                try:
                    processor_data = await self._snmp_walk(device_ip, credentials, self.OID_HR_PROCESSOR_LOAD, port)
                    if processor_data:
                        # Get average processor load
                        loads = [int(v) for v in processor_data.values() if isinstance(v, (int, str)) and str(v).isdigit()]
                        if loads:
                            avg_load = sum(loads) / len(loads)
                            health_data.update({
                                'cpu_usage_1min': avg_load,
                                'cpu_usage_5min': avg_load,  # Map CPU Usage to 5min value
                                'cpu_usage_15min': avg_load,
                                'cpu_usage': avg_load  # Primary CPU Usage mapped to average load
                            })
                            cpu_data_found = True
                            logger.debug(f"HOST-RESOURCES processor load found for {device_ip}")
                except Exception as e:
                    logger.debug(f"HOST-RESOURCES processor load failed for {device_ip}: {str(e)}")
            
            if not cpu_data_found:
                logger.warning(f"Could not get CPU info for {device_ip}: No supported CPU OIDs found")
            
            # Try to get memory information (try Cisco specific first, then standard)
            memory_data_found = False
            try:
                # Try Cisco specific memory OIDs first
                memory_used_data = await self._snmp_walk(device_ip, credentials, self.OID_MEMORY_POOL_USED, port)
                memory_free_data = await self._snmp_walk(device_ip, credentials, self.OID_MEMORY_POOL_FREE, port)
                
                if memory_used_data or memory_free_data:
                    # Calculate total memory usage and total
                    total_used = sum(int(v) for v in (memory_used_data or {}).values() if isinstance(v, (int, str)) and str(v).isdigit())
                    total_free = sum(int(v) for v in (memory_free_data or {}).values() if isinstance(v, (int, str)) and str(v).isdigit())
                    total_memory = total_used + total_free
                    
                    if total_memory > 0:
                        health_data.update({
                            'memory_used': total_used,
                            'memory_total': total_memory,
                            'memory_available': total_free,
                            'memory_utilization': (total_used / total_memory * 100)
                        })
                        memory_data_found = True
            except Exception as e:
                logger.debug(f"Cisco memory OIDs failed for {device_ip}: {str(e)}")
            
            # If Cisco OIDs failed, try Juniper memory OIDs
            if not memory_data_found:
                try:
                    juniper_memory_data = await self._snmp_walk(device_ip, credentials, self.OID_JUNIPER_MEMORY_UTIL, port)
                    if juniper_memory_data:
                        # Juniper memory utilization is typically in percentage
                        for index, util in juniper_memory_data.items():
                            if isinstance(util, (int, str)) and str(util).replace('.', '').isdigit():
                                memory_util = float(util)
                                # Estimate total memory (this is a rough estimate)
                                estimated_total = 1024 * 1024 * 1024  # 1GB default
                                estimated_used = int(estimated_total * memory_util / 100)
                                estimated_avail = estimated_total - estimated_used
                                
                                health_data.update({
                                    'memory_total': estimated_total,
                                    'memory_used': estimated_used,
                                    'memory_available': estimated_avail,
                                    'memory_utilization': memory_util
                                })
                                memory_data_found = True
                                logger.debug(f"Juniper memory data found for {device_ip}")
                                break
                except Exception as e:
                    logger.debug(f"Juniper memory OIDs failed for {device_ip}: {str(e)}")
            
            # If Juniper OIDs failed, try Windows memory OIDs
            if not memory_data_found:
                try:
                    win_memory_oids = [self.OID_WIN_MEMORY_TOTAL, self.OID_WIN_MEMORY_AVAIL]
                    win_memory_info = await self._snmp_get(device_ip, credentials, win_memory_oids, port)
                    
                    mem_total = win_memory_info.get(self.OID_WIN_MEMORY_TOTAL)
                    mem_avail = win_memory_info.get(self.OID_WIN_MEMORY_AVAIL)
                    
                    if mem_total and "No Such Object" not in str(mem_total):
                        mem_total = int(mem_total)
                        mem_avail = int(mem_avail or 0)
                        mem_used = mem_total - mem_avail
                        
                        health_data.update({
                            'memory_total': mem_total,
                            'memory_used': mem_used,
                            'memory_available': mem_avail,
                            'memory_utilization': (mem_used / mem_total * 100) if mem_total > 0 else None
                        })
                        memory_data_found = True
                        logger.debug(f"Windows memory data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Windows memory OIDs failed for {device_ip}: {str(e)}")
            
            # If Windows OIDs failed, try standard UCD-SNMP-MIB memory OIDs
            if not memory_data_found:
                try:
                    memory_oids = [self.OID_MEMORY_TOTAL, self.OID_MEMORY_AVAIL, self.OID_MEMORY_FREE]
                    memory_info = await self._snmp_get(device_ip, credentials, memory_oids, port)
                    
                    mem_total = memory_info.get(self.OID_MEMORY_TOTAL)
                    mem_avail = memory_info.get(self.OID_MEMORY_AVAIL)
                    mem_free = memory_info.get(self.OID_MEMORY_FREE)
                    
                    if mem_total and "No Such Object" not in str(mem_total):
                        mem_total = int(mem_total) * 1024  # Convert KB to bytes
                        mem_avail = int(mem_avail or 0) * 1024 if mem_avail else None
                        mem_free = int(mem_free or 0) * 1024 if mem_free else None
                        mem_used = mem_total - (mem_avail or mem_free or 0)
                        
                        health_data.update({
                            'memory_total': mem_total,
                            'memory_used': mem_used,
                            'memory_available': mem_avail or mem_free,
                            'memory_utilization': (mem_used / mem_total * 100) if mem_total > 0 else None
                        })
                        memory_data_found = True
                        logger.debug(f"Standard memory data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Standard memory OIDs failed for {device_ip}: {str(e)}")
            
            # If still no memory data, try HOST-RESOURCES-MIB storage
            if not memory_data_found:
                try:
                    storage_data = await self._snmp_walk(device_ip, credentials, self.OID_HR_STORAGE_DESCR, port)
                    if storage_data:
                        # Look for RAM/Memory storage entries
                        for index, descr in storage_data.items():
                            if any(keyword in str(descr).lower() for keyword in ['ram', 'memory', 'physical memory']):
                                # Get storage details for this index
                                storage_index = index.split('.')[-1]
                                size_oid = f"{self.OID_HR_STORAGE_SIZE}.{storage_index}"
                                used_oid = f"{self.OID_HR_STORAGE_USED}.{storage_index}"
                                units_oid = f"{self.OID_HR_STORAGE_UNITS}.{storage_index}"
                                
                                storage_details = await self._snmp_get(device_ip, credentials, [size_oid, used_oid, units_oid], port)
                                
                                size = storage_details.get(size_oid)
                                used = storage_details.get(used_oid)
                                units = storage_details.get(units_oid, 1)
                                
                                if size and used:
                                    total_bytes = int(size) * int(units)
                                    used_bytes = int(used) * int(units)
                                    avail_bytes = total_bytes - used_bytes
                                    
                                    health_data.update({
                                        'memory_total': total_bytes,
                                        'memory_used': used_bytes,
                                        'memory_available': avail_bytes,
                                        'memory_utilization': (used_bytes / total_bytes * 100) if total_bytes > 0 else None
                                    })
                                    memory_data_found = True
                                    break
                except Exception as e:
                    logger.debug(f"HOST-RESOURCES memory failed for {device_ip}: {str(e)}")
            
            if not memory_data_found:
                logger.warning(f"Could not get memory info for {device_ip}: No supported memory OIDs found")
            
            # Try to get disk/storage information with comprehensive MIB support
            disk_data_found = False
            
            # Try Cisco-specific flash/disk OIDs first
            try:
                cisco_flash_data = await self._snmp_walk(device_ip, credentials, self.OID_CISCO_FLASH_SIZE, port)
                if cisco_flash_data:
                    logger.debug(f"Cisco flash data found for {device_ip}")
                    cisco_flash_used = await self._snmp_walk(device_ip, credentials, self.OID_CISCO_FLASH_USED, port)
                    
                    total_flash_size = sum(int(v) for v in cisco_flash_data.values() if str(v).isdigit())
                    total_flash_used = sum(int(v) for v in (cisco_flash_used or {}).values() if str(v).isdigit())
                    
                    if total_flash_size > 0:
                        total_flash_avail = total_flash_size - total_flash_used
                        health_data.update({
                            'disk_total': total_flash_size,
                            'disk_used': total_flash_used,
                            'disk_available': total_flash_avail,
                            'disk_utilization': (total_flash_used / total_flash_size * 100)
                        })
                        disk_data_found = True
                        logger.debug(f"Cisco flash data found for {device_ip}")
            except Exception as e:
                logger.debug(f"Cisco flash OIDs failed for {device_ip}: {str(e)}")
            
            # Try Juniper storage OIDs
            if not disk_data_found:
                try:
                    juniper_storage_data = await self._snmp_walk(device_ip, credentials, self.OID_JUNIPER_STORAGE_SIZE, port)
                    if juniper_storage_data:
                        logger.debug(f"Juniper storage data found for {device_ip}")
                        juniper_used_data = await self._snmp_walk(device_ip, credentials, self.OID_JUNIPER_STORAGE_USED, port)
                        
                        total_storage_size = sum(int(v) for v in juniper_storage_data.values() if str(v).isdigit())
                        total_storage_used = sum(int(v) for v in (juniper_used_data or {}).values() if str(v).isdigit())
                        
                        if total_storage_size > 0:
                            total_storage_avail = total_storage_size - total_storage_used
                            health_data.update({
                                'disk_total': total_storage_size,
                                'disk_used': total_storage_used,
                                'disk_available': total_storage_avail,
                                'disk_utilization': (total_storage_used / total_storage_size * 100)
                            })
                            disk_data_found = True
                            logger.debug(f"Juniper storage data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Juniper storage OIDs failed for {device_ip}: {str(e)}")
            
            # Try Windows disk OIDs
            if not disk_data_found:
                try:
                    win_disk_oids = [self.OID_WIN_DISK_FREE_BYTES]
                    win_disk_info = await self._snmp_get(device_ip, credentials, win_disk_oids, port)
                    
                    disk_free = win_disk_info.get(self.OID_WIN_DISK_FREE_BYTES)
                    
                    if disk_free and "No Such Object" not in str(disk_free):
                        disk_free = int(disk_free) * 1024 * 1024  # Convert MB to bytes
                        # Estimate total disk size (this is a rough estimate)
                        estimated_total = disk_free * 2  # Assume 50% usage
                        estimated_used = estimated_total - disk_free
                        
                        health_data.update({
                            'disk_total': estimated_total,
                            'disk_used': estimated_used,
                            'disk_available': disk_free,
                            'disk_utilization': (estimated_used / estimated_total * 100) if estimated_total > 0 else None
                        })
                        disk_data_found = True
                        logger.debug(f"Windows disk data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"Windows disk OIDs failed for {device_ip}: {str(e)}")
            
            # Try UCD-SNMP-MIB disk monitoring
            if not disk_data_found:
                try:
                    disk_paths = await self._snmp_walk(device_ip, credentials, self.OID_DISK_PATH, port)
                    if disk_paths:
                        logger.debug(f"Found UCD-SNMP disk paths for {device_ip}: {disk_paths}")
                        total_disk_size = 0
                        total_disk_used = 0
                        
                        for index, path in disk_paths.items():
                            disk_index = index.split('.')[-1]
                            total_oid = f"{self.OID_DISK_TOTAL}.{disk_index}"
                            used_oid = f"{self.OID_DISK_USED}.{disk_index}"
                            
                            disk_details = await self._snmp_get(device_ip, credentials, [total_oid, used_oid], port)
                            
                            total_kb = disk_details.get(total_oid)
                            used_kb = disk_details.get(used_oid)
                            
                            if total_kb and used_kb and str(total_kb).isdigit() and str(used_kb).isdigit():
                                total_bytes = int(total_kb) * 1024  # Convert KB to bytes
                                used_bytes = int(used_kb) * 1024
                                
                                total_disk_size += total_bytes
                                total_disk_used += used_bytes
                        
                        if total_disk_size > 0:
                            total_disk_avail = total_disk_size - total_disk_used
                            health_data.update({
                                'disk_total': total_disk_size,
                                'disk_used': total_disk_used,
                                'disk_available': total_disk_avail,
                                'disk_utilization': (total_disk_used / total_disk_size * 100)
                            })
                            disk_data_found = True
                            logger.debug(f"UCD-SNMP disk data found for {device_ip}: {total_disk_size} bytes total")
                except Exception as e:
                    logger.debug(f"UCD-SNMP disk monitoring failed for {device_ip}: {str(e)}")
            
            # If all vendor-specific OIDs failed, try HOST-RESOURCES-MIB
            if not disk_data_found:
                try:
                    storage_data = await self._snmp_walk(device_ip, credentials, self.OID_HR_STORAGE_DESCR, port)
                    logger.debug(f"HOST-RESOURCES storage descriptions for {device_ip}: {storage_data}")
                    if storage_data:
                        total_disk_size = 0
                        total_disk_used = 0
                        
                        # Look for disk/filesystem storage entries with enhanced filtering
                        for index, descr in storage_data.items():
                            descr_str = str(descr).lower()
                            # Enhanced disk detection keywords
                            disk_keywords = ['/', 'c:', 'd:', 'disk', 'filesystem', 'fixed disk', 'storage', 'hdd', 'ssd', 'nvme', 'scsi', 'ide', 'sata']
                            exclude_keywords = ['memory', 'ram', 'swap', 'virtual', 'removable', 'floppy', 'cdrom', 'dvd', 'network']
                            
                            if any(keyword in descr_str for keyword in disk_keywords) and \
                               not any(exclude in descr_str for exclude in exclude_keywords):
                                
                                # Get storage details for this index
                                storage_index = index.split('.')[-1]
                                size_oid = f"{self.OID_HR_STORAGE_SIZE}.{storage_index}"
                                used_oid = f"{self.OID_HR_STORAGE_USED}.{storage_index}"
                                units_oid = f"{self.OID_HR_STORAGE_UNITS}.{storage_index}"
                                
                                storage_details = await self._snmp_get(device_ip, credentials, [size_oid, used_oid, units_oid], port)
                                
                                size = storage_details.get(size_oid)
                                used = storage_details.get(used_oid)
                                units = storage_details.get(units_oid, 1)
                                
                                if size and used and str(size).isdigit() and str(used).isdigit():
                                    disk_size_bytes = int(size) * int(units)
                                    disk_used_bytes = int(used) * int(units)
                                    
                                    # Only count significant storage (> 100MB) and realistic sizes
                                    if 100 * 1024 * 1024 < disk_size_bytes < 100 * 1024 * 1024 * 1024 * 1024:  # 100MB to 100TB
                                        total_disk_size += disk_size_bytes
                                        total_disk_used += disk_used_bytes
                        
                        if total_disk_size > 0:
                            total_disk_avail = total_disk_size - total_disk_used
                            health_data.update({
                                'disk_total': total_disk_size,
                                'disk_used': total_disk_used,
                                'disk_available': total_disk_avail,
                                'disk_utilization': (total_disk_used / total_disk_size * 100)
                            })
                            disk_data_found = True
                            logger.debug(f"HOST-RESOURCES disk data found for {device_ip}")
                except Exception as e:
                    logger.debug(f"HOST-RESOURCES disk monitoring failed for {device_ip}: {str(e)}")
            
            if not disk_data_found:
                logger.warning(f"Could not get disk info for {device_ip}: No supported storage OIDs found - device may not expose disk data via SNMP")
                # Set default values with status information
                health_data.update({
                    'disk_total': 0,
                    'disk_used': 0,
                    'disk_available': 0,
                    'disk_utilization': 0,
                    'disk_status': 'SNMP disk monitoring not configured',
                    'disk_error': 'Device does not expose disk data via SNMP. For Linux servers, add "disk /" to /etc/snmp/snmpd.conf and restart snmpd service.'
                })
            
            return health_data
            
        except Exception as e:
            logger.error(f"Failed to get system health for {device_ip}: {str(e)}")
            raise
    
    async def get_interface_status(self, device_ip: str, credentials: SNMPCredentials, port: int = 161) -> List[Dict[str, Any]]:
        """Get interface status and statistics from device"""
        try:
            # Get interface indexes first
            interface_indexes = await self._snmp_walk(device_ip, credentials, self.OID_IF_INDEX, port)
            
            if not interface_indexes:
                return []
            
            interfaces = []
            
            # Get interface information for each interface
            for oid, index in interface_indexes.items():
                try:
                    # Extract interface index from OID
                    if_index = oid.split('.')[-1]
                    
                    # Get interface details
                    interface_oids = [
                        f"{self.OID_IF_DESCR}.{if_index}",
                        f"{self.OID_IF_TYPE}.{if_index}",
                        f"{self.OID_IF_SPEED}.{if_index}",
                        f"{self.OID_IF_ADMIN_STATUS}.{if_index}",
                        f"{self.OID_IF_OPER_STATUS}.{if_index}",
                        f"{self.OID_IF_IN_OCTETS}.{if_index}",
                        f"{self.OID_IF_OUT_OCTETS}.{if_index}",
                        f"{self.OID_IF_IN_UCAST_PKTS}.{if_index}",
                        f"{self.OID_IF_OUT_UCAST_PKTS}.{if_index}",
                        f"{self.OID_IF_IN_ERRORS}.{if_index}",
                        f"{self.OID_IF_OUT_ERRORS}.{if_index}",
                        f"{self.OID_IF_IN_DISCARDS}.{if_index}",
                        f"{self.OID_IF_OUT_DISCARDS}.{if_index}"
                    ]
                    
                    interface_data = await self._snmp_get(device_ip, credentials, interface_oids, port)
                    
                    # Map status values
                    admin_status_map = {1: 'up', 2: 'down', 3: 'testing'}
                    oper_status_map = {
                        1: 'up', 2: 'down', 3: 'testing', 4: 'unknown',
                        5: 'dormant', 6: 'notPresent', 7: 'lowerLayerDown'
                    }
                    
                    interface_info = {
                        'device_ip': device_ip,
                        'interface_index': int(if_index),
                        'interface_name': interface_data.get(f"{self.OID_IF_DESCR}.{if_index}", f"Interface {if_index}"),
                        'interface_description': interface_data.get(f"{self.OID_IF_DESCR}.{if_index}"),
                        'interface_type': interface_data.get(f"{self.OID_IF_TYPE}.{if_index}"),
                        'interface_speed': interface_data.get(f"{self.OID_IF_SPEED}.{if_index}"),
                        'admin_status': admin_status_map.get(interface_data.get(f"{self.OID_IF_ADMIN_STATUS}.{if_index}"), 'unknown'),
                        'oper_status': oper_status_map.get(interface_data.get(f"{self.OID_IF_OPER_STATUS}.{if_index}"), 'unknown'),
                        'bytes_in': interface_data.get(f"{self.OID_IF_IN_OCTETS}.{if_index}"),
                        'bytes_out': interface_data.get(f"{self.OID_IF_OUT_OCTETS}.{if_index}"),
                        'packets_in': interface_data.get(f"{self.OID_IF_IN_UCAST_PKTS}.{if_index}"),
                        'packets_out': interface_data.get(f"{self.OID_IF_OUT_UCAST_PKTS}.{if_index}"),
                        'errors_in': interface_data.get(f"{self.OID_IF_IN_ERRORS}.{if_index}"),
                        'errors_out': interface_data.get(f"{self.OID_IF_OUT_ERRORS}.{if_index}"),
                        'discards_in': interface_data.get(f"{self.OID_IF_IN_DISCARDS}.{if_index}"),
                        'discards_out': interface_data.get(f"{self.OID_IF_OUT_DISCARDS}.{if_index}"),
                        'timestamp': datetime.utcnow()
                    }
                    
                    # Calculate utilization if speed is available
                    speed = interface_info.get('interface_speed')
                    if speed and speed > 0:
                        bytes_in = interface_info.get('bytes_in', 0)
                        bytes_out = interface_info.get('bytes_out', 0)
                        
                        # Note: This is instantaneous utilization, not rate-based
                        # For proper utilization, you'd need to calculate delta over time
                        interface_info['utilization_in'] = min((bytes_in * 8 / speed) * 100, 100)
                        interface_info['utilization_out'] = min((bytes_out * 8 / speed) * 100, 100)
                    
                    interfaces.append(interface_info)
                    
                except Exception as e:
                    logger.warning(f"Failed to get data for interface {if_index} on {device_ip}: {str(e)}")
                    continue
            
            return interfaces
            
        except Exception as e:
            logger.error(f"Failed to get interface status for {device_ip}: {str(e)}")
            raise
    
    async def test_connectivity(self, device_ip: str, credentials: SNMPCredentials, port: int = 161) -> bool:
        """Test SNMP connectivity to device"""
        try:
            result = await self._snmp_get(device_ip, credentials, [self.OID_SYSTEM_DESCR], port)
            return bool(result.get(self.OID_SYSTEM_DESCR))
        except Exception as e:
            logger.error(f"SNMP connectivity test failed for {device_ip}: {str(e)}")
            return False