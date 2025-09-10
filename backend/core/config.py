from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "orion_nexus"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    aes_key: str = "your-32-char-aes-key-change-this!!"
    
    # Redis (for Celery)
    redis_url: str = "redis://localhost:6379/0"
    
    # SNMP
    snmp_timeout: int = 5
    snmp_retries: int = 3
    
    # Monitoring intervals (in seconds)
    device_poll_interval: int = 300  # 5 minutes
    ssl_check_interval: int = 3600   # 1 hour
    
    # API
    api_v1_prefix: str = "/api/v1"
    
    # CORS
    allowed_origins: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()