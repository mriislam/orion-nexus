# Nexus Monitoring Portal - CentOS 9 Manual Deployment Guide

This guide provides step-by-step instructions for manually deploying the Nexus Monitoring Portal on a CentOS 9 server.

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
sudo dnf update -y

# Install EPEL repository
sudo dnf install -y epel-release

# Install development tools
sudo dnf groupinstall -y "Development Tools"
```

### 2. Install Basic Dependencies
```bash
sudo dnf install -y \
    curl \
    wget \
    git \
    unzip \
    vim \
    htop \
    firewalld \
    policycoreutils-python-utils
```

### 3. Configure Firewall
```bash
# Start and enable firewall
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Open required ports
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8000/tcp  # Backend
sudo firewall-cmd --permanent --add-port=3000/tcp  # Frontend
sudo firewall-cmd --reload
```

## User Setup

### 1. Create Application User
```bash
# Create nexus user
sudo useradd -m -s /bin/bash nexus

# Add to wheel group for sudo access
sudo usermod -aG wheel nexus

# Create application directories
sudo mkdir -p /home/nexus/monitoring-portal
sudo mkdir -p /var/log/nexus
sudo mkdir -p /var/uploads/nexus
sudo mkdir -p /var/lib/nexus
sudo mkdir -p /var/backups/nexus

# Set ownership
sudo chown -R nexus:nexus /home/nexus/monitoring-portal
sudo chown -R nexus:nexus /var/log/nexus
sudo chown -R nexus:nexus /var/uploads/nexus
sudo chown -R nexus:nexus /var/lib/nexus

# Set permissions
sudo chmod 755 /home/nexus/monitoring-portal
sudo chmod 755 /var/log/nexus
sudo chmod 755 /var/uploads/nexus
sudo chmod 755 /var/lib/nexus
```

## Database Installation

### 1. Install MongoDB
```bash
# Add MongoDB repository
cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# Install MongoDB
sudo dnf install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Configure MongoDB
```bash
# Connect to MongoDB
mongosh

# Create database and user (run in MongoDB shell)
use orion_nexus
db.createUser({
  user: "nexus_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "orion_nexus" },
    { role: "dbAdmin", db: "orion_nexus" }
  ]
})
exit
```

### 3. Configure MongoDB Authentication
```bash
# Edit MongoDB configuration
sudo vim /etc/mongod.conf

# Enable authentication by adding/modifying:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod

# Test connection with authentication
mongosh -u nexus_user -p your_secure_password_here --authenticationDatabase orion_nexus
```

### 4. Fix MongoDB Socket Permissions (if needed)
```bash
# If MongoDB fails to start with socket permission errors, run:
sudo systemctl stop mongod
sudo rm -f /tmp/mongodb-27017.sock
sudo chmod 1777 /tmp
sudo chown mongod:mongod /var/lib/mongo
sudo chown mongod:mongod /var/log/mongodb
sudo systemctl start mongod

# Verify MongoDB is running
sudo systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log
```

## Redis Installation

### 1. Install Redis
```bash
# Install Redis
sudo dnf install -y redis

# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

## Node.js Installation

### 1. Install Node.js 18.x
```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo dnf install -y nodejs

# Verify installation
node --version
npm --version
```

## Python Installation

### 1. Install Python 3.11
```bash
# Install Python and development tools
sudo dnf install -y \
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
# Switch to nexus user
sudo su - nexus

# Clone the repository
git clone https://github.com/your-repo/nexus-monitoring-portal.git /home/nexus/monitoring-portal
cd /home/nexus/monitoring-portal
```

### 2. Setup Backend
```bash
cd /home/nexus/monitoring-portal/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.production.template .env.production
```

### 3. Configure Backend Environment
```bash
# Edit backend environment file
vim /home/nexus/monitoring-portal/backend/.env.production
```

Update the following variables:
```env
# Database
MONGODB_URL=mongodb://nexus_user:your_secure_password_here@localhost:27017/orion_nexus?authSource=orion_nexus

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your_very_long_random_secret_key_here
JWT_SECRET_KEY=another_very_long_random_secret_key_here

# Application
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Setup Frontend
```bash
cd /home/nexus/monitoring-portal/frontend

# Install dependencies
npm install

# Copy environment template
cp .env.production.template .env.production
```

