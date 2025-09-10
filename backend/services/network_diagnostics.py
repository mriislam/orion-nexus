import asyncio
import subprocess
import time
import socket
import aiohttp
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import logging
import re
import platform

logger = logging.getLogger(__name__)


class NetworkDiagnostics:
    """Network diagnostics service for ping, HTTP checks, and traceroute"""
    
    def __init__(self):
        self.system = platform.system().lower()
    
    async def ping_host(self, target: str, timeout: int = 5, count: int = 4) -> Dict[str, Any]:
        """Perform ping test to a host"""
        try:
            # Determine ping command based on OS
            if self.system == "windows":
                cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), target]
            else:
                cmd = ["ping", "-c", str(count), "-W", str(timeout), target]
            
            start_time = time.time()
            
            # Execute ping command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            if process.returncode == 0:
                # Parse ping output
                output = stdout.decode('utf-8')
                ping_stats = self._parse_ping_output(output)
                
                return {
                    'is_up': True,
                    'response_time': ping_stats.get('avg_time', response_time),
                    'packet_loss': ping_stats.get('packet_loss', 0),
                    'packets_sent': ping_stats.get('packets_sent', count),
                    'packets_received': ping_stats.get('packets_received', count),
                    'min_time': ping_stats.get('min_time'),
                    'max_time': ping_stats.get('max_time'),
                    'avg_time': ping_stats.get('avg_time')
                }
            else:
                error_output = stderr.decode('utf-8') if stderr else "Ping failed"
                return {
                    'is_up': False,
                    'response_time': None,
                    'packet_loss': 100,
                    'error_message': error_output.strip()
                }
                
        except Exception as e:
            logger.error(f"Ping failed for {target}: {str(e)}")
            return {
                'is_up': False,
                'response_time': None,
                'packet_loss': 100,
                'error_message': str(e)
            }
    
    def _parse_ping_output(self, output: str) -> Dict[str, Any]:
        """Parse ping command output to extract statistics"""
        stats = {}
        
        try:
            # Parse packet loss
            if self.system == "windows":
                # Windows ping output parsing
                loss_match = re.search(r'\((\d+)% loss\)', output)
                if loss_match:
                    stats['packet_loss'] = int(loss_match.group(1))
                
                # Parse timing statistics
                time_match = re.search(r'Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms', output)
                if time_match:
                    stats['min_time'] = float(time_match.group(1))
                    stats['max_time'] = float(time_match.group(2))
                    stats['avg_time'] = float(time_match.group(3))
            else:
                # Unix/Linux/macOS ping output parsing
                loss_match = re.search(r'(\d+)% packet loss', output)
                if loss_match:
                    stats['packet_loss'] = int(loss_match.group(1))
                
                # Parse packet counts
                packet_match = re.search(r'(\d+) packets transmitted, (\d+) (?:packets )?received', output)
                if packet_match:
                    stats['packets_sent'] = int(packet_match.group(1))
                    stats['packets_received'] = int(packet_match.group(2))
                
                # Parse timing statistics
                time_match = re.search(r'min/avg/max/stddev = ([\d.]+)/([\d.]+)/([\d.]+)/[\d.]+', output)
                if time_match:
                    stats['min_time'] = float(time_match.group(1))
                    stats['avg_time'] = float(time_match.group(2))
                    stats['max_time'] = float(time_match.group(3))
        
        except Exception as e:
            logger.warning(f"Failed to parse ping output: {str(e)}")
        
        return stats
    
    async def http_check(self, url: str, timeout: int = 10, expected_status: int = 200) -> Dict[str, Any]:
        """Perform HTTP/HTTPS check"""
        try:
            # Ensure URL has protocol
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'
            
            start_time = time.time()
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.get(url, allow_redirects=True) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    # Read response content to get size
                    content = await response.read()
                    
                    # Count redirects
                    redirect_count = len(response.history)
                    
                    # Get final URL after redirects
                    final_url = str(response.url)
                    
                    # Extract server and content-type headers
                    server = response.headers.get('Server')
                    content_type = response.headers.get('Content-Type')
                    
                    is_up = response.status == expected_status
                    
                    return {
                        'is_up': is_up,
                        'response_time': response_time,
                        'status_code': response.status,
                        'response_size': len(content),
                        'redirect_count': redirect_count,
                        'final_url': final_url,
                        'server': server,
                        'content_type': content_type,
                        'error_message': None if is_up else f"Expected status {expected_status}, got {response.status}"
                    }
                    
        except asyncio.TimeoutError:
            return {
                'is_up': False,
                'response_time': None,
                'error_message': f"Request timeout after {timeout} seconds"
            }
        except aiohttp.ClientError as e:
            return {
                'is_up': False,
                'response_time': None,
                'error_message': f"HTTP client error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"HTTP check failed for {url}: {str(e)}")
            return {
                'is_up': False,
                'response_time': None,
                'error_message': str(e)
            }
    
    async def port_check(self, host: str, port: int, timeout: int = 5) -> Dict[str, Any]:
        """Perform TCP port connectivity check"""
        try:
            start_time = time.time()
            
            # Create connection
            future = asyncio.open_connection(host, port)
            reader, writer = await asyncio.wait_for(future, timeout=timeout)
            
            response_time = (time.time() - start_time) * 1000
            
            # Close connection
            writer.close()
            await writer.wait_closed()
            
            return {
                'is_up': True,
                'response_time': response_time,
                'error_message': None
            }
            
        except asyncio.TimeoutError:
            return {
                'is_up': False,
                'response_time': None,
                'error_message': f"Connection timeout after {timeout} seconds"
            }
        except ConnectionRefusedError:
            return {
                'is_up': False,
                'response_time': None,
                'error_message': f"Connection refused to {host}:{port}"
            }
        except socket.gaierror as e:
            return {
                'is_up': False,
                'response_time': None,
                'error_message': f"DNS resolution failed for {host}: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Port check failed for {host}:{port}: {str(e)}")
            return {
                'is_up': False,
                'response_time': None,
                'error_message': str(e)
            }
    
    async def traceroute(self, target: str, max_hops: int = 30) -> Dict[str, Any]:
        """Perform traceroute to target"""
        try:
            # Determine traceroute command based on OS
            if self.system == "windows":
                cmd = ["tracert", "-h", str(max_hops), target]
            else:
                cmd = ["traceroute", "-m", str(max_hops), target]
            
            # Execute traceroute command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0 or stdout:
                # Parse traceroute output
                output = stdout.decode('utf-8')
                hops = self._parse_traceroute_output(output)
                
                # Determine if traceroute completed successfully
                completed = any(hop.get('ip_address') == target or hop.get('hostname') == target for hop in hops)
                
                return {
                    'target': target,
                    'destination_ip': self._extract_destination_ip(output),
                    'hops': hops,
                    'total_hops': len(hops),
                    'completed': completed,
                    'error_message': None
                }
            else:
                error_output = stderr.decode('utf-8') if stderr else "Traceroute failed"
                return {
                    'target': target,
                    'destination_ip': None,
                    'hops': [],
                    'total_hops': 0,
                    'completed': False,
                    'error_message': error_output.strip()
                }
                
        except Exception as e:
            logger.error(f"Traceroute failed for {target}: {str(e)}")
            return {
                'target': target,
                'destination_ip': None,
                'hops': [],
                'total_hops': 0,
                'completed': False,
                'error_message': str(e)
            }
    
    def _parse_traceroute_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse traceroute output to extract hop information"""
        hops = []
        
        try:
            lines = output.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Skip header lines
                if 'traceroute' in line.lower() or 'tracing route' in line.lower():
                    continue
                
                hop_info = self._parse_traceroute_line(line)
                if hop_info:
                    hops.append(hop_info)
        
        except Exception as e:
            logger.warning(f"Failed to parse traceroute output: {str(e)}")
        
        return hops
    
    def _parse_traceroute_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse a single line of traceroute output"""
        try:
            if self.system == "windows":
                # Windows tracert format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
                match = re.match(r'\s*(\d+)\s+(.+)', line)
                if match:
                    hop_num = int(match.group(1))
                    rest = match.group(2).strip()
                    
                    # Extract IP address
                    ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', rest)
                    ip_address = ip_match.group(1) if ip_match else None
                    
                    # Extract response times
                    time_matches = re.findall(r'(\d+)\s*ms', rest)
                    response_times = [float(t) for t in time_matches]
                    
                    # Check for timeouts
                    timeout = '*' in rest or 'Request timed out' in rest
                    
                    return {
                        'hop_number': hop_num,
                        'ip_address': ip_address,
                        'hostname': None,  # Windows tracert doesn't always show hostnames
                        'response_times': response_times,
                        'timeout': timeout
                    }
            else:
                # Unix/Linux/macOS traceroute format: " 1  gateway (192.168.1.1)  0.123 ms  0.456 ms  0.789 ms"
                match = re.match(r'\s*(\d+)\s+(.+)', line)
                if match:
                    hop_num = int(match.group(1))
                    rest = match.group(2).strip()
                    
                    # Extract hostname and IP
                    hostname = None
                    ip_address = None
                    
                    # Look for hostname (IP) format
                    host_ip_match = re.search(r'([^\s]+)\s+\(([^)]+)\)', rest)
                    if host_ip_match:
                        hostname = host_ip_match.group(1)
                        ip_address = host_ip_match.group(2)
                    else:
                        # Look for just IP address
                        ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', rest)
                        if ip_match:
                            ip_address = ip_match.group(1)
                    
                    # Extract response times
                    time_matches = re.findall(r'([\d.]+)\s*ms', rest)
                    response_times = [float(t) for t in time_matches]
                    
                    # Check for timeouts
                    timeout = '*' in rest or len(response_times) == 0
                    
                    return {
                        'hop_number': hop_num,
                        'ip_address': ip_address,
                        'hostname': hostname,
                        'response_times': response_times,
                        'timeout': timeout
                    }
        
        except Exception as e:
            logger.warning(f"Failed to parse traceroute line '{line}': {str(e)}")
        
        return None
    
    def _extract_destination_ip(self, output: str) -> Optional[str]:
        """Extract destination IP address from traceroute output"""
        try:
            # Look for IP address in parentheses in the first few lines
            lines = output.split('\n')[:5]
            for line in lines:
                ip_match = re.search(r'\(([\d.]+)\)', line)
                if ip_match:
                    return ip_match.group(1)
        except Exception:
            pass
        
        return None
    
    async def dns_lookup(self, domain: str, record_type: str = "A", timeout: int = 5) -> Dict[str, Any]:
        """Perform DNS lookup for a domain"""
        try:
            start_time = time.time()
            
            # Use socket.getaddrinfo for basic A record lookup
            if record_type.upper() == "A":
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: socket.getaddrinfo(domain, None, socket.AF_INET)
                )
                
                response_time = (time.time() - start_time) * 1000
                
                # Extract IP addresses
                ip_addresses = list(set([addr[4][0] for addr in result]))
                
                return {
                    'target': domain,
                    'query_type': record_type,
                    'is_successful': True,
                    'response_time': response_time,
                    'a_records': ip_addresses,
                    'error_message': None
                }
            else:
                # For other record types, you'd need to use a DNS library like dnspython
                return {
                    'target': domain,
                    'query_type': record_type,
                    'is_successful': False,
                    'error_message': f"Record type {record_type} not supported in basic implementation"
                }
                
        except socket.gaierror as e:
            return {
                'target': domain,
                'query_type': record_type,
                'is_successful': False,
                'response_time': None,
                'error_message': f"DNS lookup failed: {str(e)}"
            }
        except Exception as e:
            logger.error(f"DNS lookup failed for {domain}: {str(e)}")
            return {
                'target': domain,
                'query_type': record_type,
                'is_successful': False,
                'response_time': None,
                'error_message': str(e)
            }