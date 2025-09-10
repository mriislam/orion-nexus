# SNMP Disk Monitoring Configuration Guide

This guide explains how to configure SNMP on Linux servers to expose disk storage information for monitoring.

## Problem

By default, many Linux servers don't expose disk storage information via SNMP, resulting in:
- Disk usage showing as 0 in the monitoring portal
- Disk status showing as "SNMP disk monitoring not configured"
- Error message: "Device does not expose disk data via SNMP"

## Solution

Configure the SNMP daemon (snmpd) to expose disk information using the UCD-SNMP-MIB.

## Step-by-Step Configuration

### 1. Install SNMP Daemon (if not already installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install snmpd snmp-mibs-downloader
```

**CentOS/RHEL/Rocky Linux:**
```bash
sudo yum install net-snmp net-snmp-utils
# or for newer versions:
sudo dnf install net-snmp net-snmp-utils
```

### 2. Configure SNMP Daemon

Edit the SNMP configuration file:
```bash
sudo nano /etc/snmp/snmpd.conf
```

### 3. Add Disk Monitoring Configuration

Add the following lines to `/etc/snmp/snmpd.conf`:

```bash
# Community string configuration (change 'public' to your preferred community)
rocommunity public localhost
rocommunity public 192.168.0.0/16  # Adjust network range as needed

# System information
sysLocation    "Your Server Location"
sysContact     "admin@yourcompany.com"
sysServices    72

# Disk monitoring configuration
# Monitor root filesystem
disk / 10000

# Monitor additional filesystems (add as needed)
disk /home 5000
disk /var 5000
disk /tmp 1000

# Load average monitoring
load 12 14 14

# Process monitoring (optional)
proc sshd
proc httpd 5 10

# Enable UCD-SNMP-MIB disk table
extend .1.3.6.1.4.1.2021.50 disk-usage /bin/df -h
```

### 4. Security Configuration (Recommended)

For better security, configure SNMPv3 instead of SNMPv2c:

```bash
# Create SNMPv3 user
sudo net-snmp-create-v3-user -ro -a SHA -x AES -A "your_auth_password" -X "your_priv_password" monitoring_user

# Add to snmpd.conf
rouser monitoring_user
```

### 5. Restart SNMP Service

```bash
# Ubuntu/Debian
sudo systemctl restart snmpd
sudo systemctl enable snmpd

# CentOS/RHEL
sudo systemctl restart snmpd
sudo systemctl enable snmpd
```

### 6. Verify Configuration

Test SNMP disk monitoring locally:

```bash
# Test SNMPv2c
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9

# Test disk paths
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.2

# Test disk sizes
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.6
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.7
```

### 7. Firewall Configuration

Ensure SNMP port is accessible:

```bash
# UFW (Ubuntu)
sudo ufw allow from 192.168.0.0/16 to any port 161

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=161/udp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p udp --dport 161 -s 192.168.0.0/16 -j ACCEPT
```

## Configuration Examples

### Basic Configuration for Web Server
```bash
# /etc/snmp/snmpd.conf
rocommunity public 192.168.1.0/24
sysLocation "Data Center Rack 42"
sysContact "webmaster@company.com"

# Monitor critical filesystems
disk / 5000          # Root filesystem, alert if less than 5GB free
disk /var 2000       # Var filesystem, alert if less than 2GB free
disk /var/log 1000   # Log filesystem, alert if less than 1GB free

load 8 12 12         # Load average thresholds
```

### Advanced Configuration for Database Server
```bash
# /etc/snmp/snmpd.conf
rocommunity dbmonitor 192.168.1.100
sysLocation "Database Server Room"
sysContact "dba@company.com"

# Monitor database-specific filesystems
disk / 10000
disk /var 5000
disk /var/lib/mysql 20000    # MySQL data directory
disk /var/log 2000
disk /tmp 5000

# Database processes
proc mysqld 1 1
proc postgres 1 5

load 4 8 8
```

## Troubleshooting

### Common Issues

1. **SNMP service not running:**
   ```bash
   sudo systemctl status snmpd
   sudo systemctl start snmpd
   ```

2. **Permission denied errors:**
   ```bash
   sudo chown snmp:snmp /etc/snmp/snmpd.conf
   sudo chmod 600 /etc/snmp/snmpd.conf
   ```

3. **Firewall blocking SNMP:**
   - Check firewall rules
   - Ensure port 161/UDP is open
   - Verify source IP ranges

4. **Community string mismatch:**
   - Verify community string in monitoring portal matches snmpd.conf
   - Check for typos in community string

### Testing Commands

```bash
# Test basic connectivity
snmpget -v2c -c public localhost 1.3.6.1.2.1.1.1.0

# Test disk monitoring
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.2  # Disk paths
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.6  # Total size
snmpwalk -v2c -c public localhost 1.3.6.1.4.1.2021.9.1.7  # Available space

# Test from monitoring server
snmpwalk -v2c -c public SERVER_IP 1.3.6.1.4.1.2021.9
```

## Monitoring Portal Configuration

After configuring SNMP on your servers:

1. **Update device settings** in the monitoring portal:
   - Verify SNMP community string matches
   - Ensure SNMP version is set correctly
   - Check SNMP port (default: 161)

2. **Wait for next polling cycle** or manually trigger device polling

3. **Verify disk data** appears in the device dashboard

## Security Best Practices

1. **Use SNMPv3** instead of SNMPv2c when possible
2. **Restrict community strings** to specific IP ranges
3. **Use strong community strings** (not "public")
4. **Limit filesystem exposure** to only necessary mount points
5. **Regular security updates** for SNMP packages
6. **Monitor SNMP logs** for unauthorized access attempts

## Additional Resources

- [Net-SNMP Documentation](http://www.net-snmp.org/docs/)
- [UCD-SNMP-MIB Reference](http://www.net-snmp.org/docs/mibs/ucdavis.html)
- [SNMP Security Guide](http://www.net-snmp.org/wiki/index.php/TUT:SNMPv3_Options)

---

**Note:** After making these changes, it may take up to 5 minutes for the monitoring portal to detect and display the new disk information during the next polling cycle.