### 5. Configure Frontend Environment
```bash
# Edit frontend environment file
vim /home/nexus/monitoring-portal/frontend/.env.production
```

Update the following variables:
```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_WS_URL=wss://your-domain.com/ws
NODE_ENV=production
PORT=3000
```

### 6. Build Frontend
```bash
cd /home/nexus/monitoring-portal/frontend
npm run build
```

### 7. Run Database Migrations
```bash
cd /home/nexus/monitoring-portal/backend
source venv/bin/activate
alembic upgrade head
```

## Service Configuration

### 1. Install Systemd Services
```bash
# Exit from nexus user
exit

# Copy service files
sudo cp /home/nexus/monitoring-portal/deployment/systemd/*.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload
```

### 2. Enable Services
```bash
sudo systemctl enable nexus-backend.service
sudo systemctl enable nexus-frontend.service
sudo systemctl enable nexus-worker.service
sudo systemctl enable nexus-scheduler.service
```

### 3. Start Services
```bash
sudo systemctl start nexus-backend
sudo systemctl start nexus-frontend
sudo systemctl start nexus-worker
sudo systemctl start nexus-scheduler
```

### 4. Check Service Status
```bash
sudo systemctl status nexus-backend
sudo systemctl status nexus-frontend
sudo systemctl status nexus-worker
sudo systemctl status nexus-scheduler
```

## Nginx Configuration

### 1. Install Nginx
```bash
sudo dnf install -y nginx
```

### 2. Configure Nginx
```bash
# Copy Nginx configuration
sudo cp /home/nexus/monitoring-portal/deployment/nginx/nexus-monitoring.conf /etc/nginx/conf.d/

# Edit configuration to match your domain
sudo vim /etc/nginx/conf.d/nexus-monitoring.conf

# Replace 'your-domain.com' with your actual domain
# Update SSL certificate paths if needed
```

### 3. Test and Start Nginx
```bash
# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## SSL Setup

### 1. Install Certbot
```bash
# Install snapd
sudo dnf install -y snapd
sudo systemctl enable --now snapd.socket
sudo ln -s /var/lib/snapd/snap /snap

# Install certbot via snap
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 2. Obtain SSL Certificate
```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Start nginx
sudo systemctl start nginx
```

### 3. Setup Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## Final Testing

### 1. Test Application
```bash
# Check if all services are running
sudo systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Test backend API
curl -k https://your-domain.com/api/health

# Test frontend
curl -k https://your-domain.com/
```

### 2. Check Logs
```bash
# Backend logs
sudo journalctl -u nexus-backend -f

# Frontend logs
sudo journalctl -u nexus-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Maintenance

### Daily Tasks
```bash
# Check service status
sudo systemctl status nexus-backend nexus-frontend nexus-worker nexus-scheduler

# Check disk space
df -h

# Check logs for errors
sudo journalctl --since "1 hour ago" | grep -i error
```

### Weekly Tasks
```bash
# Update system packages
sudo dnf update -y

# Backup database
mongodump --db orion_nexus --out /var/backups/nexus/mongodb_$(date +%Y%m%d)

# Clean old logs
sudo journalctl --vacuum-time=7d
```

### Monthly Tasks
```bash
# Update application
sudo su - nexus
cd /home/nexus/monitoring-portal
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
exit
sudo systemctl restart nexus-backend nexus-frontend nexus-worker nexus-scheduler
```

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check service logs
sudo journalctl -u nexus-backend -n 50

# Check if ports are in use
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :3000

# Check file permissions
ls -la /home/nexus/monitoring-portal/
```

#### Database Connection Issues
```bash
# Test database connection
mongosh -u nexus_user -p your_secure_password_here --authenticationDatabase orion_nexus

# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Fix socket permission errors
sudo systemctl stop mongod
sudo rm -f /tmp/mongodb-27017.sock
sudo chmod 1777 /tmp
sudo chown mongod:mongod /var/lib/mongo /var/log/mongodb
sudo systemctl start mongod
```

#### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check if Nginx is listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

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
- Check application logs in `/var/log/nexus/`
- Review systemd service logs with `journalctl`
- Consult the main documentation in `MANUAL_DEPLOYMENT.md`
- Check the project repository for updates and issues

---

**Note**: Replace `your-domain.com` with your actual domain name throughout this guide. Ensure all passwords and secret keys are properly secured and unique for your installation.