# Orion Nexus - CentOS 9 Manual Deployment Guide

This guide provides step-by-step instructions for manually deploying the Orion Nexus Network Monitoring Portal on a CentOS 9 server using root user access and MongoDB Atlas.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [System Preparation](#system-preparation)
3. [User Setup](#user-setup)
4. [Database Installation](#database-installation)
5. [Redis Installation](#redis-installation)
6. [Node.js Installation](#nodejs-installation)
7. [Python Installation](#python-installation)
8. [Application Deployment](#application-deployment)
9. [Service Configuration](#service-configuration)
10. [Nginx Configuration](#nginx-configuration)
11. [SSL Setup](#ssl-setup)
12. [Final Testing](#final-testing)
13. [Maintenance](#maintenance)
14. [Troubleshooting](#troubleshooting)

## Prerequisites

- CentOS 9 server with root access
- Minimum 2GB RAM, 2 CPU cores
- 20GB available disk space
- Domain name pointing to your server (for SSL)
- Internet connectivity

## System Preparation

### 1. Update System
```bash
# Update all packages
dnf update -y

# Install EPEL repository
dnf install -y epel-release

# Install development tools
dnf groupinstall -y "Development Tools"
```

### 2. Install Basic Dependencies
```bash
dnf install -y \
    curl \
    wget \
    git \
    unzip \
    vim \
    htop \
    firewalld \
    policycoreutils-python-utils \
    net-tools
```

### 3. Configure Firewall
```bash
# Start and enable firewall
systemctl start firewalld
systemctl enable firewalld

# Open required ports
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=8000/tcp  # Backend API
firewall-cmd --permanent --add-port=3000/tcp  # Frontend
firewall-cmd --reload

# Verify firewall rules
firewall-cmd --list-all
```

## Application Setup

### 1. Create Application Directories
```bash
# Create application directories as root
mkdir -p /opt/orion-nexus
mkdir -p /var/log/orion-nexus
mkdir -p /var/uploads/orion-nexus
mkdir -p /var/lib/orion-nexus
mkdir -p /var/backups/orion-nexus

# Set permissions

chmod 755 /opt/orion-nexus
chmod 755 /var/log/orion-nexus
chmod 755 /var/uploads/orion-nexus
chmod 755 /var/lib/orion-nexus
chmod 755 /var/backups/orion-nexus
```

## Database Configuration

### MongoDB Atlas Setup

This deployment uses MongoDB Atlas cloud database. No local MongoDB installation is required.

**Prerequisites:**
- MongoDB Atlas account
- Database cluster created
- Network access configured to allow your server IP
- Database user created with appropriate permissions

**Connection Details:**
- Connection String: `mongodb+srv://nmp:<db_password>@orion-nexus.5lt4kqc.mongodb.net/?retryWrites=true&w=majority&appName=orion-nexus`
- Database Name: `orion_nexus`
- Username: `nmp`
- Password: `<db_password>` (replace with your actual password)

### Test MongoDB Atlas Connection
```bash
# Install MongoDB Shell (mongosh) for testing
wget https://downloads.mongodb.com/compass/mongodb-mongosh-1.10.6.x86_64.rpm
rpm -ivh mongodb-mongosh-1.10.6.x86_64.rpm

# Test connection (replace <db_password> with actual password)
mongosh "mongodb+srv://nmp:<db_password>@orion-nexus.5lt4kqc.mongodb.net/?retryWrites=true&w=majority&appName=orion-nexus"

# In mongosh, test database access:
use orion_nexus
db.test.insertOne({test: "connection"})
db.test.find()
db.test.drop()
exit
```

## Redis Installation

### 1. Install Redis
```bash
# Install Redis
dnf install -y redis

# Start and enable Redis
systemctl start redis
systemctl enable redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

## Node.js Installation

### 1. Install Node.js 18.x
```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -

# Install Node.js
dnf install -y nodejs

# Verify installation
node --version
npm --version
```

## Python Installation

### 1. Install Python 3.11
```bash
# Install Python and development tools
dnf install -y \
    python3 \
    python3-pip \
    python3-devel \
    python3-setuptools \
    python3-wheel

# Verify installation
python3 --version
pip3 --version
```

## Application Deployment

### 1. Clone Repository
```bash
# Clone the orion-nexus repository
git clone https://github.com/mriislam/orion-nexus.git /opt/orion-nexus
cd /opt/orion-nexus
```

### 2. Setup Backend
```bash
cd /opt/orion-nexus/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env.production
```

### 3. Configure Backend Environment
```bash
# Edit backend environment file
vim /opt/orion-nexus/backend/.env.production
```

Update the following variables:
```env
# Database - MongoDB Atlas
MONGODB_URL=mongodb+srv://nmp:<db_password>@orion-nexus.5lt4kqc.mongodb.net/?retryWrites=true&w=majority&appName=orion-nexus
MONGODB_DATABASE=orion_nexus

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your_very_long_random_secret_key_here
AES_SECRET_KEY=your_aes_secret_key_here
JWT_SECRET_KEY=another_very_long_random_secret_key_here

# Application
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Monitoring Intervals (seconds)
DEVICE_POLL_INTERVAL=300
SSL_CHECK_INTERVAL=3600
UPTIME_CHECK_INTERVAL=60

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Setup Frontend
```bash
# Verify repository structure first
ls -la /opt/orion-nexus/

# Check if frontend directory exists
if [ ! -d "/opt/orion-nexus/frontend" ]; then
    echo "Error: Frontend directory not found. Checking repository structure..."
    find /opt/orion-nexus -name "package.json" -type f
    exit 1
fi

cd /opt/orion-nexus/frontend

# Verify package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in frontend directory"
    echo "Current directory contents:"
    ls -la
    exit 1
fi

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

### 5. Configure Frontend Environment
```bash
# Edit frontend environment file
vim /opt/orion-nexus/frontend/.env.local
```

Update the following variables:
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_AES_SECRET_KEY=your_aes_secret_key_here

# Application
NEXT_PUBLIC_APP_NAME=Orion Nexus
NODE_ENV=production
PORT=3000
```

### 6. Build Frontend
```bash
cd /opt/orion-nexus/frontend
npm run build
```

### 7. Test Application Setup
```bash
cd /opt/orion-nexus/backend
source venv/bin/activate

# Test MongoDB Atlas connection
python3 -c "from core.database import get_database; print('Database connection successful' if get_database() else 'Database connection failed')"

# Test Redis connection
redis-cli ping
```

## Service Configuration

### 1. Update Systemd Service Files
```bash
# Update service files to use correct paths
sed -i 's|/home/nexus/monitoring-portal|/opt/orion-nexus|g' /opt/orion-nexus/deployment/systemd/*.service
sed -i 's|User=nexus|User=root|g' /opt/orion-nexus/deployment/systemd/*.service
sed -i 's|Group=nexus|Group=root|g' /opt/orion-nexus/deployment/systemd/*.service

# Copy service files
cp /opt/orion-nexus/deployment/systemd/*.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload
```

### 2. Enable Services
```bash
systemctl enable nexus-backend.service
systemctl enable nexus-frontend.service
systemctl enable nexus-worker.service
systemctl enable nexus-scheduler.service
```

### 3. Start Services
```bash
systemctl start nexus-backend
systemctl start nexus-frontend
systemctl start nexus-worker
systemctl start nexus-scheduler
```

### 4. Check Service Status
```bash
systemctl status nexus-backend
systemctl status nexus-frontend
systemctl status nexus-worker
systemctl status nexus-scheduler
```

## Nginx Configuration

### 1. Install Nginx
```bash
dnf install -y nginx
```

### 2. Configure Nginx
```bash
# Copy Nginx configuration
cp /opt/orion-nexus/deployment/nginx/nexus-monitoring.conf /etc/nginx/conf.d/orion-nexus.conf

# Edit configuration to match your domain
vim /etc/nginx/conf.d/orion-nexus.conf

# Replace 'your-domain.com' with your actual domain
# Update SSL certificate paths if needed
# Update server_name and proxy_pass directives as needed
```

### 3. Test and Start Nginx
```bash
# Test Nginx configuration
nginx -t

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

## SSL Setup

### 1. Install Certbot
```bash
# Install snapd
dnf install -y snapd
systemctl enable --now snapd.socket
ln -s /var/lib/snapd/snap /snap

# Install certbot via snap
snap install core; snap refresh core
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Obtain SSL Certificate
```bash
# Stop nginx temporarily
systemctl stop nginx

# Obtain certificate
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Start nginx
systemctl start nginx
```

### 3. Setup Auto-renewal
```bash
# Test renewal
certbot renew --dry-run

# Add cron job for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## Final Testing

### 1. Test Application
```bash
# Check if all services are running
systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Test backend API
curl -k https://your-domain.com/api/health

# Test frontend
curl -k https://your-domain.com/

# Test MongoDB Atlas connection
cd /opt/orion-nexus/backend
source venv/bin/activate
python3 -c "from core.database import get_database; print('MongoDB Atlas connection:', 'OK' if get_database() else 'FAILED')"
```

### 2. Check Logs
```bash
# Backend logs
journalctl -u nexus-backend -f

# Frontend logs
journalctl -u nexus-frontend -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/log/orion-nexus/*.log
```

## Maintenance

### Daily Tasks
```bash
# Check service status
systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Check disk space
df -h

# Check logs for errors
journalctl --since "1 hour ago" | grep -i error

# Test MongoDB Atlas connectivity
cd /opt/orion-nexus/backend && source venv/bin/activate && python3 -c "from core.database import get_database; print('DB Status:', 'Connected' if get_database() else 'Disconnected')"
```

### Weekly Tasks
```bash
# Update system packages
dnf update -y

# Backup application configuration
tar -czf /var/backups/orion-nexus/config_backup_$(date +%Y%m%d).tar.gz /opt/orion-nexus/backend/.env.production /opt/orion-nexus/frontend/.env.local

# Clean old logs
journalctl --vacuum-time=7d

# Check SSL certificate expiry
certbot certificates
```

### Monthly Tasks
```bash
# Update application
cd /opt/orion-nexus
git pull

# Update backend dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Update frontend dependencies
cd ../frontend
npm update
npm run build

# Restart services
systemctl restart nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Verify all services are running
systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler
```

## Troubleshooting

### Common Issues

#### Repository Structure Issues (ENOENT Errors)

If you encounter "ENOENT: no such file or directory" errors during npm install or other operations:

**QUICK FIX - Repository Missing Frontend Files:**

If the git repository has no files under the frontend folder (confirmed issue), use this workaround:

```bash
# Option 1: Copy entire frontend directory from working repository
# Replace /path/to/working/repo with your actual working repository path
cp -r /path/to/working/repo/frontend/* /opt/orion-nexus/frontend/
cp -r /path/to/working/repo/backend/* /opt/orion-nexus/backend/

# Option 2: If using Windows/local development repository
# Example: Copy from your local development environment
# scp -r user@local-machine:/path/to/working/repo/frontend/* /opt/orion-nexus/frontend/
# scp -r user@local-machine:/path/to/working/repo/backend/* /opt/orion-nexus/backend/

# Option 3: Use rsync for better file copying
# rsync -av /path/to/working/repo/frontend/ /opt/orion-nexus/frontend/
# rsync -av /path/to/working/repo/backend/ /opt/orion-nexus/backend/

# Verify files were copied correctly
ls -la /opt/orion-nexus/frontend/
ls -la /opt/orion-nexus/backend/

# Then proceed with installation
cd /opt/orion-nexus/frontend
npm install
```

**DETAILED TROUBLESHOOTING:**

```bash
# 0. Check if git repository is missing frontend files entirely
cd /opt/orion-nexus
find . -name "package.json" -type f
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | head -10

# If no frontend files found, check repository details
git remote -v
git branch -a
git log --oneline -5

echo "Repository may be incomplete or wrong branch. Consider:"
echo "1. Checking if you cloned the correct repository"
echo "2. Switching to the correct branch (e.g., main, master, develop)"
echo "3. Contacting repository maintainer for correct repository URL"
echo "4. Using a known working repository as source"

# 1. Verify the repository was cloned correctly
ls -la /opt/orion-nexus/

# 2. Check if the repository structure matches expectations
find /opt/orion-nexus -name "package.json" -type f
find /opt/orion-nexus -name "requirements.txt" -type f

# 3. If repository structure is different, check the actual repository contents
cd /opt/orion-nexus
git remote -v
git branch -a
git log --oneline -5

# 4. If frontend directory is missing or has different structure:
# Option A: Check if it's in a subdirectory
find /opt/orion-nexus -type d -name "frontend"

# Option B: If repository has different structure, adapt paths accordingly
# Example: if frontend is in a different location
# ls -la /opt/orion-nexus/*/frontend/

# 5. Fix permissions if needed
chown -R root:root /opt/orion-nexus/
chmod -R 755 /opt/orion-nexus/

# 6. Re-clone repository if structure is completely wrong
rm -rf /opt/orion-nexus
git clone https://github.com/mriislam/orion-nexus.git /opt/orion-nexus

# 6a. If repository appears incomplete (only package-lock.json but no package.json):
# This indicates the repository may be incomplete or have missing files
echo "Checking for incomplete repository structure..."
if [ -f "/opt/orion-nexus/frontend/package-lock.json" ] && [ ! -f "/opt/orion-nexus/frontend/package.json" ]; then
    echo "WARNING: Found package-lock.json but no package.json - repository may be incomplete"
    echo "Try checking different branches or contact repository maintainer"
    git branch -a
fi

# 7. Verify package.json exists before running npm install
if [ -f "/opt/orion-nexus/frontend/package.json" ]; then
    echo "Frontend package.json found"
    cd /opt/orion-nexus/frontend
    npm install
else
    echo "ERROR: Frontend package.json not found!"
    echo "Current frontend directory contents:"
    ls -la /opt/orion-nexus/frontend/
    echo ""
    echo "This indicates the repository is incomplete or has a different structure."
    echo "Possible solutions:"
    echo "1. Check if this is the correct repository URL"
    echo "2. Verify the repository branch (try 'git branch -a')"
    echo "3. Check if frontend files are in a different location:"
    find /opt/orion-nexus -name "package.json" -type f
    echo "4. Contact repository maintainer if files are missing"
    echo "5. IMMEDIATE WORKAROUND: Copy package.json from a working repository"
    echo "   If you have access to a complete repository structure elsewhere:"
    echo "   cp /path/to/working/repo/frontend/package.json /opt/orion-nexus/frontend/"
    echo "   cp /path/to/working/repo/frontend/.env.example /opt/orion-nexus/frontend/"
    echo "   Then retry: npm install"
    exit 1
fi
```

#### Services Won't Start
```bash
# Check service logs
journalctl -u nexus-backend -n 50

# Check if ports are in use
netstat -tlnp | grep :8000
netstat -tlnp | grep :3000

# Check file permissions
ls -la /opt/orion-nexus/

# Check environment files
ls -la /opt/orion-nexus/backend/.env.production
ls -la /opt/orion-nexus/frontend/.env.local
```

#### Database Connection Issues
```bash
# Test MongoDB Atlas connection
cd /opt/orion-nexus/backend
source venv/bin/activate
python3 -c "from core.database import get_database; db = get_database(); print('Connection successful' if db else 'Connection failed')"

# Test with mongosh directly
mongosh "mongodb+srv://nmp:<db_password>@orion-nexus.5lt4kqc.mongodb.net/?retryWrites=true&w=majority&appName=orion-nexus"

# Check network connectivity to MongoDB Atlas
ping orion-nexus.5lt4kqc.mongodb.net
nslookup orion-nexus.5lt4kqc.mongodb.net

# Verify environment variables
cd /opt/orion-nexus/backend
grep MONGODB_URL .env.production
```

#### Nginx Issues
```bash
# Test Nginx configuration
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Check if Nginx is listening
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# Check Nginx configuration file
cat /etc/nginx/conf.d/orion-nexus.conf
```

#### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Performance Monitoring
```bash
# Monitor system resources
htop

# Check memory usage
free -h

# Check disk I/O
iostat -x 1

# Monitor application logs
sudo tail -f /var/log/nexus/*.log
```

### Security Considerations

1. **Regular Updates**: Keep system and application dependencies updated
2. **Firewall**: Only open necessary ports
3. **SSL**: Use strong SSL certificates and configurations
4. **Passwords**: Use strong, unique passwords for all accounts
5. **Backups**: Regular database and configuration backups
6. **Monitoring**: Set up log monitoring and alerting
7. **Access Control**: Limit SSH access and use key-based authentication

### Support

For additional support:
- Check application logs in `/var/log/orion-nexus/`
- Review systemd service logs with `journalctl`
- Consult the main documentation in `README.md`
- Check the project repository at https://github.com/mriislam/orion-nexus.git for updates and issues
- Review MongoDB Atlas dashboard for database connectivity issues

---

**Important Notes**: 
- Replace `your-domain.com` with your actual domain name throughout this guide
- Replace `<db_password>` with your actual MongoDB Atlas password
- Ensure all secret keys (SECRET_KEY, AES_SECRET_KEY, JWT_SECRET_KEY) are properly secured and unique
- This guide assumes root user access for all operations
- MongoDB Atlas handles database backups automatically, but ensure you have application configuration backups
- **Always verify repository structure after cloning** - if you encounter ENOENT errors, check the troubleshooting section for repository structure issues
- Ensure the repository contains both `frontend/` and `backend/` directories with their respective `package.json` and `requirements.txt` files
- **Empty Repository Issue**: If the git repository has no files under the frontend folder, this indicates either:
  - Wrong repository URL was cloned
  - Incorrect branch is checked out (try `main`, `master`, or `develop` branches)
  - Repository is incomplete or corrupted
  - You need to use a different/working repository as the source