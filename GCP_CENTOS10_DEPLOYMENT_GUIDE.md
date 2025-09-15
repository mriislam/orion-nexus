# Nexus Monitoring Portal - CentOS 10 GCP Deployment Guide

This guide provides step-by-step instructions for deploying the Nexus Monitoring Portal on CentOS 10 running on Google Cloud Platform with a Load Balancer.

## Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Google Cloud       │    │    CentOS 10 VM     │    │    Services         │
│  Load Balancer      │───►│   (172.26.1.100)    │───►│  MongoDB + Redis    │
│  (External IP)      │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │   Application       │
                            │   Backend: :8001    │
                            │   Frontend: :3000   │
                            └─────────────────────┘
```

## Prerequisites

- Google Cloud Platform account with billing enabled
- Basic knowledge of Linux command line
- SSH access to the VM

## Step 1: Create GCP VM Instance

### 1.1 Create VM via gcloud CLI

```bash
# Set project and zone
export PROJECT_ID="your-project-id"
export ZONE="us-central1-a"

# Create VM instance
gcloud compute instances create nexus-monitoring-vm \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=e2-standard-4 \
  --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default,private-network-ip=172.26.1.100 \
  --maintenance-policy=MIGRATE \
  --provisioning-model=STANDARD \
  --service-account=your-service-account@your-project.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server,https-server,nexus-monitoring \
  --create-disk=auto-delete=yes,boot=yes,device-name=nexus-monitoring-vm,image=projects/centos-cloud/global/images/family/centos-stream-10,mode=rw,size=50,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-standard \
  --no-shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring \
  --labels=environment=production,application=nexus-monitoring \
  --reservation-affinity=any
```

### 1.2 Create Firewall Rules

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-nexus-http \
  --allow tcp:80,tcp:3000,tcp:8001 \
  --source-ranges 0.0.0.0/0 \
  --target-tags nexus-monitoring

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-nexus-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags nexus-monitoring

# Allow SSH
gcloud compute firewall-rules create allow-nexus-ssh \
  --allow tcp:22 \
  --source-ranges 0.0.0.0/0 \
  --target-tags nexus-monitoring
```

## Step 2: Connect to VM and Initial Setup

### 2.1 SSH to VM

```bash
gcloud compute ssh nexus-monitoring-vm --zone=$ZONE --project=$PROJECT_ID
```

### 2.2 Switch to Root User

```bash
sudo su -
```

### 2.3 Update System

```bash
# Update system packages
dnf update -y

# Install essential packages
dnf install -y git curl wget vim nano htop
```

## Step 3: Install Required Software

### 3.1 Install Python 3.11+

```bash
# Install Python 3.11
dnf install -y python3.11 python3.11-pip python3.11-devel

# Create symlinks
ln -sf /usr/bin/python3.11 /usr/bin/python3
ln -sf /usr/bin/pip3.11 /usr/bin/pip3

# Verify installation
python3 --version
pip3 --version
```

### 3.2 Install Node.js 18+

```bash
# Install Node.js repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# Install Node.js
dnf install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.3 Install MongoDB

```bash
# Create MongoDB repository file
cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

# Install MongoDB
dnf install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod

# Verify MongoDB is running
systemctl status mongod
```

### 3.4 Install Redis

```bash
# Install Redis
dnf install -y redis

# Start and enable Redis
systemctl start redis
systemctl enable redis

# Verify Redis is running
systemctl status redis
```

### 3.5 Install Nginx

```bash
# Install Nginx
dnf install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify Nginx is running
systemctl status nginx
```

## Step 4: Clone and Setup Application

### 4.1 Clone Repository

```bash
# Navigate to application directory
cd /opt

# Clone the repository
git clone https://github.com/mriislam/new-monitoring-portal.git
cd new-monitoring-portal

# Set proper ownership
chown -R root:root /opt/new-monitoring-portal
```

### 4.2 Setup Backend

```bash
# Navigate to backend directory
cd /opt/new-monitoring-portal/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies (install core dependencies first)
pip install fastapi==0.104.1 "uvicorn[standard]==0.24.0" python-multipart==0.0.6 motor==3.3.2 pymongo==4.6.0
pip install "pydantic>=2.8.0" "pydantic-settings>=2.4.0"
pip install passlib bcrypt python-jose cryptography pyopenssl
pip install pysnmp pysnmp-mibs requests aiohttp
pip install firebase-admin google-cloud-storage google-cloud-firestore google-auth google-auth-oauthlib google-auth-httplib2
pip install python-dotenv openpyxl xlsxwriter

# Create environment file
cp .env.example .env

# Edit environment configuration
cat > .env << EOF
# Database Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=nexus_monitoring

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Security Configuration
SECRET_KEY=$(openssl rand -hex 32)
AES_SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Monitoring Configuration
DEVICE_POLL_INTERVAL=300
SSL_CHECK_INTERVAL=3600
UPTIME_CHECK_INTERVAL=60

