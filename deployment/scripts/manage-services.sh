#!/bin/bash

# Nexus Monitoring Portal - Service Management Script
# This script provides easy management of all application services

set -e

# Configuration
SERVICES=("nexus-backend" "nexus-frontend" "nexus-worker" "nexus-scheduler")
LOG_FILE="/var/log/nexus/service-management.log"

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
}

# Show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|enable|disable|reload}"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  status    - Show status of all services"
    echo "  logs      - Show logs for all services"
    echo "  enable    - Enable all services to start on boot"
    echo "  disable   - Disable all services from starting on boot"
    echo "  reload    - Reload systemd configuration"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs"
}

# Start services
start_services() {
    info "Starting all services..."
    
    for service in "${SERVICES[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            info "$service is already running"
        else
            sudo systemctl start "$service"
            sleep 2
            
            if sudo systemctl is-active --quiet "$service"; then
                success "Started $service"
            else
                error "Failed to start $service"
                return 1
            fi
        fi
    done
    
    success "All services started successfully"
}

# Stop services
stop_services() {
    info "Stopping all services..."
    
    # Stop in reverse order
    local reversed_services=()
    for ((i=${#SERVICES[@]}-1; i>=0; i--)); do
        reversed_services+=("${SERVICES[i]}")
    done
    
    for service in "${reversed_services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            sudo systemctl stop "$service"
            success "Stopped $service"
        else
            info "$service is not running"
        fi
    done
    
    success "All services stopped"
}

# Restart services
restart_services() {
    info "Restarting all services..."
    
    stop_services
    sleep 3
    start_services
    
    success "All services restarted successfully"
}

# Show service status
show_status() {
    info "Service Status:"
    echo ""
    
    for service in "${SERVICES[@]}"; do
        local status=$(sudo systemctl is-active "$service" 2>/dev/null || echo "inactive")
        local enabled=$(sudo systemctl is-enabled "$service" 2>/dev/null || echo "disabled")
        
        case $status in
            "active")
                echo -e "  ${GREEN}●${NC} $service: ${GREEN}$status${NC} (${enabled})"
                ;;
            "inactive")
                echo -e "  ${RED}●${NC} $service: ${RED}$status${NC} (${enabled})"
                ;;
            "failed")
                echo -e "  ${RED}✗${NC} $service: ${RED}$status${NC} (${enabled})"
                ;;
            *)
                echo -e "  ${YELLOW}?${NC} $service: ${YELLOW}$status${NC} (${enabled})"
                ;;
        esac
    done
    
    echo ""
    
    # Show system resources
    info "System Resources:"
    echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "  Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
    echo "  Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
}

# Show logs
show_logs() {
    local lines=${2:-50}
    
    info "Showing last $lines lines of logs for all services..."
    echo ""
    
    for service in "${SERVICES[@]}"; do
        echo -e "${BLUE}=== $service ===${NC}"
        sudo journalctl -u "$service" -n "$lines" --no-pager
        echo ""
    done
}

# Enable services
enable_services() {
    info "Enabling all services..."
    
    for service in "${SERVICES[@]}"; do
        sudo systemctl enable "$service"
        success "Enabled $service"
    done
    
    success "All services enabled"
}

# Disable services
disable_services() {
    info "Disabling all services..."
    
    for service in "${SERVICES[@]}"; do
        sudo systemctl disable "$service"
        success "Disabled $service"
    done
    
    success "All services disabled"
}

# Reload systemd
reload_systemd() {
    info "Reloading systemd configuration..."
    
    sudo systemctl daemon-reload
    
    success "Systemd configuration reloaded"
}

# Health check
health_check() {
    info "Performing health check..."
    
    local all_healthy=true
    
    # Check backend API
    if curl -f -s http://localhost:8000/api/health > /dev/null 2>&1; then
        success "Backend API is healthy"
    else
        error "Backend API health check failed"
        all_healthy=false
    fi
    
    # Check frontend
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend is healthy"
    else
        error "Frontend health check failed"
        all_healthy=false
    fi
    
    # Check Redis
    if redis-cli ping > /dev/null 2>&1; then
        success "Redis is healthy"
    else
        error "Redis health check failed"
        all_healthy=false
    fi
    
    # Check PostgreSQL
    if sudo -u postgres psql -c "SELECT 1;" nexus_monitoring > /dev/null 2>&1; then
        success "PostgreSQL is healthy"
    else
        error "PostgreSQL health check failed"
        all_healthy=false
    fi
    
    if [[ "$all_healthy" == true ]]; then
        success "All health checks passed"
        return 0
    else
        error "Some health checks failed"
        return 1
    fi
}

# Monitor services
monitor_services() {
    info "Monitoring services (Press Ctrl+C to stop)..."
    
    while true; do
        clear
        echo "Nexus Monitoring Portal - Service Monitor"
        echo "$(date)"
        echo ""
        
        show_status
        
        echo ""
        info "Refreshing in 5 seconds..."
        sleep 5
    done
}

# Main function
main() {
    case "${1:-}" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$@"
            ;;
        "enable")
            enable_services
            ;;
        "disable")
            disable_services
            ;;
        "reload")
            reload_systemd
            ;;
        "health")
            health_check
            ;;
        "monitor")
            monitor_services
            ;;
        "help" | "--help" | "-h")
            show_usage
            ;;
        "")
            show_usage
            exit 1
            ;;
        *)
            error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"