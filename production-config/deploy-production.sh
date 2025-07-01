#!/bin/bash
# Production Deployment Script with Security Checks
# Ensures safe and secure deployment to production environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="hotelbooking"
DEPLOY_USER="deploy"
PRODUCTION_HOST="${PRODUCTION_HOST:-hotelbooking.com}"
DEPLOY_PATH="/opt/hotelbooking"
BACKUP_PATH="/var/backups/hotelbooking"
LOG_FILE="/var/log/hotelbooking/deploy-$(date +%Y%m%d-%H%M%S).log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS: $1"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

# Info message
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    info "Running pre-deployment checks..."
    
    # Check if running as deploy user
    if [[ "$USER" != "$DEPLOY_USER" ]]; then
        error_exit "Must run as $DEPLOY_USER user"
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"
    if [[ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE" ]]; then
        error_exit "Node.js version must be >= $REQUIRED_NODE (current: $NODE_VERSION)"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df -BG "$DEPLOY_PATH" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $AVAILABLE_SPACE -lt 5 ]]; then
        error_exit "Insufficient disk space (available: ${AVAILABLE_SPACE}GB, required: 5GB)"
    fi
    
    # Check if production environment file exists
    if [[ ! -f ".env.production" ]]; then
        error_exit ".env.production file not found"
    fi
    
    # Verify encrypted secrets
    if [[ ! -f ".secrets.enc" ]]; then
        error_exit ".secrets.enc file not found"
    fi
    
    success "Pre-deployment checks passed"
}

# Security scan
security_scan() {
    info "Running security scan..."
    
    # Check for known vulnerabilities
    npm audit --production --audit-level=high
    if [[ $? -ne 0 ]]; then
        error_exit "Security vulnerabilities found. Run 'npm audit fix' before deploying"
    fi
    
    # Check for sensitive data in code
    if grep -r --exclude-dir=node_modules --exclude-dir=.git -i -E "(password|secret|key|token).*=.*['\"][^'\"]+['\"]" . 2>/dev/null | grep -v ".env.example"; then
        error_exit "Potential hardcoded secrets found in code"
    fi
    
    # Verify file permissions
    find . -type f -name "*.sh" -not -perm 755 -exec chmod 755 {} \;
    find . -type f -name "*.js" -not -perm 644 -exec chmod 644 {} \;
    
    success "Security scan completed"
}

