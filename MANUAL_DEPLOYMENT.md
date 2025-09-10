# Manual Deployment Guide - Nexus Monitoring Portal

This guide provides step-by-step instructions for deploying the Nexus Monitoring Portal to a remote server without Docker.

## Prerequisites

- Ubuntu 20.04+ or CentOS 8+ server
- Root or sudo access
- Domain name (optional, for SSL)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

## Server Setup

### 1. Update System

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Install Required Dependencies

```bash
# Ubuntu/Debian
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx postgresql postgresql-contrib redis-server git curl

# CentOS/RHEL
sudo yum install -y python3 python3-pip nodejs npm nginx postgresql postgresql-server redis git curl
sudo postgresql-setup --initdb
```

### 3. Install Node.js 18+ (if not available)

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Database Setup

### 1. Configure PostgreSQL

```bash
# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE nexus_monitoring;
CREATE USER nexus_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nexus_monitoring TO nexus_user;
\q
EOF
```

### 2. Configure Redis

```bash
# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

## Application Deployment

### 1. Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash nexus
sudo usermod -aG sudo nexus
```

### 2. Clone Repository

```bash
# Switch to nexus user
sudo su - nexus

# Clone the repository
git clone <your-repository-url> /home/nexus/monitoring-portal
cd /home/nexus/monitoring-portal
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd /home/nexus/monitoring-portal/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create production environment file
cp .env.example .env.production
```

### 4. Configure Backend Environment

Edit `/home/nexus/monitoring-portal/backend/.env.production`:

```bash
# Database Configuration
DATABASE_URL=postgresql://nexus_user:your_secure_password@localhost/nexus_monitoring

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your_very_secure_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME="Nexus Monitoring Portal"

# CORS Settings
BACKEND_CORS_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# Monitoring Settings
SNMP_TIMEOUT=5
SSL_CHECK_INTERVAL=24
UPTIME_CHECK_INTERVAL=5
DEVICE_POLL_INTERVAL=1

# GCP Configuration (if using)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-gcp-project-id

# Email Configuration (optional)
SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 5. Initialize Database

```bash
# Run database migrations
cd /home/nexus/monitoring-portal/backend
source venv/bin/activate
python -c "from core.database import init_db; init_db()"
```

### 6. Frontend Setup

```bash
# Navigate to frontend directory
cd /home/nexus/monitoring-portal/frontend

# Install dependencies
npm install

# Create production environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.production
echo "NEXT_PUBLIC_APP_URL=https://yourdomain.com" >> .env.production

# Build for production
npm run build
```

## Service Configuration

### 1. Create Backend Service

Create `/etc/systemd/system/nexus-backend.service`:

```ini
[Unit]
Description=Nexus Monitoring Portal Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=nexus
Group=nexus
WorkingDirectory=/home/nexus/monitoring-portal/backend
Environment=PATH=/home/nexus/monitoring-portal/backend/venv/bin
EnvironmentFile=/home/nexus/monitoring-portal/backend/.env.production
ExecStart=/home/nexus/monitoring-portal/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 2. Create Frontend Service

Create `/etc/systemd/system/nexus-frontend.service`:

```ini
[Unit]
Description=Nexus Monitoring Portal Frontend
After=network.target

[Service]
Type=simple
User=nexus
Group=nexus
WorkingDirectory=/home/nexus/monitoring-portal/frontend
Environment=NODE_ENV=production
EnvironmentFile=/home/nexus/monitoring-portal/frontend/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 3. Create Celery Worker Service

Create `/etc/systemd/system/nexus-worker.service`:

```ini
[Unit]
Description=Nexus Monitoring Portal Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=nexus
Group=nexus
WorkingDirectory=/home/nexus/monitoring-portal/backend
Environment=PATH=/home/nexus/monitoring-portal/backend/venv/bin
EnvironmentFile=/home/nexus/monitoring-portal/backend/.env.production
ExecStart=/home/nexus/monitoring-portal/backend/venv/bin/celery -A tasks.celery_app worker --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 4. Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable nexus-backend
sudo systemctl enable nexus-frontend
sudo systemctl enable nexus-worker

# Start services
sudo systemctl start nexus-backend
sudo systemctl start nexus-frontend
sudo systemctl start nexus-worker

# Check status
sudo systemctl status nexus-backend
sudo systemctl status nexus-frontend
sudo systemctl status nexus-worker
```

## Nginx Configuration

### 1. Create Nginx Configuration

Create `/etc/nginx/sites-available/nexus-monitoring`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static {
        alias /home/nexus/monitoring-portal/backend/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Enable Nginx Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/nexus-monitoring /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## SSL Configuration (Optional)

### 1. Install Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

```bash
# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Monitoring and Maintenance

### 1. Log Management

```bash
# View service logs
sudo journalctl -u nexus-backend -f
sudo journalctl -u nexus-frontend -f
sudo journalctl -u nexus-worker -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Backup Script

Create `/home/nexus/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/nexus/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U nexus_user nexus_monitoring > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/nexus/monitoring-portal

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 3. Update Script

Create `/home/nexus/update.sh`:

```bash
#!/bin/bash
cd /home/nexus/monitoring-portal

# Pull latest changes
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd ../frontend
npm install
npm run build

# Restart services
sudo systemctl restart nexus-backend
sudo systemctl restart nexus-frontend
sudo systemctl restart nexus-worker
```

## Troubleshooting

### Common Issues

1. **Service won't start**: Check logs with `journalctl -u service-name`
2. **Database connection issues**: Verify PostgreSQL is running and credentials are correct
3. **Permission issues**: Ensure nexus user owns all application files
4. **Port conflicts**: Check if ports 3000, 8000 are available

### Health Checks

```bash
# Check if services are running
sudo systemctl status nexus-backend nexus-frontend nexus-worker

# Check if ports are listening
sudo netstat -tlnp | grep -E ':(3000|8000|5432|6379)'

# Test API endpoint
curl http://localhost:8000/api/v1/health

# Test frontend
curl http://localhost:3000
```

## Security Considerations

1. **Firewall**: Configure UFW or iptables to allow only necessary ports
2. **SSH**: Disable password authentication, use key-based auth
3. **Database**: Restrict PostgreSQL to localhost connections
4. **Updates**: Regularly update system packages and dependencies
5. **Monitoring**: Set up log monitoring and alerting

This completes the manual deployment setup for the Nexus Monitoring Portal.