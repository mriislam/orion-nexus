#!/bin/bash

# Nexus Monitoring Portal - Deployment Script
# This script handles the initial deployment and setup of the monitoring portal

set -e  # Exit on any error

# Configuration
APP_NAME="nexus-monitoring"
APP_USER="nexus"
APP_DIR="/home/$APP_USER/monitoring-portal"
BACKUP_DIR="/var/backups/nexus"
LOG_FILE="/var/log/nexus/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO: $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS: $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check system requirements
check_requirements() {
    info "Checking system requirements..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        error "Cannot determine OS version"
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] && [[ "$ID" != "debian" ]]; then
        warning "This script is designed for Ubuntu/Debian. Proceed with caution."
    fi
    
    # Check required commands
    local required_commands=("curl" "wget" "git" "sudo")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' is not installed"
        fi
    done
    
    success "System requirements check passed"
}

# Create application user
create_app_user() {
    info "Creating application user..."
    
    if id "$APP_USER" &>/dev/null; then
        info "User $APP_USER already exists"
    else
        sudo useradd -m -s /bin/bash "$APP_USER"
        sudo usermod -aG sudo "$APP_USER"
        success "Created user $APP_USER"
    fi
    
    # Create necessary directories
    sudo mkdir -p "$APP_DIR" "$BACKUP_DIR" "/var/log/nexus" "/var/uploads/nexus" "/var/lib/nexus"
    sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR" "/var/log/nexus" "/var/uploads/nexus" "/var/lib/nexus"
    sudo chmod 755 "$APP_DIR" "/var/log/nexus" "/var/uploads/nexus" "/var/lib/nexus"
}

# Install system dependencies
install_dependencies() {
    info "Installing system dependencies..."
    
    # Update package list
    sudo apt update
    
    # Install basic dependencies
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        unzip \
        supervisor \
        nginx \
        certbot \
        python3-certbot-nginx
    
    success "System dependencies installed"
}

# Install Node.js
install_nodejs() {
    info "Installing Node.js..."
    
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        info "Node.js already installed: $node_version"
        return
    fi
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Verify installation
    node --version
    npm --version
    
    success "Node.js installed successfully"
}

# Install Python
install_python() {
    info "Installing Python..."
    
    sudo apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        python3-setuptools
    
    # Verify installation
    python3 --version
    pip3 --version
    
    success "Python installed successfully"
}

# Install PostgreSQL
install_postgresql() {
    info "Installing PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        info "PostgreSQL already installed"
        return
    fi
    
    sudo apt install -y postgresql postgresql-contrib postgresql-client
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    success "PostgreSQL installed successfully"
}

# Install Redis
install_redis() {
    info "Installing Redis..."
    
    if command -v redis-server &> /dev/null; then
        info "Redis already installed"
        return
    fi
    
    sudo apt install -y redis-server
    
    # Configure Redis
    sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    
    # Start and enable Redis
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    success "Redis installed successfully"
}

# Setup database
setup_database() {
    info "Setting up database..."
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE nexus_monitoring;
CREATE USER nexus_user WITH ENCRYPTED PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE nexus_monitoring TO nexus_user;
ALTER USER nexus_user CREATEDB;
\q
EOF
    
    success "Database setup completed"
}

# Clone repository
clone_repository() {
    info "Cloning repository..."
    
    if [[ -d "$APP_DIR/.git" ]]; then
        info "Repository already exists, pulling latest changes..."
        cd "$APP_DIR"
        sudo -u "$APP_USER" git pull
    else
        sudo -u "$APP_USER" git clone https://github.com/your-repo/nexus-monitoring-portal.git "$APP_DIR"
    fi
    
    success "Repository cloned/updated successfully"
}

# Setup backend
setup_backend() {
    info "Setting up backend..."
    
    cd "$APP_DIR/backend"
    
    # Create virtual environment
    sudo -u "$APP_USER" python3 -m venv venv
    
    # Install dependencies
    sudo -u "$APP_USER" ./venv/bin/pip install --upgrade pip
    sudo -u "$APP_USER" ./venv/bin/pip install -r requirements.txt
    
    # Copy environment file
    if [[ ! -f .env.production ]]; then
        sudo -u "$APP_USER" cp .env.production.template .env.production
        warning "Please edit $APP_DIR/backend/.env.production with your configuration"
    fi
    
    success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    info "Setting up frontend..."
    
    cd "$APP_DIR/frontend"
    
    # Install dependencies
    sudo -u "$APP_USER" npm install
    
    # Copy environment file
    if [[ ! -f .env.production ]]; then
        sudo -u "$APP_USER" cp .env.production.template .env.production
        warning "Please edit $APP_DIR/frontend/.env.production with your configuration"
    fi
    
    # Build frontend
    sudo -u "$APP_USER" npm run build
    
    success "Frontend setup completed"
}

# Install systemd services
install_services() {
    info "Installing systemd services..."
    
    # Copy service files
    sudo cp "$APP_DIR/deployment/systemd/"*.service /etc/systemd/system/
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable services
    sudo systemctl enable nexus-backend.service
    sudo systemctl enable nexus-frontend.service
    sudo systemctl enable nexus-worker.service
    sudo systemctl enable nexus-scheduler.service
    
    success "Systemd services installed"
}

# Setup Nginx
setup_nginx() {
    info "Setting up Nginx..."
    
    # Copy Nginx configuration
    sudo cp "$APP_DIR/deployment/nginx/nexus-monitoring.conf" /etc/nginx/sites-available/
    
    # Create symlink
    sudo ln -sf /etc/nginx/sites-available/nexus-monitoring.conf /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    success "Nginx setup completed"
}

# Run database migrations
run_migrations() {
    info "Running database migrations..."
    
    cd "$APP_DIR/backend"
    sudo -u "$APP_USER" ./venv/bin/alembic upgrade head
    
    success "Database migrations completed"
}

# Start services
start_services() {
    info "Starting services..."
    
    sudo systemctl start nexus-backend
    sudo systemctl start nexus-frontend
    sudo systemctl start nexus-worker
    sudo systemctl start nexus-scheduler
    
    # Check service status
    sleep 5
    
    local services=("nexus-backend" "nexus-frontend" "nexus-worker" "nexus-scheduler")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            success "$service is running"
        else
            error "$service failed to start"
        fi
    done
}

# Main deployment function
main() {
    info "Starting Nexus Monitoring Portal deployment..."
    
    check_root
    check_requirements
    create_app_user
    install_dependencies
    install_nodejs
    install_python
    install_postgresql
    install_redis
    setup_database
    clone_repository
    setup_backend
    setup_frontend
    install_services
    setup_nginx
    run_migrations
    start_services
    
    success "Deployment completed successfully!"
    info "Please configure your environment files and SSL certificates"
    info "Backend: $APP_DIR/backend/.env.production"
    info "Frontend: $APP_DIR/frontend/.env.production"
    info "SSL: Run 'sudo certbot --nginx -d your-domain.com'"
}

# Run main function
main "$@"