# Build application
build_application() {
    info "Building application..."
    
    # Backend build
    cd backend
    npm ci --production
    npm run build
    cd ..
    
    # Frontend build
    cd frontend
    npm ci
    npm run build:production
    
    # Optimize build
    info "Optimizing production build..."
    
    # Compress assets
    find dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -9 -k {} \;
    
    # Generate WebP images
    for img in dist/assets/images/*.{jpg,jpeg,png}; do
        if [[ -f "$img" ]]; then
            cwebp -q 85 "$img" -o "${img%.*}.webp" 2>/dev/null || true
        fi
    done
    
    cd ..
    
    success "Application built successfully"
}

# Database migration
database_migration() {
    info "Running database migrations..."
    
    # Backup database before migration
    info "Creating database backup..."
    pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_PATH/db-pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
    
    # Run migrations
    cd backend
    npm run migrate:production
    
    # Verify migration
    MIGRATION_STATUS=$(npm run migrate:status --silent)
    if [[ "$MIGRATION_STATUS" == *"pending"* ]]; then
        error_exit "Database migrations failed or incomplete"
    fi
    
    cd ..
    
    success "Database migrations completed"
}

# Deploy application
deploy_application() {
    info "Deploying application..."
    
    # Create deployment directory
    ssh $PRODUCTION_HOST "sudo mkdir -p $DEPLOY_PATH && sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH"
    
    # Sync files (excluding unnecessary files)
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.env*' \
        --exclude='coverage' \
        --exclude='test' \
        --exclude='*.test.js' \
        --exclude='*.spec.js' \
        ./ $PRODUCTION_HOST:$DEPLOY_PATH/
    
    # Copy production environment files
    scp .env.production $PRODUCTION_HOST:$DEPLOY_PATH/.env
    scp .secrets.enc $PRODUCTION_HOST:$DEPLOY_PATH/.secrets.enc
    
    # Install production dependencies on server
    ssh $PRODUCTION_HOST "cd $DEPLOY_PATH/backend && npm ci --production"
    
    success "Application deployed"
}

# Zero-downtime deployment
zero_downtime_deploy() {
    info "Starting zero-downtime deployment..."
    
    # Health check current deployment
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://$PRODUCTION_HOST/api/health)
    if [[ "$HEALTH_CHECK" != "200" ]]; then
        warning "Current deployment health check failed"
    fi
    
    # Deploy to staging slot
    ssh $PRODUCTION_HOST << 'EOF'
        cd /opt/hotelbooking
        
        # Start new instances on different ports
        PORT=8001 pm2 start backend/dist/server.js --name hotelbooking-backend-new
        PORT=3001 pm2 start frontend/server.js --name hotelbooking-frontend-new
        
        # Wait for new instances to be ready
        sleep 30
        
        # Health check new instances
        curl -f http://localhost:8001/api/health || exit 1
        curl -f http://localhost:3001/health || exit 1
        
        # Update nginx to point to new instances
        sudo sed -i 's/:8000/:8001/g' /etc/nginx/sites-available/hotelbooking
        sudo sed -i 's/:3000/:3001/g' /etc/nginx/sites-available/hotelbooking
        sudo nginx -t && sudo nginx -s reload
        
        # Stop old instances
        pm2 stop hotelbooking-backend-old hotelbooking-frontend-old || true
        pm2 delete hotelbooking-backend-old hotelbooking-frontend-old || true
        
        # Rename new instances
        pm2 restart hotelbooking-backend-new --name hotelbooking-backend-old
        pm2 restart hotelbooking-frontend-new --name hotelbooking-frontend-old
        
        # Save PM2 configuration
        pm2 save
EOF
    
    success "Zero-downtime deployment completed"
}

# Post-deployment checks
post_deployment_checks() {
    info "Running post-deployment checks..."
    
    # Health check
    ENDPOINTS=(
        "https://$PRODUCTION_HOST/api/health"
        "https://$PRODUCTION_HOST/api/hotels"
        "https://$PRODUCTION_HOST/"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
        if [[ "$HTTP_CODE" == "200" ]]; then
            success "Health check passed: $endpoint"
        else
            error_exit "Health check failed: $endpoint (HTTP $HTTP_CODE)"
        fi
    done
    
    # Check SSL certificate
    SSL_EXPIRY=$(echo | openssl s_client -servername $PRODUCTION_HOST -connect $PRODUCTION_HOST:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($SSL_EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
    
    if [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
        warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    else
        success "SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
    fi
    
    # Performance check
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://$PRODUCTION_HOST/)
    if (( $(echo "$RESPONSE_TIME > 3" | bc -l) )); then
        warning "High response time: ${RESPONSE_TIME}s"
    else
        success "Response time: ${RESPONSE_TIME}s"
    fi
    
    success "Post-deployment checks completed"
}

# Rollback function
rollback() {
    error_exit "Deployment failed! Initiating rollback..."
    
    ssh $PRODUCTION_HOST << 'EOF'
        cd /opt/hotelbooking
        
        # Restore from backup
        if [[ -d "/opt/hotelbooking.backup" ]]; then
            rm -rf /opt/hotelbooking
            mv /opt/hotelbooking.backup /opt/hotelbooking
            
            # Restart services
            pm2 restart all
            
            echo "Rollback completed"
        else
            echo "No backup found for rollback"
            exit 1
        fi
EOF
}

# Main deployment flow
main() {
    info "Starting production deployment for $PROJECT_NAME"
    
    # Set up error handling
    trap rollback ERR
    
    # Run deployment steps
    pre_deployment_checks
    security_scan
    build_application
    database_migration
    deploy_application
    zero_downtime_deploy
    post_deployment_checks
    
    # Send deployment notification
    if command -v slack-cli &> /dev/null; then
        slack-cli send "✅ Production deployment completed successfully for $PROJECT_NAME"
    fi
    
    success "Production deployment completed successfully!"
    info "Deployment log: $LOG_FILE"
}

# Run main function
main "$@"