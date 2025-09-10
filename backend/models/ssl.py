from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


class SSLCheckBase(BaseModel):
    domain: str = Field(..., min_length=1, max_length=255, description="Domain name to check")
    port: int = Field(443, ge=1, le=65535, description="Port number")
    
    @validator('domain')
    def validate_domain(cls, v):
        import re
        # Basic domain validation
        domain_pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$'
        if not re.match(domain_pattern, v):
            raise ValueError('Invalid domain format')
        return v.lower()


class SSLCheckCreate(SSLCheckBase):
    pass


class SSLCheckResponse(SSLCheckBase):
    id: str = Field(..., description="SSL check ID")
    timestamp: datetime = Field(..., description="Check timestamp")
    
    # Certificate validity
    is_valid: bool = Field(..., description="Whether certificate is valid")
    expires_at: Optional[datetime] = Field(None, description="Certificate expiration date")
    days_until_expiry: Optional[int] = Field(None, description="Days until certificate expires")
    
    # Certificate details
    issuer: Optional[str] = Field(None, description="Certificate issuer")
    subject: Optional[str] = Field(None, description="Certificate subject")
    serial_number: Optional[str] = Field(None, description="Certificate serial number")
    signature_algorithm: Optional[str] = Field(None, description="Signature algorithm")
    
    # Error information
    error_message: Optional[str] = Field(None, description="Error message if check failed")
    
    class Config:
        from_attributes = True


class SSLCheck(SSLCheckResponse):
    """MongoDB document model for SSL checks"""
    pass


class SSLCertificateInfo(BaseModel):
    """Detailed SSL certificate information"""
    domain: str
    port: int
    
    # Basic certificate info
    is_valid: bool
    expires_at: Optional[datetime] = None
    issued_at: Optional[datetime] = None
    days_until_expiry: Optional[int] = None
    
    # Certificate details
    common_name: Optional[str] = None
    subject_alt_names: Optional[list[str]] = None
    issuer: Optional[str] = None
    subject: Optional[str] = None
    serial_number: Optional[str] = None
    signature_algorithm: Optional[str] = None
    public_key_algorithm: Optional[str] = None
    public_key_size: Optional[int] = None
    
    # Certificate chain
    chain_length: Optional[int] = None
    is_self_signed: Optional[bool] = None
    
    # Security information
    has_weak_signature: Optional[bool] = None
    supports_sni: Optional[bool] = None
    
    # Connection details
    ssl_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    
    # Validation results
    validation_errors: Optional[list[str]] = None
    warnings: Optional[list[str]] = None
    
    class Config:
        from_attributes = True


class SSLMonitorConfig(BaseModel):
    """SSL monitoring configuration"""
    domain: str
    port: int = 443
    enabled: bool = True
    check_interval: int = Field(3600, ge=300, le=86400, description="Check interval in seconds")
    alert_days_before_expiry: int = Field(30, ge=1, le=365, description="Days before expiry to alert")
    
    # Notification settings
    notify_on_expiry: bool = True
    notify_on_error: bool = True
    notification_emails: Optional[list[str]] = None
    
    # Advanced settings
    timeout: int = Field(10, ge=1, le=60, description="Connection timeout in seconds")
    verify_hostname: bool = True
    check_chain: bool = True
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True