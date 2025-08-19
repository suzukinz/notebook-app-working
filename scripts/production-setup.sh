#!/bin/bash
# Production Setup Script for NoteSpace with AI
# One-click deployment for production environments

set -e

# Configuration
APP_NAME="notescape-ai"
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
ENV="${NODE_ENV:-production}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"
REDIS_PASSWORD="${REDIS_PASSWORD:-$(openssl rand -base64 32)}"

echo "🚀 NoteSpace AI - Production Setup"
echo "==================================="
echo "Domain: $DOMAIN"
echo "Environment: $ENV"
echo "App Name: $APP_NAME"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  This script requires sudo privileges for system setup."
    echo "Please run: sudo $0 $@"
    exit 1
fi

# Parse command line arguments
COMMAND="${1:-full}"

# Function to install system dependencies
install_dependencies() {
    echo "📦 Installing system dependencies..."
    
    # Update system
    apt-get update
    apt-get upgrade -y
    
    # Install essential packages
    apt-get install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        logrotate
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $SUDO_USER
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install Node.js 18
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | cut -dv -f2)" -lt "18" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    echo "✅ System dependencies installed"
}

# Function to setup firewall
setup_firewall() {
    echo "🔥 Setting up firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    # SSH access
    ufw allow 22/tcp
    
    # HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Application ports (if needed for development)
    if [ "$ENV" != "production" ]; then
        ufw allow 3000/tcp  # React dev server
        ufw allow 11434/tcp # Ollama API
        ufw allow 8080/tcp  # AI services
    fi
    
    ufw --force enable
    
    echo "✅ Firewall configured"
}

# Function to setup fail2ban
setup_fail2ban() {
    echo "🛡️  Setting up fail2ban..."
    
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-dos]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 300
findtime = 300
bantime = 600
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    echo "✅ Fail2ban configured"
}

# Function to create application user
setup_app_user() {
    echo "👤 Setting up application user..."
    
    # Create app user if doesn't exist
    if ! id "$APP_NAME" &>/dev/null; then
        useradd -m -s /bin/bash $APP_NAME
        usermod -aG docker $APP_NAME
    fi
    
    # Create application directories
    mkdir -p /opt/$APP_NAME
    mkdir -p /var/log/$APP_NAME
    mkdir -p /etc/$APP_NAME
    
    chown -R $APP_NAME:$APP_NAME /opt/$APP_NAME
    chown -R $APP_NAME:$APP_NAME /var/log/$APP_NAME
    chown -R $APP_NAME:$APP_NAME /etc/$APP_NAME
    
    echo "✅ Application user configured"
}

# Function to setup SSL certificates
setup_ssl() {
    echo "🔐 Setting up SSL certificates..."
    
    if [ "$DOMAIN" != "localhost" ]; then
        # Stop nginx temporarily
        systemctl stop nginx
        
        # Get SSL certificate
        certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email "$EMAIL" \
            -d "$DOMAIN" \
            -d "api.$DOMAIN"
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        
        echo "✅ SSL certificates configured"
    else
        echo "⚠️  Skipping SSL setup for localhost"
    fi
}

