#!/bin/bash

# Nexus Monitoring Portal - Update Script
# This script handles updates to the monitoring portal

set -e  # Exit on any error

# Configuration
APP_NAME="nexus-monitoring"
APP_USER="nexus"
APP_DIR="/home/$APP_USER/monitoring-portal"
BACKUP_DIR="/var/backups/nexus"
LOG_FILE="/var/log/nexus/update.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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

# Check if running as correct user
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Create backup
create_backup() {
    info "Creating backup..."
    
    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"
    
    # Backup application directory
    sudo tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)"
    
    # Backup database
    sudo -u postgres pg_dump nexus_monitoring > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    # Backup environment files
    sudo cp "$APP_DIR/backend/.env.production" "$BACKUP_DIR/backend_env_$TIMESTAMP.bak" 2>/dev/null || true
    sudo cp "$APP_DIR/frontend/.env.production" "$BACKUP_DIR/frontend_env_$TIMESTAMP.bak" 2>/dev/null || true
    
    # Keep only last 5 backups
    sudo find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -type f | sort -r | tail -n +6 | sudo xargs rm -f
    sudo find "$BACKUP_DIR" -name "db_backup_*.sql" -type f | sort -r | tail -n +6 | sudo xargs rm -f
    
    success "Backup created successfully"
}

# Stop services
stop_services() {
    info "Stopping services..."
    
    local services=("nexus-scheduler" "nexus-worker" "nexus-frontend" "nexus-backend")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            sudo systemctl stop "$service"
            info "Stopped $service"
        else
            info "$service is not running"
        fi
    done
    
    success "Services stopped"
}

# Start services
start_services() {
    info "Starting services..."
    
    local services=("nexus-backend" "nexus-frontend" "nexus-worker" "nexus-scheduler")
    for service in "${services[@]}"; do
        sudo systemctl start "$service"
        sleep 2
        
        if sudo systemctl is-active --quiet "$service"; then
            success "Started $service"
        else
            error "Failed to start $service"
        fi
    done
    
    success "All services started successfully"
}

# Update code
update_code() {
    info "Updating code..."
    
    cd "$APP_DIR"
    
    # Fetch latest changes
    sudo -u "$APP_USER" git fetch origin
    
    # Get current and latest commit
    local current_commit=$(sudo -u "$APP_USER" git rev-parse HEAD)
    local latest_commit=$(sudo -u "$APP_USER" git rev-parse origin/main)
    
    if [[ "$current_commit" == "$latest_commit" ]]; then
        info "Already up to date"
        return 0
    fi
    
    # Pull latest changes
    sudo -u "$APP_USER" git pull origin main
    
    success "Code updated successfully"
}

# Update backend dependencies
update_backend() {
    info "Updating backend dependencies..."
    
    cd "$APP_DIR/backend"
    
    # Update pip
    sudo -u "$APP_USER" ./venv/bin/pip install --upgrade pip
    
    # Update dependencies
    sudo -u "$APP_USER" ./venv/bin/pip install -r requirements.txt --upgrade
    
    success "Backend dependencies updated"
}

# Update frontend dependencies
update_frontend() {
    info "Updating frontend dependencies..."
    
    cd "$APP_DIR/frontend"
    
    # Update dependencies
    sudo -u "$APP_USER" npm update
    
    # Rebuild frontend
    sudo -u "$APP_USER" npm run build
    
    success "Frontend updated and rebuilt"
}

# Run database migrations
run_migrations() {
    info "Running database migrations..."
    
    cd "$APP_DIR/backend"
    
    # Check if there are pending migrations
    local migration_output=$(sudo -u "$APP_USER" ./venv/bin/alembic current 2>&1 || true)
    
    if echo "$migration_output" | grep -q "Can't locate revision"; then
        warning "Database schema might be out of sync"
    fi
    
    # Run migrations
    sudo -u "$APP_USER" ./venv/bin/alembic upgrade head
    
    success "Database migrations completed"
}

# Update systemd services
update_services() {
    info "Updating systemd services..."
    
    # Check if service files have changed
    local services_changed=false
    
    for service_file in "$APP_DIR/deployment/systemd/"*.service; do
        local service_name=$(basename "$service_file")
        if ! sudo cmp -s "$service_file" "/etc/systemd/system/$service_name"; then
            sudo cp "$service_file" "/etc/systemd/system/"
            services_changed=true
            info "Updated $service_name"
        fi
    done
    
    if [[ "$services_changed" == true ]]; then
        sudo systemctl daemon-reload
        success "Systemd services updated"
    else
        info "No service file changes detected"
    fi
}

# Update Nginx configuration
update_nginx() {
    info "Updating Nginx configuration..."
    
    local nginx_config="$APP_DIR/deployment/nginx/nexus-monitoring.conf"
    local nginx_target="/etc/nginx/sites-available/nexus-monitoring.conf"
    
    if ! sudo cmp -s "$nginx_config" "$nginx_target"; then
        # Test new configuration
        sudo cp "$nginx_config" "$nginx_target.new"
        
        if sudo nginx -t -c /dev/stdin <<< "$(sudo cat /etc/nginx/nginx.conf | sed 's|include /etc/nginx/sites-enabled/\*;|include '$nginx_target'.new;|')"; then
            sudo mv "$nginx_target.new" "$nginx_target"
            sudo systemctl reload nginx
            success "Nginx configuration updated"
        else
            sudo rm "$nginx_target.new"
            warning "New Nginx configuration is invalid, keeping current configuration"
        fi
    else
        info "No Nginx configuration changes detected"
    fi
}

# Health check
health_check() {
    info "Performing health check..."
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if curl -f -s http://localhost:8000/api/health > /dev/null; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f -s http://localhost:3000 > /dev/null; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
    fi
    
    # Check service status
    local services=("nexus-backend" "nexus-frontend" "nexus-worker" "nexus-scheduler")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            success "$service is running"
        else
            error "$service is not running"
        fi
    done
    
    success "Health check completed successfully"
}

# Rollback function
rollback() {
    error "Update failed. Starting rollback..."
    
    # Stop services
    stop_services
    
    # Restore from backup
    local latest_backup=$(sudo find "$BACKUP_DIR" -name "app_backup_*.tar.gz" -type f | sort -r | head -n 1)
    
    if [[ -n "$latest_backup" ]]; then
        info "Restoring from backup: $latest_backup"
        sudo rm -rf "$APP_DIR"
        sudo tar -xzf "$latest_backup" -C "$(dirname $APP_DIR)"
        sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
        
        # Restore database
        local latest_db_backup=$(sudo find "$BACKUP_DIR" -name "db_backup_*.sql" -type f | sort -r | head -n 1)
        if [[ -n "$latest_db_backup" ]]; then
            sudo -u postgres psql nexus_monitoring < "$latest_db_backup"
        fi
        
        # Start services
        start_services
        
        error "Rollback completed. Please check the logs and try updating again."
    else
        error "No backup found for rollback. Manual intervention required."
    fi
}

# Main update function
main() {
    info "Starting Nexus Monitoring Portal update..."
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_user
    create_backup
    stop_services
    update_code
    update_backend
    update_frontend
    run_migrations
    update_services
    update_nginx
    start_services
    health_check
    
    # Remove trap
    trap - ERR
    
    success "Update completed successfully!"
    info "Application is now running the latest version"
}

# Handle command line arguments
case "${1:-}" in
    "--rollback")
        info "Manual rollback requested"
        rollback
        ;;
    "--health-check")
        health_check
        ;;
    "--backup-only")
        create_backup
        ;;
    *)
        main "$@"
        ;;
esac