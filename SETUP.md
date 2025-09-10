# Nexus Monitoring Portal - Setup Guide

## Prerequisites

Before setting up the Nexus Monitoring Portal, ensure you have the following installed:

### Required Software
- **Node.js** (v18.0.0 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (v6.0 or higher)
- **Git**

### Optional (for Docker deployment)
- **Docker** (v20.0 or higher)
- **Docker Compose** (v2.0 or higher)

## Installation Methods

### Method 1: Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd new-monitoring-portal
```

#### 2. Backend Setup

##### Install Python Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

##### Configure Environment Variables
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database Configuration
MONGODB_URL=mongodb://localhost:27017/monitoring_portal
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# GCP Configuration (Optional)
GCP_PROJECT_ID=your-gcp-project-id
GCP_CREDENTIALS_PATH=/path/to/service-account.json

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application Settings
DEBUG=True
CORS_ORIGINS=["http://localhost:3000"]
```

##### Start Backend Services
```bash
# Start the FastAPI server
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start Celery worker (optional)
celery -A tasks.celery_app worker --loglevel=info

# In another terminal, start Celery beat scheduler (optional)
celery -A tasks.celery_app beat --loglevel=info
```

#### 3. Frontend Setup

##### Install Node.js Dependencies
```bash
cd frontend
npm install
```

##### Configure Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Nexus Monitoring Portal
```

##### Start Frontend Development Server
```bash
npm run dev
```

#### 4. Database Setup

##### MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS

# Create database and collections (optional - will be created automatically)
mongosh
use monitoring_portal
```

##### Redis
```bash
# Start Redis service
sudo systemctl start redis  # Linux
brew services start redis  # macOS
```

### Method 2: Docker Setup

#### 1. Clone and Configure
```bash
git clone <repository-url>
cd new-monitoring-portal
```

#### 2. Environment Configuration
Create environment files:
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
```

#### 3. Start with Docker Compose
```bash
docker-compose up -d
```

This will start:
- Frontend (http://localhost:3000)
- Backend API (http://localhost:8000)
- MongoDB (localhost:27017)
- Redis (localhost:6379)

## Configuration

### Backend Configuration

#### Core Settings (`backend/core/config.py`)
- **DATABASE_URL**: MongoDB connection string
- **REDIS_URL**: Redis connection string
- **SECRET_KEY**: Application secret key
- **JWT_SECRET_KEY**: JWT token secret
- **CORS_ORIGINS**: Allowed frontend origins

#### Monitoring Settings
- **SNMP_TIMEOUT**: SNMP request timeout (default: 5 seconds)
- **SSL_CHECK_INTERVAL**: SSL certificate check interval (default: 24 hours)
- **UPTIME_CHECK_INTERVAL**: Uptime monitoring interval (default: 5 minutes)
- **DEVICE_POLL_INTERVAL**: Device polling interval (default: 1 minute)

### Frontend Configuration

#### Environment Variables
- **NEXT_PUBLIC_API_URL**: Backend API URL
- **NEXT_PUBLIC_APP_NAME**: Application name
- **NEXT_PUBLIC_ENABLE_ANALYTICS**: Enable Google Analytics (true/false)

### GCP Integration Setup

#### 1. Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Create a new service account
4. Download the JSON key file

#### 2. Grant Required Permissions
Assign these roles to the service account:
- Compute Engine Viewer
- Cloud SQL Viewer
- Storage Object Viewer
- Kubernetes Engine Viewer
- Cloud Functions Viewer
- Pub/Sub Viewer

#### 3. Configure Credentials
```bash
# Method 1: Environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Method 2: Upload via web interface
# Use the GCP Integration page in the application
```

## Database Schema

### Collections

#### Devices Collection
```javascript
{
  "_id": ObjectId,
  "name": "Device Name",
  "ip_address": "192.168.1.1",
  "device_type": "router",
  "snmp_community": "public",
  "snmp_version": "2c",
  "status": "active",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### SSL Certificates Collection
```javascript
{
  "_id": ObjectId,
  "domain": "example.com",
  "port": 443,
  "issuer": "Let's Encrypt",
  "expires_at": ISODate,
  "status": "valid",
  "created_at": ISODate,
  "last_checked": ISODate
}
```

#### Uptime Monitors Collection
```javascript
{
  "_id": ObjectId,
  "name": "Website Monitor",
  "url": "https://example.com",
  "method": "GET",
  "interval": 300,
  "timeout": 30,
  "status": "up",
  "created_at": ISODate,
  "last_checked": ISODate
}
```

## API Documentation

### Access API Documentation
Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Authentication

#### Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

#### Use JWT Token
```bash
curl -X GET "http://localhost:8000/api/v1/devices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring Setup

### Device Monitoring

#### Add Network Device
1. Navigate to Devices page
2. Click "Add Device"
3. Fill in device details:
   - Name
   - IP Address
   - SNMP Community
   - Device Type

#### SNMP Configuration
Ensure SNMP is enabled on your devices:
```bash
# Cisco IOS
snmp-server community public RO

# Linux (install snmpd)
sudo apt-get install snmpd
sudo systemctl enable snmpd
```

### SSL Monitoring

#### Add SSL Certificate
1. Navigate to SSL Certificates page
2. Click "Add Certificate"
3. Enter domain and port
4. Configure alert thresholds

### Uptime Monitoring

#### Add Uptime Monitor
1. Navigate to Uptime Monitoring page
2. Click "Add Monitor"
3. Configure:
   - URL to monitor
   - Check interval
   - Timeout settings
   - Alert conditions

## Troubleshooting

### Common Issues

#### Backend Issues

**MongoDB Connection Error**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection
mongosh --eval "db.adminCommand('ismaster')"
```

**Redis Connection Error**
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping
```

**SNMP Timeout Errors**
- Verify device IP address
- Check SNMP community string
- Ensure SNMP is enabled on device
- Check firewall rules (UDP port 161)

#### Frontend Issues

**API Connection Error**
- Verify backend is running on port 8000
- Check CORS configuration
- Verify API URL in environment variables

**Build Errors**
```bash
# Clear Next.js cache
npm run clean
rm -rf .next
npm run build
```

### Performance Optimization

#### Database Optimization
```javascript
// Create indexes for better performance
db.devices.createIndex({ "ip_address": 1 })
db.ssl_certificates.createIndex({ "domain": 1 })
db.uptime_monitors.createIndex({ "url": 1 })
db.device_metrics.createIndex({ "device_id": 1, "timestamp": -1 })
```

#### Memory Usage
```bash
# Monitor memory usage
htop

# Adjust Python memory limits
export PYTHONMALLOC=malloc

# Adjust Node.js memory limits
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Security Considerations

### Production Deployment

#### Environment Variables
- Use strong, unique secret keys
- Enable HTTPS in production
- Restrict CORS origins
- Use environment-specific configurations

#### Database Security
```javascript
// Enable MongoDB authentication
use admin
db.createUser({
  user: "monitoring_admin",
  pwd: "strong_password",
  roles: ["readWriteAnyDatabase"]
})
```

#### Network Security
- Use firewall rules to restrict access
- Enable SSL/TLS for database connections
- Use VPN for remote access
- Implement rate limiting

### Backup Strategy

#### Database Backup
```bash
# MongoDB backup
mongodump --db monitoring_portal --out /backup/mongodb/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db monitoring_portal --out /backup/mongodb/$DATE
find /backup/mongodb -type d -mtime +7 -exec rm -rf {} +
```

#### Configuration Backup
```bash
# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  backend/.env \
  frontend/.env.local \
  docker-compose.yml
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor application logs
- Check system resources
- Verify backup completion

#### Weekly
- Update dependencies
- Review performance metrics
- Clean up old logs

#### Monthly
- Security updates
- Database optimization
- Capacity planning review

### Log Management

#### Application Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (development)
npm run dev 2>&1 | tee frontend.log

# Docker logs
docker-compose logs -f
```

#### Log Rotation
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/monitoring-portal

/var/log/monitoring-portal/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
```

## Support

### Getting Help
- Check the [troubleshooting section](#troubleshooting)
- Review application logs
- Check GitHub issues
- Contact system administrator

### Reporting Issues
When reporting issues, include:
- Error messages
- Steps to reproduce
- System information
- Log files (sanitized)

### Contributing
- Follow the development setup
- Read ARCHITECTURE.md
- Submit pull requests
- Report bugs and feature requests