# Function to configure Nginx
setup_nginx() {
    echo "🌐 Configuring Nginx..."
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create app configuration
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=auth:10m rate=1r/s;

# Upstream services
upstream app_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream ai_backend {
    server 127.0.0.1:3005;
    keepalive 16;
}

server {
    listen 80;
    server_name $DOMAIN api.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Static files with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @app;
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }
    
    # AI API routes
    location /ai/ {
        limit_req zone=api burst=10 nodelay;
        
        proxy_pass http://ai_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
    }
    
    # Auth routes with strict rate limiting
    location ~ ^/(auth|login|register|forgot-password) {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Main app
    location @app {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Default route
    location / {
        try_files \$uri \$uri/ @app;
    }
EOF

    # SSL configuration if certificates exist
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        cat >> /etc/nginx/sites-available/$APP_NAME << EOF
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN api.$DOMAIN;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Same location blocks as HTTP version above...
    # (content would be duplicated here)
EOF
    fi
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test configuration
    nginx -t
    systemctl reload nginx
    
    echo "✅ Nginx configured"
}

# Function to setup application environment
setup_app_environment() {
    echo "⚙️  Setting up application environment..."
    
    # Create production environment file
    cat > /etc/$APP_NAME/.env.production << EOF
# Application Configuration
NODE_ENV=production
PORT=3001
DOMAIN=$DOMAIN
APP_NAME=$APP_NAME

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$(openssl rand -base64 32)
CORTS_ORIGIN=https://$DOMAIN

# Database
DATABASE_URL=postgresql://notescape:$DB_PASSWORD@localhost:5432/notescape_prod
REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379/0

# AI Configuration
AI_ENABLED=true
OLLAMA_HOST=http://localhost:11434
HF_TRANSFORMERS_URL=http://localhost:8080
AI_CACHE_TTL=3600
AI_MAX_CONCURRENT=10

# API Keys (set these manually)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Monitoring
METRICS_ENABLED=true
LOGGING_LEVEL=info
ERROR_REPORTING_ENABLED=true

# Email (configure as needed)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=$EMAIL

# File Storage
FILE_STORAGE_TYPE=local
UPLOAD_DIR=/opt/$APP_NAME/uploads
MAX_FILE_SIZE=10MB

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
EOF
    
    chown $APP_NAME:$APP_NAME /etc/$APP_NAME/.env.production
    chmod 600 /etc/$APP_NAME/.env.production
    
    echo "✅ Application environment configured"
}

# Function to setup database
setup_database() {
    echo "🗄️  Setting up database..."
    
    # Install PostgreSQL
    apt-get install -y postgresql postgresql-contrib
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE USER notescape WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE notescape_prod OWNER notescape;
GRANT ALL PRIVILEGES ON DATABASE notescape_prod TO notescape;
\q
EOF
    
    # Install Redis
    apt-get install -y redis-server
    
    # Configure Redis
    sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/g" /etc/redis/redis.conf
    sed -i "s/bind 127.0.0.1 ::1/bind 127.0.0.1/g" /etc/redis/redis.conf
    
    systemctl restart redis-server
    systemctl enable redis-server
    
    echo "✅ Database configured"
}

# Function to deploy application
deploy_application() {
    echo "🚀 Deploying application..."
    
    # Switch to app user
    sudo -u $APP_NAME bash << 'DEPLOY_SCRIPT'
    cd /opt/notescape-ai
    
    # Install dependencies
    npm ci --production
    
    # Build application
    npm run build
    
    # Setup AI infrastructure
    ./scripts/setup-ai.sh setup
    
    # Run database migrations
    npm run db:migrate
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d
DEPLOY_SCRIPT
    
    echo "✅ Application deployed"
}

# Function to setup monitoring
setup_monitoring() {
    echo "📊 Setting up monitoring..."
    
    # Install Prometheus Node Exporter
    wget -O /tmp/node_exporter.tar.gz https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
    tar -xzf /tmp/node_exporter.tar.gz -C /tmp
    mv /tmp/node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
    
    # Create systemd service
    cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
    
    useradd -M -r -s /bin/false node_exporter
    systemctl daemon-reload
    systemctl enable node_exporter
    systemctl start node_exporter
    
    # Setup log rotation
    cat > /etc/logrotate.d/$APP_NAME << EOF
/var/log/$APP_NAME/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    copytruncate
    postrotate
        systemctl reload $APP_NAME
    endscript
}
EOF
    
    echo "✅ Monitoring configured"
}

# Function to setup backup system
setup_backup() {
    echo "💾 Setting up backup system..."
    
    mkdir -p /opt/backups/$APP_NAME
    
    # Create backup script
    cat > /opt/backups/$APP_NAME/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/notescape-ai"

# Database backup
pg_dump -h localhost -U notescape notescape_prod | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Redis backup
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Application data backup
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" -C /opt/notescape-ai uploads/ models/

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "*" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF
    
    chmod +x /opt/backups/$APP_NAME/backup.sh
    chown -R $APP_NAME:$APP_NAME /opt/backups/$APP_NAME
    
    # Add to crontab
    echo "0 2 * * * /opt/backups/$APP_NAME/backup.sh >> /var/log/$APP_NAME/backup.log 2>&1" | crontab -u $APP_NAME -
    
    echo "✅ Backup system configured"
}

# Function to create systemd service
setup_systemd() {
    echo "⚙️  Setting up systemd service..."
    
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=NoteSpace AI Application
After=network.target postgresql.service redis.service
Wants=network.target

[Service]
Type=simple
User=$APP_NAME
WorkingDirectory=/opt/$APP_NAME
EnvironmentFile=/etc/$APP_NAME/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Resource limits
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $APP_NAME
    
    echo "✅ Systemd service configured"
}

# Function to perform health check
health_check() {
    echo "🏥 Performing health check..."
    
    # Check services
    services=("nginx" "postgresql" "redis-server" "$APP_NAME")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet $service; then
            echo "✅ $service is running"
        else
            echo "❌ $service is not running"
        fi
    done
    
    # Check ports
    ports=(80 443 5432 6379 3001)
    
    for port in "${ports[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            echo "✅ Port $port is listening"
        else
            echo "⚠️  Port $port is not listening"
        fi
    done
    
    # Check AI services
    if curl -s http://localhost:11434/api/version > /dev/null; then
        echo "✅ Ollama AI service is running"
    else
        echo "⚠️  Ollama AI service is not responding"
    fi
    
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "✅ HuggingFace AI service is running"
    else
        echo "⚠️  HuggingFace AI service is not responding"
    fi
}

# Function to show final information
show_completion_info() {
    echo ""
    echo "🎉 Production Setup Complete!"
    echo "=============================="
    echo ""
    echo "📋 Service Information:"
    echo "  • Application: https://$DOMAIN"
    echo "  • API: https://api.$DOMAIN"
    echo "  • Status: systemctl status $APP_NAME"
    echo "  • Logs: journalctl -u $APP_NAME -f"
    echo ""
    echo "🔐 Security Information:"
    echo "  • SSL certificates: /etc/letsencrypt/live/$DOMAIN/"
    echo "  • Firewall status: ufw status"
    echo "  • Fail2ban status: fail2ban-client status"
    echo ""
    echo "💾 Database Information:"
    echo "  • PostgreSQL: localhost:5432/notescape_prod"
    echo "  • Redis: localhost:6379 (password protected)"
    echo "  • Backups: /opt/backups/$APP_NAME/"
    echo ""
    echo "🤖 AI Services:"
    echo "  • Ollama: http://localhost:11434"
    echo "  • HuggingFace: http://localhost:8080"
    echo "  • AI Manager: http://localhost:3005"
    echo ""
    echo "⚙️  Configuration Files:"
    echo "  • App config: /etc/$APP_NAME/.env.production"
    echo "  • Nginx config: /etc/nginx/sites-available/$APP_NAME"
    echo "  • Systemd service: /etc/systemd/system/$APP_NAME.service"
    echo ""
    echo "📊 Monitoring:"
    echo "  • Node Exporter: http://localhost:9100/metrics"
    echo "  • Application logs: /var/log/$APP_NAME/"
    echo ""
    echo "🔧 Management Commands:"
    echo "  • Restart app: sudo systemctl restart $APP_NAME"
    echo "  • View logs: sudo journalctl -u $APP_NAME -f"
    echo "  • Backup now: sudo -u $APP_NAME /opt/backups/$APP_NAME/backup.sh"
    echo "  • Update SSL: sudo certbot renew"
    echo ""
    echo "⚠️  Next Steps:"
    echo "  1. Configure API keys in /etc/$APP_NAME/.env.production"
    echo "  2. Setup email configuration if needed"
    echo "  3. Configure monitoring dashboard"
    echo "  4. Test backup and restore procedures"
    echo "  5. Set up log monitoring and alerting"
    echo ""
}

# Main execution flow
main() {
    case "$COMMAND" in
        "full")
            install_dependencies
            setup_firewall
            setup_fail2ban
            setup_app_user
            setup_ssl
            setup_nginx
            setup_app_environment
            setup_database
            deploy_application
            setup_monitoring
            setup_backup
            setup_systemd
            health_check
            show_completion_info
            ;;
        "deps")
            install_dependencies
            ;;
        "security")
            setup_firewall
            setup_fail2ban
            setup_ssl
            ;;
        "app")
            setup_app_user
            setup_app_environment
            deploy_application
            setup_systemd
            ;;
        "nginx")
            setup_nginx
            ;;
        "db")
            setup_database
            ;;
        "monitoring")
            setup_monitoring
            setup_backup
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 {full|deps|security|app|nginx|db|monitoring|health}"
            echo ""
            echo "Commands:"
            echo "  full       - Complete production setup (default)"
            echo "  deps       - Install system dependencies only"
            echo "  security   - Setup firewall, fail2ban, and SSL"
            echo "  app        - Deploy application only"
            echo "  nginx      - Configure Nginx only"
            echo "  db         - Setup database only"
            echo "  monitoring - Setup monitoring and backups"
            echo "  health     - Run health check"
            echo ""
            echo "Environment variables:"
            echo "  DOMAIN     - Domain name (default: localhost)"
            echo "  EMAIL      - Admin email for SSL certificates"
            echo "  NODE_ENV   - Environment (default: production)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"