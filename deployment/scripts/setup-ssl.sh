#!/bin/bash

# Nexus Monitoring Portal - SSL Setup Script
# This script helps configure SSL certificates for HTTPS

set -e

# Configuration
LOG_FILE="/var/log/nexus/ssl-setup.log"
NGINX_CONFIG="/etc/nginx/sites-available/nexus-monitoring.conf"
CERTBOT_DIR="/etc/letsencrypt"
WEBROOT_DIR="/var/www/certbot"

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

# Show usage
show_usage() {
    echo "Usage: $0 {letsencrypt|self-signed|import|renew|status} [domain]"
    echo ""
    echo "Commands:"
    echo "  letsencrypt <domain>  - Setup Let's Encrypt SSL certificate"
    echo "  self-signed <domain>  - Create self-signed SSL certificate"
    echo "  import <domain>       - Import existing SSL certificate"
    echo "  renew                 - Renew Let's Encrypt certificates"
    echo "  status                - Show SSL certificate status"
    echo ""
    echo "Examples:"
    echo "  $0 letsencrypt example.com"
    echo "  $0 self-signed localhost"
    echo "  $0 renew"
    echo "  $0 status"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Validate domain
validate_domain() {
    local domain="$1"
    
    if [[ -z "$domain" ]]; then
        error "Domain name is required"
    fi
    
    # Basic domain validation
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        error "Invalid domain name: $domain"
    fi
    
    info "Domain validation passed: $domain"
}

# Setup webroot directory
setup_webroot() {
    info "Setting up webroot directory..."
    
    mkdir -p "$WEBROOT_DIR"
    chown -R www-data:www-data "$WEBROOT_DIR"
    chmod 755 "$WEBROOT_DIR"
    
    success "Webroot directory setup completed"
}

# Update Nginx configuration for domain
update_nginx_domain() {
    local domain="$1"
    
    info "Updating Nginx configuration for domain: $domain"
    
    # Backup current configuration
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.bak.$(date +%Y%m%d_%H%M%S)"
    
    # Replace placeholder domain
    sed -i "s/your-domain\.com/$domain/g" "$NGINX_CONFIG"
    
    # Test Nginx configuration
    if nginx -t; then
        systemctl reload nginx
        success "Nginx configuration updated and reloaded"
    else
        error "Nginx configuration test failed"
    fi
}

# Setup Let's Encrypt SSL
setup_letsencrypt() {
    local domain="$1"
    
    info "Setting up Let's Encrypt SSL for domain: $domain"
    
    validate_domain "$domain"
    setup_webroot
    
    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        info "Installing certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Check if domain resolves to this server
    local server_ip=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
    local domain_ip=$(dig +short "$domain" | tail -n1)
    
    if [[ "$server_ip" != "$domain_ip" ]]; then
        warning "Domain $domain does not resolve to this server IP ($server_ip vs $domain_ip)"
        warning "Make sure your DNS is configured correctly before proceeding"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "SSL setup cancelled"
        fi
    fi
    
    # Update Nginx configuration
    update_nginx_domain "$domain"
    
    # Obtain certificate
    info "Obtaining SSL certificate from Let's Encrypt..."
    
    if certbot --nginx -d "$domain" -d "www.$domain" --non-interactive --agree-tos --email admin@"$domain" --redirect; then
        success "Let's Encrypt SSL certificate obtained successfully"
        
        # Setup auto-renewal
        setup_auto_renewal
        
        # Test SSL
        test_ssl "$domain"
    else
        error "Failed to obtain Let's Encrypt certificate"
    fi
}

# Create self-signed SSL certificate
setup_self_signed() {
    local domain="$1"
    
    info "Creating self-signed SSL certificate for domain: $domain"
    
    validate_domain "$domain"
    
    # Create SSL directory
    local ssl_dir="/etc/ssl/nexus"
    mkdir -p "$ssl_dir"
    
    # Generate private key
    openssl genrsa -out "$ssl_dir/$domain.key" 2048
    
    # Generate certificate signing request
    openssl req -new -key "$ssl_dir/$domain.key" -out "$ssl_dir/$domain.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=$domain"
    
    # Generate self-signed certificate
    openssl x509 -req -days 365 -in "$ssl_dir/$domain.csr" -signkey "$ssl_dir/$domain.key" -out "$ssl_dir/$domain.crt"
    
    # Set permissions
    chmod 600 "$ssl_dir/$domain.key"
    chmod 644 "$ssl_dir/$domain.crt"
    
    # Update Nginx configuration for self-signed certificate
    update_nginx_domain "$domain"
    
    # Update SSL certificate paths in Nginx config
    sed -i "s|/etc/letsencrypt/live/$domain/fullchain.pem|$ssl_dir/$domain.crt|g" "$NGINX_CONFIG"
    sed -i "s|/etc/letsencrypt/live/$domain/privkey.pem|$ssl_dir/$domain.key|g" "$NGINX_CONFIG"
    sed -i "s|/etc/letsencrypt/live/$domain/chain.pem|$ssl_dir/$domain.crt|g" "$NGINX_CONFIG"
    
    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        success "Self-signed SSL certificate created and configured"
        warning "Self-signed certificates are not trusted by browsers. Use only for testing."
    else
        error "Nginx configuration test failed"
    fi
}

# Import existing SSL certificate
import_ssl() {
    local domain="$1"
    
    info "Importing existing SSL certificate for domain: $domain"
    
    validate_domain "$domain"
    
    # Create SSL directory
    local ssl_dir="/etc/ssl/nexus"
    mkdir -p "$ssl_dir"
    
    echo "Please provide the following files:"
    echo "1. Certificate file (.crt or .pem)"
    echo "2. Private key file (.key)"
    echo "3. Certificate chain file (optional)"
    echo ""
    
    read -p "Enter path to certificate file: " cert_file
    read -p "Enter path to private key file: " key_file
    read -p "Enter path to certificate chain file (optional): " chain_file
    
    # Validate files
    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
    fi
    
    if [[ ! -f "$key_file" ]]; then
        error "Private key file not found: $key_file"
    fi
    
    # Copy files
    cp "$cert_file" "$ssl_dir/$domain.crt"
    cp "$key_file" "$ssl_dir/$domain.key"
    
    if [[ -n "$chain_file" ]] && [[ -f "$chain_file" ]]; then
        cp "$chain_file" "$ssl_dir/$domain.chain.pem"
    fi
    
    # Set permissions
    chmod 600 "$ssl_dir/$domain.key"
    chmod 644 "$ssl_dir/$domain.crt"
    [[ -f "$ssl_dir/$domain.chain.pem" ]] && chmod 644 "$ssl_dir/$domain.chain.pem"
    
    # Update Nginx configuration
    update_nginx_domain "$domain"
    
    # Update SSL certificate paths in Nginx config
    sed -i "s|/etc/letsencrypt/live/$domain/fullchain.pem|$ssl_dir/$domain.crt|g" "$NGINX_CONFIG"
    sed -i "s|/etc/letsencrypt/live/$domain/privkey.pem|$ssl_dir/$domain.key|g" "$NGINX_CONFIG"
    
    if [[ -f "$ssl_dir/$domain.chain.pem" ]]; then
        sed -i "s|/etc/letsencrypt/live/$domain/chain.pem|$ssl_dir/$domain.chain.pem|g" "$NGINX_CONFIG"
    fi
    
    # Test and reload Nginx
    if nginx -t; then
        systemctl reload nginx
        success "SSL certificate imported and configured successfully"
        test_ssl "$domain"
    else
        error "Nginx configuration test failed"
    fi
}

# Setup auto-renewal for Let's Encrypt
setup_auto_renewal() {
    info "Setting up auto-renewal for Let's Encrypt certificates..."
    
    # Create renewal script
    cat > /etc/cron.daily/certbot-renew << 'EOF'
#!/bin/bash
# Auto-renew Let's Encrypt certificates

/usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    chmod +x /etc/cron.daily/certbot-renew
    
    # Test renewal
    if certbot renew --dry-run; then
        success "Auto-renewal setup completed and tested"
    else
        warning "Auto-renewal test failed, but cron job is installed"
    fi
}

# Renew Let's Encrypt certificates
renew_certificates() {
    info "Renewing Let's Encrypt certificates..."
    
    if command -v certbot &> /dev/null; then
        if certbot renew --post-hook "systemctl reload nginx"; then
            success "Certificates renewed successfully"
        else
            error "Certificate renewal failed"
        fi
    else
        error "Certbot is not installed"
    fi
}

# Test SSL configuration
test_ssl() {
    local domain="$1"
    
    info "Testing SSL configuration for domain: $domain"
    
    # Test HTTPS connection
    if curl -I -s "https://$domain" > /dev/null 2>&1; then
        success "HTTPS connection test passed"
    else
        warning "HTTPS connection test failed"
    fi
    
    # Check certificate expiration
    local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [[ -n "$expiry_date" ]]; then
        info "Certificate expires: $expiry_date"
    fi
}

# Show SSL status
show_ssl_status() {
    info "SSL Certificate Status:"
    echo ""
    
    # Check Let's Encrypt certificates
    if [[ -d "$CERTBOT_DIR/live" ]]; then
        info "Let's Encrypt Certificates:"
        for cert_dir in "$CERTBOT_DIR/live/"*/; do
            if [[ -d "$cert_dir" ]]; then
                local domain=$(basename "$cert_dir")
                local expiry=$(openssl x509 -noout -dates -in "$cert_dir/cert.pem" 2>/dev/null | grep notAfter | cut -d= -f2 || echo "Unknown")
                echo "  - $domain: Expires $expiry"
            fi
        done
        echo ""
    fi
    
    # Check custom certificates
    if [[ -d "/etc/ssl/nexus" ]]; then
        info "Custom Certificates:"
        for cert_file in /etc/ssl/nexus/*.crt; do
            if [[ -f "$cert_file" ]]; then
                local domain=$(basename "$cert_file" .crt)
                local expiry=$(openssl x509 -noout -dates -in "$cert_file" 2>/dev/null | grep notAfter | cut -d= -f2 || echo "Unknown")
                echo "  - $domain: Expires $expiry"
            fi
        done
        echo ""
    fi
    
    # Check Nginx SSL configuration
    if nginx -t 2>/dev/null; then
        success "Nginx SSL configuration is valid"
    else
        error "Nginx SSL configuration has errors"
    fi
}

# Main function
main() {
    case "${1:-}" in
        "letsencrypt")
            check_root
            setup_letsencrypt "$2"
            ;;
        "self-signed")
            check_root
            setup_self_signed "$2"
            ;;
        "import")
            check_root
            import_ssl "$2"
            ;;
        "renew")
            check_root
            renew_certificates
            ;;
        "status")
            show_ssl_status
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