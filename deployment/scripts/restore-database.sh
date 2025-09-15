#!/bin/bash

# Database Restore Script for Nexus Monitoring Portal
# This script restores MongoDB database from backup files

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/var/backups/nexus-monitoring"
LOG_FILE="/var/log/nexus/restore.log"

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
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] <backup_file>"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -l, --list              List available backup files"
    echo "  -f, --force             Force restore without confirmation"
    echo "  --drop-existing         Drop existing database before restore"
    echo ""
    echo "Examples:"
    echo "  $0 nexus_backup_20240115_143022.tar.gz"
    echo "  $0 --list"
    echo "  $0 --force --drop-existing nexus_backup_20240115_143022.tar.gz"
}

# List available backups
list_backups() {
    info "Available backup files in $BACKUP_DIR:"
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warn "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi
    
    local backup_files=("$BACKUP_DIR"/nexus_backup_*.tar.gz)
    
    if [[ ${#backup_files[@]} -eq 0 || ! -f "${backup_files[0]}" ]]; then
        warn "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    printf "%-40s %-15s %-20s\n" "Backup File" "Size" "Date Created"
    printf "%-40s %-15s %-20s\n" "$(printf '%*s' 40 '' | tr ' ' '-')" "$(printf '%*s' 15 '' | tr ' ' '-')" "$(printf '%*s' 20 '' | tr ' ' '-')"
    
    for backup in "${backup_files[@]}"; do
        if [[ -f "$backup" ]]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
            printf "%-40s %-15s %-20s\n" "$filename" "$size" "$date"
        fi
    done
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
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

# Validate backup file
validate_backup() {
    local backup_file="$1"
    
    log "Validating backup file: $backup_file"
    
    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    # Check if file is not empty
    if [[ ! -s "$backup_file" ]]; then
        error "Backup file is empty: $backup_file"
        exit 1
    fi
    
    # Test tar file integrity
    if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
        error "Backup file is corrupted: $backup_file"
        exit 1
    fi
    
    success "Backup file validation passed"
}

# Create pre-restore backup
create_pre_restore_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pre_backup_name="pre_restore_backup_${timestamp}"
    local pre_backup_path="${BACKUP_DIR}/${pre_backup_name}"
    
    warn "Creating pre-restore backup of current database..."
    
    local mongodump_cmd="mongodump"
    local dump_args="--host ${MONGO_HOST}:${MONGO_PORT} --db ${MONGO_DB} --out ${pre_backup_path}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        dump_args="$dump_args --username ${MONGO_USER} --password ${MONGO_PASSWORD}"
    fi
    
    if $mongodump_cmd $dump_args >/dev/null 2>&1; then
        cd "$BACKUP_DIR"
        tar -czf "${pre_backup_name}.tar.gz" "$pre_backup_name" >/dev/null 2>&1
        rm -rf "$pre_backup_name"
        success "Pre-restore backup created: ${pre_backup_name}.tar.gz"
    else
        warn "Failed to create pre-restore backup (continuing anyway)"
    fi
}

# Drop existing database
drop_database() {
    warn "Dropping existing database: $MONGO_DB"
    
    local mongo_cmd="mongosh"
    local connection_string="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        connection_string="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    fi
    
    if $mongo_cmd "$connection_string" --eval "db.dropDatabase()" >/dev/null 2>&1; then
        success "Database dropped successfully"
    else
        error "Failed to drop database"
        exit 1
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    local temp_dir="/tmp/nexus_restore_$(date +%s)"
    
    log "Restoring database from: $backup_file"
    
    # Extract backup
    mkdir -p "$temp_dir"
    if ! tar -xzf "$backup_file" -C "$temp_dir"; then
        error "Failed to extract backup file"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Find the database directory
    local db_dir=$(find "$temp_dir" -name "$MONGO_DB" -type d | head -1)
    if [[ -z "$db_dir" ]]; then
        error "Database directory not found in backup"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Restore using mongorestore
    local mongorestore_cmd="mongorestore"
    local restore_args="--host ${MONGO_HOST}:${MONGO_PORT} --db ${MONGO_DB} ${db_dir}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        restore_args="--username ${MONGO_USER} --password ${MONGO_PASSWORD} $restore_args"
    fi
    
    if $mongorestore_cmd $restore_args; then
        success "Database restored successfully"
    else
        error "Failed to restore database"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
}

# Verify restore
verify_restore() {
    log "Verifying database restore..."
    
    local mongo_cmd="mongosh"
    local connection_string="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    
    # Add authentication if provided
    if [[ -n "$MONGO_USER" && -n "$MONGO_PASSWORD" ]]; then
        connection_string="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
    fi
    
    # Check if database exists and has collections
    local collection_count=$($mongo_cmd "$connection_string" --eval "db.adminCommand('listCollections').cursor.firstBatch.length" --quiet 2>/dev/null || echo "0")
    
    if [[ "$collection_count" -gt 0 ]]; then
        success "Database restore verified - $collection_count collections found"
    else
        warn "Database appears to be empty after restore"
    fi
}

# Main execution
main() {
    local backup_file=""
    local force_restore=false
    local drop_existing=false
    local list_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            -f|--force)
                force_restore=true
                shift
                ;;
            --drop-existing)
                drop_existing=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done
    
    # Handle list option
    if [[ "$list_only" == true ]]; then
        list_backups
        exit 0
    fi
    
    # Check if backup file is provided
    if [[ -z "$backup_file" ]]; then
        error "Backup file not specified"
        show_usage
        exit 1
    fi
    
    # If backup file doesn't contain path, assume it's in backup directory
    if [[ "$backup_file" != /* ]]; then
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi
    
    log "Starting database restore process..."
    
    check_permissions
    check_mongodb
    validate_backup "$backup_file"
    
    # Confirmation prompt (unless forced)
    if [[ "$force_restore" != true ]]; then
        echo ""
        warn "This will restore the database '$MONGO_DB' from backup."
        if [[ "$drop_existing" == true ]]; then
            warn "The existing database will be DROPPED and replaced."
        fi
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Drop existing database if requested
    if [[ "$drop_existing" == true ]]; then
        drop_database
    fi
    
    # Restore database
    restore_database "$backup_file"
    verify_restore
    
    success "Database restore process completed successfully!"
    log "Database: $MONGO_DB"
    log "Host: ${MONGO_HOST}:${MONGO_PORT}"
    log "Restored from: $backup_file"
}

# Handle script interruption
trap 'error "Restore process interrupted"; exit 1' INT TERM

# Run main function
main "$@"