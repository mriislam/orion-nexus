#!/bin/bash

# Database Backup Script for Nexus Monitoring Portal
# This script creates backups of MongoDB database for production deployment

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/var/backups/nexus-monitoring"
LOG_FILE="/var/log/nexus/backup.log"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="nexus_backup_${DATE}"
RETENTION_DAYS=7

# Database configuration (can be overridden by environment variables)
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-nexus_monitoring}"
MONGO_USER="${MONGO_USER:-}"
MONGO_PASSWORD="${MONGO_PASSWORD:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Create necessary directories
setup_directories() {
    log "Setting up backup directories..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    chmod 755 "$(dirname "$LOG_FILE")"
    
    success "Directories created successfully"
}

# Check MongoDB connection
check_mongodb() {
    log "Checking MongoDB connection..."
    
    local mongo_cmd="mongosh"
    local connection_string="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        connection_string="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    fi
    
    # Test connection
    if ! $mongo_cmd "$connection_string" --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        error "Cannot connect to MongoDB at ${MONGO_HOST}:${MONGO_PORT}"
        exit 1
    fi
    
    success "MongoDB connection verified"
}

# Create database backup
create_backup() {
    log "Creating database backup: $BACKUP_NAME"
    
    local backup_path="${BACKUP_DIR}/${BACKUP_NAME}"
    local mongodump_cmd="mongodump"
    
    # Build mongodump command
    local dump_args="--host ${MONGO_HOST}:${MONGO_PORT} --db ${MONGO_DB} --out ${backup_path}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        dump_args="$dump_args --username ${MONGO_USER} --password ${MONGO_PASSWORD}"
    fi
    
    # Create backup
    if $mongodump_cmd $dump_args; then
        success "Database backup created at: $backup_path"
    else
        error "Failed to create database backup"
        exit 1
    fi
    
    # Compress backup
    log "Compressing backup..."
    cd "$BACKUP_DIR"
    if tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"; then
        rm -rf "$BACKUP_NAME"
        success "Backup compressed: ${BACKUP_NAME}.tar.gz"
    else
        error "Failed to compress backup"
        exit 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "nexus_backup_*.tar.gz" -mtime +$RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        success "Cleaned up $deleted_count old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    log "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    if [[ ! -s "$backup_file" ]]; then
        error "Backup file is empty: $backup_file"
        exit 1
    fi
    
    # Test tar file integrity
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        success "Backup integrity verified"
    else
        error "Backup file is corrupted: $backup_file"
        exit 1
    fi
    
    # Display backup size
    local size=$(du -h "$backup_file" | cut -f1)
    log "Backup size: $size"
}

# Display backup information
show_backup_info() {
    log "Backup completed successfully!"
    log "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    log "Database: $MONGO_DB"
    log "Host: ${MONGO_HOST}:${MONGO_PORT}"
    log "Timestamp: $DATE"
    
    # List recent backups
    log "Recent backups:"
    ls -lah "$BACKUP_DIR"/nexus_backup_*.tar.gz 2>/dev/null | tail -5 | while read -r line; do
        log "  $line"
    done
}

# Main execution
main() {
    log "Starting database backup process..."
    
    check_permissions
    setup_directories
    check_mongodb
    create_backup
    verify_backup
    cleanup_old_backups
    show_backup_info
    
    success "Database backup process completed successfully!"
}

# Handle script interruption
trap 'error "Backup process interrupted"; exit 1' INT TERM

# Run main function
main "$@"