# Application Configuration
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
PORT=8001

# CORS Configuration
ALLOWED_ORIGINS=["http://172.26.1.100:3000","http://localhost:3000"]
EOF
```

### 4.3 Setup Frontend

```bash
# Navigate to frontend directory
cd /opt/new-monitoring-portal/frontend

# Install dependencies
npm install

# Create environment file
cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://172.26.1.100:8001
NEXT_PUBLIC_AES_SECRET_KEY=$(grep AES_SECRET_KEY /opt/new-monitoring-portal/backend/.env | cut -d'=' -f2)

# Application Configuration
NEXT_PUBLIC_APP_NAME=Nexus Monitoring Portal
NEXT_PUBLIC_ENVIRONMENT=production
EOF

# Fix package.json build script (remove --turbopack flag)
sed -i 's/"build": "next build --turbopack"/"build": "next build"/g' package.json
sed -i 's/"dev": "next dev --turbopack"/"dev": "next dev"/g' package.json

# Build the application
npm run build
```

## Step 5: Create Systemd Services

### 5.1 Backend Service

```bash
cat > /etc/systemd/system/nexus-backend.service << EOF
[Unit]
Description=Nexus Monitoring Portal Backend
After=network.target mongod.service redis.service
Requires=mongod.service redis.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/new-monitoring-portal/backend
Environment=PATH=/opt/new-monitoring-portal/backend/venv/bin
ExecStart=/opt/new-monitoring-portal/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### 5.2 Frontend Service

```bash
cat > /etc/systemd/system/nexus-frontend.service << EOF
[Unit]
Description=Nexus Monitoring Portal Frontend
After=network.target nexus-backend.service
Requires=nexus-backend.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/new-monitoring-portal/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
```

### 5.3 Celery Worker Service

```bash
cat > /etc/systemd/system/nexus-worker.service << EOF
[Unit]
Description=Nexus Monitoring Portal Celery Worker
After=network.target redis.service mongod.service
Requires=redis.service mongod.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/new-monitoring-portal/backend
Environment=PATH=/opt/new-monitoring-portal/backend/venv/bin
ExecStart=/opt/new-monitoring-portal/backend/venv/bin/celery -A tasks.celery_app worker --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### 5.4 Celery Beat Service

```bash
cat > /etc/systemd/system/nexus-scheduler.service << EOF
[Unit]
Description=Nexus Monitoring Portal Celery Beat Scheduler
After=network.target redis.service mongod.service
Requires=redis.service mongod.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/new-monitoring-portal/backend
Environment=PATH=/opt/new-monitoring-portal/backend/venv/bin
ExecStart=/opt/new-monitoring-portal/backend/venv/bin/celery -A tasks.celery_app beat --loglevel=info
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

## Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
cat > /etc/nginx/conf.d/nexus-monitoring.conf << EOF
server {
    listen 80;
    server_name 172.26.1.100;

    # Frontend proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## Step 7: Start Services

```bash
# Reload systemd
systemctl daemon-reload

# Enable and start services
systemctl enable nexus-backend nexus-frontend nexus-worker nexus-scheduler
systemctl start nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Check service status
systemctl status nexus-backend
systemctl status nexus-frontend
systemctl status nexus-worker
systemctl status nexus-scheduler
```

## Step 8: Setup Google Cloud Load Balancer

### 8.1 Create Health Check

```bash
gcloud compute health-checks create http nexus-health-check \
  --port 80 \
  --request-path="/" \
  --check-interval=30s \
  --timeout=10s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3
```

### 8.2 Create Instance Group

```bash
# Create unmanaged instance group
gcloud compute instance-groups unmanaged create nexus-instance-group \
  --zone=$ZONE

# Add VM to instance group
gcloud compute instance-groups unmanaged add-instances nexus-instance-group \
  --instances=nexus-monitoring-vm \
  --zone=$ZONE

# Set named ports
gcloud compute instance-groups unmanaged set-named-ports nexus-instance-group \
  --named-ports=http:80 \
  --zone=$ZONE
```

### 8.3 Create Backend Service

```bash
gcloud compute backend-services create nexus-backend-service \
  --protocol=HTTP \
  --health-checks=nexus-health-check \
  --global

# Add backend to service
gcloud compute backend-services add-backend nexus-backend-service \
  --instance-group=nexus-instance-group \
  --instance-group-zone=$ZONE \
  --global
```

### 8.4 Create URL Map

```bash
gcloud compute url-maps create nexus-url-map \
  --default-service=nexus-backend-service
```

### 8.5 Create HTTP(S) Proxy

```bash
# Create HTTP proxy
gcloud compute target-http-proxies create nexus-http-proxy \
  --url-map=nexus-url-map
```

### 8.6 Create Global Forwarding Rule

```bash
# Reserve static IP
gcloud compute addresses create nexus-lb-ip --global

# Get the reserved IP
LB_IP=$(gcloud compute addresses describe nexus-lb-ip --global --format="value(address)")
echo "Load Balancer IP: $LB_IP"

# Create forwarding rule
gcloud compute forwarding-rules create nexus-http-forwarding-rule \
  --address=nexus-lb-ip \
  --global \
  --target-http-proxy=nexus-http-proxy \
  --ports=80
```

## Step 9: SSL Certificate (Optional)

### 9.1 Create Managed SSL Certificate

```bash
# Replace with your domain
DOMAIN="your-domain.com"

# Create managed SSL certificate
gcloud compute ssl-certificates create nexus-ssl-cert \
  --domains=$DOMAIN \
  --global

# Create HTTPS proxy
gcloud compute target-https-proxies create nexus-https-proxy \
  --ssl-certificates=nexus-ssl-cert \
  --url-map=nexus-url-map

# Create HTTPS forwarding rule
gcloud compute forwarding-rules create nexus-https-forwarding-rule \
  --address=nexus-lb-ip \
  --global \
  --target-https-proxy=nexus-https-proxy \
  --ports=443
```

## Step 10: Verification and Testing

### 10.1 Check Service Status

```bash
# Check all services
systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler mongod redis nginx

# Check application logs
journalctl -u nexus-backend -f
journalctl -u nexus-frontend -f
```

### 10.2 Test Application

```bash
# Test backend API
curl http://172.26.1.100:8001/docs

# Test frontend
curl http://172.26.1.100:3000

# Test through Nginx
curl http://172.26.1.100/
```

### 10.3 Access Application

- **Direct VM Access**: `http://172.26.1.100`
- **Load Balancer Access**: `http://[LB_IP]`
- **API Documentation**: `http://[LB_IP]/api/docs`

## Step 11: Monitoring and Maintenance

### 11.1 Log Locations

```bash
# Application logs
journalctl -u nexus-backend
journalctl -u nexus-frontend
journalctl -u nexus-worker
journalctl -u nexus-scheduler

# System logs
/var/log/nginx/access.log
/var/log/nginx/error.log
/var/log/mongodb/mongod.log
```

### 11.2 Backup Script

```bash
cat > /root/backup-nexus.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/nexus-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out $BACKUP_DIR/mongodb

# Backup application
cp -r /opt/new-monitoring-portal $BACKUP_DIR/

# Backup configuration
cp -r /etc/nginx/conf.d/nexus-monitoring.conf $BACKUP_DIR/
cp /etc/systemd/system/nexus-*.service $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /root/backup-nexus.sh
```

### 11.3 Update Script

```bash
cat > /root/update-nexus.sh << 'EOF'
#!/bin/bash
cd /opt/new-monitoring-portal

# Stop services
systemctl stop nexus-frontend nexus-backend nexus-worker nexus-scheduler

# Pull latest changes
git pull origin main

# Update backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend dependencies
cd ../frontend
npm install
npm run build

# Start services
systemctl start nexus-backend nexus-frontend nexus-worker nexus-scheduler

echo "Update completed"
EOF

chmod +x /root/update-nexus.sh
```

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   journalctl -u nexus-backend -n 50
   ```

2. **Database connection issues**:
   ```bash
   systemctl status mongod
   mongo --eval "db.adminCommand('ismaster')"
   ```

3. **Load balancer health check failing**:
   ```bash
   curl -I http://172.26.1.100/
   ```

4. **Port conflicts**:
   ```bash
   netstat -tulpn | grep :8001
   netstat -tulpn | grep :3000
   ```

5. **Frontend build error - "Couldn't find any pages or app directory"**:
   This error occurs when using the `--turbopack` flag with Next.js 15. To fix:
   ```bash
   cd /opt/new-monitoring-portal/frontend
   # Remove turbopack flags from package.json
   sed -i 's/"build": "next build --turbopack"/"build": "next build"/g' package.json
   sed -i 's/"dev": "next dev --turbopack"/"dev": "next dev"/g' package.json
   # Try building again
   npm run build
   ```

### Performance Tuning

1. **MongoDB optimization**:
   ```bash
   # Edit /etc/mongod.conf
   # Increase cache size and connections
   ```

2. **Nginx optimization**:
   ```bash
   # Edit /etc/nginx/nginx.conf
   # Increase worker processes and connections
   ```

## Security Considerations

1. **Firewall rules**: Only allow necessary ports
2. **MongoDB security**: Enable authentication
3. **SSL certificates**: Use HTTPS in production
4. **Regular updates**: Keep system and dependencies updated
5. **Backup strategy**: Regular automated backups

## Conclusion

Your Nexus Monitoring Portal is now deployed on CentOS 10 with Google Cloud Load Balancer. The application should be accessible via the load balancer IP address, providing high availability and scalability.

For production use, consider:
- Setting up SSL certificates
- Implementing monitoring and alerting
- Regular security updates
- Database backup automation
- Log rotation and management