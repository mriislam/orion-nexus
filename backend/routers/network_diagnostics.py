from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
import subprocess
import platform
import asyncio
import json
import re
import socket
from datetime import datetime

# Import DNS library
try:
    import dns.resolver
    import dns.reversename
except ImportError:
    dns = None

# Import ping library
try:
    from pythonping import ping as python_ping
except ImportError:
    python_ping = None

router = APIRouter(prefix="/network-diagnostics", tags=["network-diagnostics"])

# Request/Response Models
class PingRequest(BaseModel):
    target: str
    count: int = 4
    timeout: int = 5
    packet_size: int = 32
    
    @validator('target')
    def validate_target(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Target cannot be empty')
        return v.strip()
    
    @validator('count')
    def validate_count(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Count must be between 1 and 100')
        return v

class PingResult(BaseModel):
    target: str
    packets_sent: int
    packets_received: int
    packet_loss_percent: float
    min_rtt: Optional[float]
    max_rtt: Optional[float]
    avg_rtt: Optional[float]
    results: List[Dict[str, Any]]
    timestamp: datetime
    error: Optional[str] = None

class TracerouteRequest(BaseModel):
    target: str
    max_hops: int = 30
    timeout: int = 5
    
    @validator('target')
    def validate_target(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Target cannot be empty')
        return v.strip()
    
    @validator('max_hops')
    def validate_max_hops(cls, v):
        if v < 1 or v > 64:
            raise ValueError('Max hops must be between 1 and 64')
        return v

class TracerouteHop(BaseModel):
    hop_number: int
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    rtt1: Optional[float] = None
    rtt2: Optional[float] = None
    rtt3: Optional[float] = None
    timeout: bool = False

class TracerouteResult(BaseModel):
    target: str
    hops: List[TracerouteHop]
    total_hops: int
    success: bool
    timestamp: datetime
    error: Optional[str] = None

class DNSRequest(BaseModel):
    domain: str
    record_type: str = "ALL"
    nameserver: Optional[str] = None
    
    @validator('domain')
    def validate_domain(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Domain cannot be empty')
        return v.strip()
    
    @validator('record_type')
    def validate_record_type(cls, v):
        valid_types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'ALL']
        if v.upper() not in valid_types:
            raise ValueError(f'Record type must be one of: {", ".join(valid_types)}')
        return v.upper()

class DNSRecord(BaseModel):
    name: str
    type: str
    value: str
    ttl: Optional[int]
    priority: Optional[int] = None  # For MX records

class DNSResult(BaseModel):
    domain: str
    record_type: str
    records: List[DNSRecord]
    nameserver_used: Optional[str]
    query_time: float
    timestamp: datetime
    total_records: int
    record_types_found: List[str]
    error: Optional[str] = None

# Utility Functions
def is_valid_ip(ip: str) -> bool:
    """Check if string is a valid IP address"""
    try:
        socket.inet_aton(ip)
        return True
    except socket.error:
        return False

def is_valid_hostname(hostname: str) -> bool:
    """Check if string is a valid hostname"""
    if len(hostname) > 255:
        return False
    if hostname[-1] == ".":
        hostname = hostname[:-1]
    allowed = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$")
    return all(allowed.match(x) for x in hostname.split("."))

# PING Implementation
@router.post("/ping", response_model=PingResult)
async def ping_host(request: PingRequest):
    """Perform PING operation to a target host"""
    try:
        # Validate target
        if not (is_valid_ip(request.target) or is_valid_hostname(request.target)):
            raise HTTPException(status_code=400, detail="Invalid target hostname or IP address")
        
        # Try pythonping first (more reliable)
        if python_ping:
            try:
                result = await _ping_with_pythonping(request)
                return result
            except Exception as e:
                # Fall back to system ping if pythonping fails
                pass
        
        # Fall back to system ping command
        result = await _ping_with_system_command(request)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ping operation failed: {str(e)}")

async def _ping_with_pythonping(request: PingRequest) -> PingResult:
    """Perform ping using pythonping library"""
    try:
        # Perform ping
        ping_result = python_ping(
            request.target,
            count=request.count,
            timeout=request.timeout,
            size=request.packet_size
        )
        
        # Parse results
        results = []
        rtts = []
        packets_received = 0
        
        for response in ping_result:
            if response.success:
                rtt = response.time_elapsed_ms
                rtts.append(rtt)
                packets_received += 1
                results.append({
                    "sequence": len(results) + 1,
                    "rtt": rtt,
                    "success": True,
                    "error": None
                })
            else:
                results.append({
                    "sequence": len(results) + 1,
                    "rtt": None,
                    "success": False,
                    "error": str(response.error_message) if hasattr(response, 'error_message') else "Timeout"
                })
        
        # Calculate statistics
        packet_loss = ((request.count - packets_received) / request.count) * 100
        
        return PingResult(
            target=request.target,
            packets_sent=request.count,
            packets_received=packets_received,
            packet_loss_percent=round(packet_loss, 2),
            min_rtt=min(rtts) if rtts else None,
            max_rtt=max(rtts) if rtts else None,
            avg_rtt=round(sum(rtts) / len(rtts), 2) if rtts else None,
            results=results,
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise Exception(f"pythonping failed: {str(e)}")

async def _ping_with_system_command(request: PingRequest) -> PingResult:
    """Perform ping using system ping command"""
    try:
        # Determine OS and build command
        system = platform.system().lower()
        
        if system == "windows":
            cmd = [
                "ping",
                "-n", str(request.count),
                "-w", str(request.timeout * 1000),  # Windows uses milliseconds
                "-l", str(request.packet_size),
                request.target
            ]
        else:  # Linux/macOS
            cmd = [
                "ping",
                "-c", str(request.count),
                "-W", str(request.timeout),
                "-s", str(request.packet_size),
                request.target
            ]
        
        # Execute command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0 and not stdout:
            raise Exception(f"Ping command failed: {stderr.decode()}")
        
        # Parse output
        output = stdout.decode()
        return _parse_ping_output(output, request.target, request.count)
        
    except Exception as e:
        raise Exception(f"System ping failed: {str(e)}")

def _parse_ping_output(output: str, target: str, count: int) -> PingResult:
    """Parse ping command output"""
    lines = output.split('\n')
    results = []
    rtts = []
    packets_received = 0
    packets_sent = count
    packet_loss_percent = 0.0
    
    # Parse individual ping results
    for line in lines:
        # Handle Linux/Windows format: time=X.Xms
        if "time=" in line or "time<" in line:
            rtt_match = re.search(r'time[<=](\d+(?:\.\d+)?)\s*ms', line)
            if rtt_match:
                rtt = float(rtt_match.group(1))
                rtts.append(rtt)
                packets_received += 1
                results.append({
                    "sequence": len(results) + 1,
                    "rtt": rtt,
                    "success": True,
                    "error": None
                })
        # Handle macOS format: 64 bytes from 8.8.8.8: icmp_seq=0 ttl=117 time=28.678 ms
        elif "bytes from" in line and "time=" in line:
            rtt_match = re.search(r'time=(\d+(?:\.\d+)?)\s*ms', line)
            if rtt_match:
                rtt = float(rtt_match.group(1))
                rtts.append(rtt)
                packets_received += 1
                results.append({
                    "sequence": len(results) + 1,
                    "rtt": rtt,
                    "success": True,
                    "error": None
                })
        # Handle timeout cases
        elif "timeout" in line.lower() or "request timeout" in line.lower():
            results.append({
                "sequence": len(results) + 1,
                "rtt": None,
                "success": False,
                "error": "Timeout"
            })
        # Parse statistics line for packet loss (works for both Linux and macOS)
        elif "packets transmitted" in line and "received" in line:
            stats_match = re.search(r'(\d+)\s+packets transmitted,\s+(\d+)\s+(?:packets\s+)?received.*?(\d+(?:\.\d+)?)%\s+packet loss', line)
            if stats_match:
                packets_sent = int(stats_match.group(1))
                packets_received = int(stats_match.group(2))
                packet_loss_percent = float(stats_match.group(3))
        # Parse round-trip stats for macOS
        elif "round-trip min/avg/max" in line:
            rtt_stats_match = re.search(r'round-trip min/avg/max/stddev = ([\d.]+)/([\d.]+)/([\d.]+)', line)
            if rtt_stats_match and not rtts:  # Only use if we don't have individual RTTs
                min_rtt = float(rtt_stats_match.group(1))
                avg_rtt = float(rtt_stats_match.group(2))
                max_rtt = float(rtt_stats_match.group(3))
                # If we have stats but no individual results, create summary
                if packets_received > 0 and not results:
                    for i in range(packets_received):
                        results.append({
                            "sequence": i + 1,
                            "rtt": avg_rtt,  # Use average as approximation
                            "success": True,
                            "error": None
                        })
                    rtts = [avg_rtt] * packets_received
    
    # If we couldn't parse packet loss from stats, calculate it
    if packet_loss_percent == 0.0 and packets_sent > 0:
        packet_loss_percent = ((packets_sent - packets_received) / packets_sent) * 100
    
    return PingResult(
        target=target,
        packets_sent=packets_sent,
        packets_received=packets_received,
        packet_loss_percent=round(packet_loss_percent, 2),
        min_rtt=min(rtts) if rtts else None,
        max_rtt=max(rtts) if rtts else None,
        avg_rtt=round(sum(rtts) / len(rtts), 2) if rtts else None,
        results=results,
        timestamp=datetime.utcnow()
    )

# TRACEROUTE Implementation
@router.post("/traceroute", response_model=TracerouteResult)
async def traceroute_host(request: TracerouteRequest):
    """Perform TRACEROUTE operation to a target host"""
    try:
        # Validate target
        if not (is_valid_ip(request.target) or is_valid_hostname(request.target)):
            raise HTTPException(status_code=400, detail="Invalid target hostname or IP address")
        
        # Determine OS and build command
        system = platform.system().lower()
        
        if system == "windows":
            cmd = [
                "tracert",
                "-h", str(request.max_hops),
                "-w", str(request.timeout * 1000),  # Windows uses milliseconds
                request.target
            ]
        else:  # Linux/macOS
            cmd = [
                "traceroute",
                "-m", str(request.max_hops),
                "-w", str(request.timeout),
                request.target
            ]
        
        # Execute command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0 and not stdout:
            raise HTTPException(status_code=500, detail=f"Traceroute command failed: {stderr.decode()}")
        
        # Parse output
        output = stdout.decode()
        hops = _parse_traceroute_output(output, system)
        
        # Determine success - traceroute is successful if we have hops and no error
        success = len(hops) > 0 and process.returncode == 0
        
        return TracerouteResult(
            target=request.target,
            hops=hops,
            total_hops=len(hops),
            success=success,
            timestamp=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Traceroute failed: {str(e)}")

def _parse_traceroute_output(output: str, system: str) -> List[TracerouteHop]:
    """Parse traceroute command output"""
    lines = output.split('\n')
    hops = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Skip header lines
        if "traceroute" in line.lower() or "tracing route" in line.lower():
            continue
            
        # Parse hop line
        if system == "windows":
            # Windows tracert format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
            match = re.match(r'\s*(\d+)\s+(.+)', line)
            if match:
                hop_num = int(match.group(1))
                hop_data = match.group(2).strip()
                
                hop = TracerouteHop(hop_number=hop_num)
                
                if "*" in hop_data or "Request timed out" in hop_data:
                    hop.timeout = True
                else:
                    # Extract RTTs and IP/hostname
                    parts = hop_data.split()
                    rtts = []
                    ip_hostname = None
                    
                    for part in parts:
                        if "ms" in part:
                            rtt_match = re.search(r'(\d+(?:\.\d+)?)\s*ms', part)
                            if rtt_match:
                                rtts.append(float(rtt_match.group(1)))
                        elif is_valid_ip(part) or (not part.replace('.', '').replace('-', '').isdigit()):
                            ip_hostname = part
                    
                    if len(rtts) >= 1:
                        hop.rtt1 = rtts[0]
                    if len(rtts) >= 2:
                        hop.rtt2 = rtts[1]
                    if len(rtts) >= 3:
                        hop.rtt3 = rtts[2]
                    
                    if ip_hostname:
                        if is_valid_ip(ip_hostname):
                            hop.ip_address = ip_hostname
                        else:
                            hop.hostname = ip_hostname
                
                hops.append(hop)
        else:
            # Unix traceroute format: " 1  gateway (192.168.1.1)  0.123 ms  0.456 ms  0.789 ms"
            match = re.match(r'\s*(\d+)\s+(.+)', line)
            if match:
                hop_num = int(match.group(1))
                hop_data = match.group(2).strip()
                
                hop = TracerouteHop(hop_number=hop_num)
                
                if "*" in hop_data:
                    hop.timeout = True
                else:
                    # Extract hostname/IP
                    hostname_match = re.search(r'^([^\s(]+)(?:\s+\(([^)]+)\))?', hop_data)
                    if hostname_match:
                        hostname = hostname_match.group(1)
                        ip_in_parens = hostname_match.group(2)
                        
                        if is_valid_ip(hostname):
                            hop.ip_address = hostname
                        else:
                            hop.hostname = hostname
                            if ip_in_parens and is_valid_ip(ip_in_parens):
                                hop.ip_address = ip_in_parens
                    
                    # Extract RTTs
                    rtt_matches = re.findall(r'(\d+(?:\.\d+)?)\s*ms', hop_data)
                    if len(rtt_matches) >= 1:
                        hop.rtt1 = float(rtt_matches[0])
                    if len(rtt_matches) >= 2:
                        hop.rtt2 = float(rtt_matches[1])
                    if len(rtt_matches) >= 3:
                        hop.rtt3 = float(rtt_matches[2])
                
                hops.append(hop)
    
    return hops

# DNS Lookup Implementation
@router.post("/dns-lookup", response_model=DNSResult)
async def dns_lookup(request: DNSRequest):
    """Perform DNS lookup for a domain"""
    if not dns:
        raise HTTPException(status_code=500, detail="DNS functionality not available. Install dnspython.")
    
    try:
        # Validate domain
        if not is_valid_hostname(request.domain):
            raise HTTPException(status_code=400, detail="Invalid domain name")
        
        start_time = datetime.utcnow()
        
        # Configure resolver
        resolver = dns.resolver.Resolver()
        if request.nameserver:
            resolver.nameservers = [request.nameserver]
        
        # Define record types to query
        if request.record_type == "ALL":
            record_types_to_query = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA']
        else:
            record_types_to_query = [request.record_type]
        
        all_records = []
        record_types_found = []
        domain_exists = False
        
        # Query each record type
        for record_type in record_types_to_query:
            try:
                answers = resolver.resolve(request.domain, record_type)
                domain_exists = True
                record_types_found.append(record_type)
                
                # Parse records for this type
                for answer in answers:
                    record = DNSRecord(
                        name=str(answers.name),
                        type=record_type,
                        value=str(answer),
                        ttl=answers.ttl
                    )
                    
                    # Add priority for MX records
                    if record_type == "MX" and hasattr(answer, 'preference'):
                        record.priority = answer.preference
                    
                    all_records.append(record)
                    
            except dns.resolver.NXDOMAIN:
                # Domain doesn't exist at all
                if not domain_exists:
                    end_time = datetime.utcnow()
                    query_time = (end_time - start_time).total_seconds() * 1000
                    return DNSResult(
                        domain=request.domain,
                        record_type=request.record_type,
                        records=[],
                        nameserver_used=str(resolver.nameservers[0]) if resolver.nameservers else None,
                        query_time=round(query_time, 2),
                        timestamp=datetime.utcnow(),
                        total_records=0,
                        record_types_found=[],
                        error="Domain not found (NXDOMAIN)"
                    )
            except dns.resolver.NoAnswer:
                # No records of this type, but domain exists
                continue
            except dns.resolver.Timeout:
                # Skip this record type on timeout
                continue
        
        end_time = datetime.utcnow()
        query_time = (end_time - start_time).total_seconds() * 1000  # Convert to ms
        
        # Return results
        return DNSResult(
            domain=request.domain,
            record_type=request.record_type,
            records=all_records,
            nameserver_used=str(resolver.nameservers[0]) if resolver.nameservers else None,
            query_time=round(query_time, 2),
            timestamp=datetime.utcnow(),
            total_records=len(all_records),
            record_types_found=record_types_found,
            error=None if all_records else f"No DNS records found for {request.domain}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DNS lookup failed: {str(e)}")

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for network diagnostics service"""
    status = {
        "service": "network-diagnostics",
        "status": "healthy",
        "features": {
            "ping": True,
            "traceroute": True,
            "dns_lookup": dns is not None,
            "pythonping": python_ping is not None
        },
        "timestamp": datetime.utcnow()
    }
    return status