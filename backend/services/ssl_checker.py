import ssl
import socket
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging
from cryptography import x509
from cryptography.hazmat.backends import default_backend
import ipaddress

logger = logging.getLogger(__name__)


class SSLChecker:
    """SSL certificate checker service"""
    
    def __init__(self, default_timeout: int = 10):
        self.default_timeout = default_timeout
    
    async def check_certificate(self, domain: str, port: int = 443, timeout: Optional[int] = None) -> Dict[str, Any]:
        """Check SSL certificate for a domain"""
        timeout = timeout or self.default_timeout
        
        try:
            # Validate input
            if not domain or not isinstance(port, int) or port <= 0 or port > 65535:
                raise ValueError("Invalid domain or port")
            
            # Get certificate
            cert_info = await self._get_certificate_info(domain, port, timeout)
            
            if not cert_info:
                return {
                    'is_valid': False,
                    'error_message': 'Could not retrieve certificate'
                }
            
            # Parse certificate
            cert_data = await self._parse_certificate(cert_info['certificate'])
            
            # Combine results
            result = {
                'is_valid': cert_data['is_valid'],
                'expires_at': cert_data['expires_at'],
                'issued_at': cert_data['issued_at'],
                'days_until_expiry': cert_data['days_until_expiry'],
                'issuer': cert_data['issuer'],
                'subject': cert_data['subject'],
                'common_name': cert_data['common_name'],
                'subject_alt_names': cert_data['subject_alt_names'],
                'serial_number': cert_data['serial_number'],
                'signature_algorithm': cert_data['signature_algorithm'],
                'public_key_algorithm': cert_data['public_key_algorithm'],
                'public_key_size': cert_data['public_key_size'],
                'is_self_signed': cert_data['is_self_signed'],
                'chain_length': cert_info.get('chain_length', 1),
                'ssl_version': cert_info.get('ssl_version'),
                'cipher_suite': cert_info.get('cipher_suite'),
                'validation_errors': cert_data.get('validation_errors', []),
                'warnings': cert_data.get('warnings', [])
            }
            
            # Add error message if certificate is invalid
            if not cert_data['is_valid'] and cert_data.get('validation_errors'):
                result['error_message'] = '; '.join(cert_data['validation_errors'])
            
            return result
            
        except Exception as e:
            logger.error(f"SSL check failed for {domain}:{port} - {str(e)}")
            return {
                'is_valid': False,
                'error_message': str(e)
            }
    
    async def _get_certificate_info(self, domain: str, port: int, timeout: int) -> Optional[Dict[str, Any]]:
        """Get SSL certificate information from domain"""
        try:
            # Create SSL context
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            # Connect and get certificate
            loop = asyncio.get_event_loop()
            
            def get_cert():
                sock = socket.create_connection((domain, port), timeout=timeout)
                try:
                    ssl_sock = context.wrap_socket(sock, server_hostname=domain)
                    try:
                        cert_der = ssl_sock.getpeercert(binary_form=True)
                        cert_info = ssl_sock.getpeercert()
                        cipher = ssl_sock.cipher()
                        version = ssl_sock.version()
                        
                        return {
                            'certificate': cert_der,
                            'cert_info': cert_info,
                            'cipher_suite': cipher[0] if cipher else None,
                            'ssl_version': version,
                            'chain_length': 1  # Basic implementation
                        }
                    finally:
                        ssl_sock.close()
                finally:
                    sock.close()
            
            return await loop.run_in_executor(None, get_cert)
            
        except socket.timeout:
            raise Exception(f"Connection timeout to {domain}:{port}")
        except socket.gaierror as e:
            raise Exception(f"DNS resolution failed for {domain}: {str(e)}")
        except ConnectionRefusedError:
            raise Exception(f"Connection refused to {domain}:{port}")
        except Exception as e:
            raise Exception(f"Failed to connect to {domain}:{port}: {str(e)}")
    
    async def _parse_certificate(self, cert_der: bytes) -> Dict[str, Any]:
        """Parse SSL certificate and extract information"""
        try:
            # Parse certificate using cryptography library
            cert = x509.load_der_x509_certificate(cert_der, default_backend())
            
            # Extract basic information
            now = datetime.now(timezone.utc)
            expires_at = cert.not_valid_after.replace(tzinfo=timezone.utc)
            issued_at = cert.not_valid_before.replace(tzinfo=timezone.utc)
            
            # Calculate days until expiry
            days_until_expiry = (expires_at - now).days
            
            # Extract subject and issuer
            subject = self._format_name(cert.subject)
            issuer = self._format_name(cert.issuer)
            
            # Extract common name
            common_name = None
            for attribute in cert.subject:
                if attribute.oid == x509.NameOID.COMMON_NAME:
                    common_name = attribute.value
                    break
            
            # Extract Subject Alternative Names
            subject_alt_names = []
            try:
                san_ext = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                subject_alt_names = [name.value for name in san_ext.value]
            except x509.ExtensionNotFound:
                pass
            
            # Extract serial number
            serial_number = str(cert.serial_number)
            
            # Extract signature algorithm
            signature_algorithm = cert.signature_algorithm_oid._name
            
            # Extract public key information
            public_key = cert.public_key()
            public_key_algorithm = public_key.__class__.__name__.replace('PublicKey', '')
            
            public_key_size = None
            if hasattr(public_key, 'key_size'):
                public_key_size = public_key.key_size
            
            # Check if self-signed
            is_self_signed = subject == issuer
            
            # Validate certificate
            validation_errors = []
            warnings = []
            
            # Check if expired
            if now > expires_at:
                validation_errors.append("Certificate has expired")
            elif now < issued_at:
                validation_errors.append("Certificate is not yet valid")
            
            # Check if expiring soon
            if 0 <= days_until_expiry <= 30:
                warnings.append(f"Certificate expires in {days_until_expiry} days")
            
            # Check for weak signature algorithms
            weak_algorithms = ['md5', 'sha1']
            if any(weak in signature_algorithm.lower() for weak in weak_algorithms):
                warnings.append(f"Weak signature algorithm: {signature_algorithm}")
            
            # Check for small key sizes
            if public_key_size and public_key_size < 2048:
                warnings.append(f"Small key size: {public_key_size} bits")
            
            is_valid = len(validation_errors) == 0
            
            return {
                'is_valid': is_valid,
                'expires_at': expires_at,
                'issued_at': issued_at,
                'days_until_expiry': days_until_expiry,
                'subject': subject,
                'issuer': issuer,
                'common_name': common_name,
                'subject_alt_names': subject_alt_names,
                'serial_number': serial_number,
                'signature_algorithm': signature_algorithm,
                'public_key_algorithm': public_key_algorithm,
                'public_key_size': public_key_size,
                'is_self_signed': is_self_signed,
                'validation_errors': validation_errors,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f"Failed to parse certificate: {str(e)}")
            return {
                'is_valid': False,
                'validation_errors': [f"Certificate parsing failed: {str(e)}"]
            }
    
    def _format_name(self, name: x509.Name) -> str:
        """Format X.509 name to string"""
        try:
            return ', '.join([f"{attr.oid._name}={attr.value}" for attr in name])
        except Exception:
            return str(name)
    
    async def check_multiple_domains(self, domains: list[tuple[str, int]], timeout: Optional[int] = None) -> Dict[str, Dict[str, Any]]:
        """Check SSL certificates for multiple domains concurrently"""
        timeout = timeout or self.default_timeout
        
        async def check_single_domain(domain: str, port: int):
            try:
                result = await self.check_certificate(domain, port, timeout)
                return domain, result
            except Exception as e:
                return domain, {
                    'is_valid': False,
                    'error_message': str(e)
                }
        
        # Create tasks for concurrent execution
        tasks = [check_single_domain(domain, port) for domain, port in domains]
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        domain_results = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"SSL check task failed: {str(result)}")
                continue
            
            domain, cert_result = result
            domain_results[domain] = cert_result
        
        return domain_results
    
    async def get_certificate_chain(self, domain: str, port: int = 443, timeout: Optional[int] = None) -> Dict[str, Any]:
        """Get full SSL certificate chain information"""
        timeout = timeout or self.default_timeout
        
        try:
            # This is a simplified implementation
            # For full chain analysis, you'd need to implement certificate chain walking
            cert_info = await self.check_certificate(domain, port, timeout)
            
            return {
                'domain': domain,
                'port': port,
                'chain': [cert_info],  # Simplified - only leaf certificate
                'chain_length': 1,
                'is_complete': True,  # Simplified assumption
                'trust_issues': []
            }
            
        except Exception as e:
            logger.error(f"Failed to get certificate chain for {domain}:{port} - {str(e)}")
            return {
                'domain': domain,
                'port': port,
                'chain': [],
                'chain_length': 0,
                'is_complete': False,
                'trust_issues': [str(e)]
            }