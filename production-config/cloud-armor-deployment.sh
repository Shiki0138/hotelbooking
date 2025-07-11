#!/bin/bash

# Cloud Armor Deployment Script
# 史上最強のセキュリティデプロイメント - worker4実装
# Created: 2025-06-29

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"hotelbooking-prod"}
POLICY_NAME="hotelbooking-cloud-armor-policy"
BACKEND_SERVICE_NAME="hotelbooking-backend-service"
LOAD_BALANCER_NAME="hotelbooking-lb"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Prerequisites check
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI is not installed. Please install Google Cloud SDK."
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        error "Not authenticated with gcloud. Please run 'gcloud auth login'."
    fi
    
    # Check project ID
    if [[ -z "${PROJECT_ID}" ]]; then
        error "PROJECT_ID is not set. Please set GCP_PROJECT_ID environment variable."
    fi
    
    # Set project
    gcloud config set project "${PROJECT_ID}"
    
    # Enable required APIs
    log "🔧 Enabling required APIs..."
    gcloud services enable compute.googleapis.com
    gcloud services enable cloudarmorapi.googleapis.com
    
    success "Prerequisites check completed"
}

# Create Cloud Armor security policy
create_security_policy() {
    log "🛡️ Creating Cloud Armor security policy..."
    
    # Check if policy already exists
    if gcloud compute security-policies describe "${POLICY_NAME}" &>/dev/null; then
        warning "Security policy '${POLICY_NAME}' already exists. Updating..."
        update_security_policy
        return
    fi
    
    # Create the security policy
    gcloud compute security-policies create "${POLICY_NAME}" \
        --description "Hotel Booking System - Comprehensive Security Policy" \
        --type CLOUD_ARMOR
    
    success "Security policy created: ${POLICY_NAME}"
}

# Update security policy rules
update_security_policy() {
    log "📝 Updating security policy rules..."
    
    # Rule 1: Block known malicious IPs
    gcloud compute security-policies rules create 1000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block known malicious IPs" \
        --expression='origin.ip in ["192.168.1.100", "10.0.0.1"]' || true
    
    # Rule 2: Geographic restrictions
    gcloud compute security-policies rules create 1100 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block requests from restricted regions" \
        --expression='origin.region_code in ["XX", "YY"]' || true
    
    # Rule 3: SQL Injection protection
    gcloud compute security-policies rules create 2000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block SQL injection attempts" \
        --expression='request.url_map.path.matches("(?i).*(\\'|(\\\\%27))((union(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+select)|(select(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+.*(from|where))|(or(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+.*(=|like))|(exec(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+.*(xp_|sp_))|(drop(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+table)|(insert(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+into)|(delete(\\\\s|%20|%09|%0A|%0B|%0C|%0D)+from)).*")' || true
    
    # Rule 4: XSS protection
    gcloud compute security-policies rules create 2100 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block XSS attempts" \
        --expression='request.url_map.path.matches("(?i).*(<script|javascript:|vbscript:|onload=|onerror=|<iframe|<object|<embed|<applet|<meta|<link).*")' || true
    
    # Rule 5: Path traversal protection
    gcloud compute security-policies rules create 2200 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block path traversal attempts" \
        --expression='request.url_map.path.matches(".*(\\\\.\\\\./|\\\\.\\\\.\\\\\\\|%2e%2e%2f|%2e%2e%5c|%252e%252e%252f|%252e%252e%255c).*")' || true
    
    # Rule 6: Command injection protection
    gcloud compute security-policies rules create 2300 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block command injection attempts" \
        --expression='request.url_map.path.matches("(?i).*(;|\\\\||&|`|\\\\$\\\\(|\\\\${|<\\\\(|>\\\\(|\\\\x00|%00|cat|grep|wget|curl|nc|telnet|ssh).*")' || true
    
    # Rule 7: API rate limiting
    gcloud compute security-policies rules create 3000 \
        --security-policy="${POLICY_NAME}" \
        --action=throttle \
        --description="API rate limiting - 100 requests per minute" \
        --expression='request.url_map.path.startsWith("/api/")' \
        --rate-limit-threshold-count=100 \
        --rate-limit-threshold-interval-sec=60 \
        --conform-action=allow \
        --exceed-action=deny-429 \
        --enforce-on-key=IP || true
    
    # Rule 8: Auth rate limiting
    gcloud compute security-policies rules create 3100 \
        --security-policy="${POLICY_NAME}" \
        --action=throttle \
        --description="Auth rate limiting - 5 requests per 5 minutes" \
        --expression='request.url_map.path.startsWith("/api/auth/")' \
        --rate-limit-threshold-count=5 \
        --rate-limit-threshold-interval-sec=300 \
        --conform-action=allow \
        --exceed-action=deny-429 \
        --enforce-on-key=IP || true
    
    # Rule 9: Booking rate limiting
    gcloud compute security-policies rules create 3200 \
        --security-policy="${POLICY_NAME}" \
        --action=throttle \
        --description="Booking rate limiting - 10 requests per 15 minutes" \
        --expression='request.url_map.path.startsWith("/api/bookings")' \
        --rate-limit-threshold-count=10 \
        --rate-limit-threshold-interval-sec=900 \
        --conform-action=allow \
        --exceed-action=deny-429 \
        --enforce-on-key=IP || true
    
    # Rule 10: Block suspicious user agents
    gcloud compute security-policies rules create 4000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block suspicious user agents" \
        --expression='request.headers["user-agent"].matches("(?i).*(bot|crawler|spider|scraper|scanner|curl|wget|python|java|php|perl|ruby|go-http|libwww|nikto|sqlmap|nmap|masscan|zap|burp).*")' || true
    
    # Rule 11: Block empty user agent
    gcloud compute security-policies rules create 4100 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block requests with empty user agent" \
        --expression='request.headers["user-agent"] == ""' || true
    
    # Rule 12: Method restriction
    gcloud compute security-policies rules create 5000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-405 \
        --description="Block non-standard HTTP methods" \
        --expression='request.method != "GET" && request.method != "POST" && request.method != "PUT" && request.method != "DELETE" && request.method != "PATCH" && request.method != "OPTIONS"' || true
    
    # Rule 13: Content-length validation
    gcloud compute security-policies rules create 6000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-413 \
        --description="Block requests with excessive content length" \
        --expression='int(request.headers["content-length"]) > 10485760' || true
    
    # Rule 14: Block common attack patterns
    gcloud compute security-policies rules create 7000 \
        --security-policy="${POLICY_NAME}" \
        --action=deny-403 \
        --description="Block common attack patterns in URL" \
        --expression='request.url_map.path.matches("(?i).*(wp-admin|phpmyadmin|admin|administrator|wp-login|wp-config|config|backup|test|temp|tmp|log|logs|\\.env|\\.git|\\.svn|\\.htaccess|web.config).*")' || true
    
    # Default rule: Allow and log
    gcloud compute security-policies rules create 8000 \
        --security-policy="${POLICY_NAME}" \
        --action=allow \
        --description="Allow and log all other requests" \
        --expression='true' || true
    
    success "Security policy rules updated"
}

# Enable adaptive protection
enable_adaptive_protection() {
    log "🔬 Enabling adaptive protection..."
    
    gcloud compute security-policies update "${POLICY_NAME}" \
        --enable-layer7-ddos-defense \
        --layer7-ddos-defense-rule-visibility=STANDARD
    
    success "Adaptive protection enabled"
}

# Attach policy to backend service
attach_to_backend_service() {
    log "🔗 Attaching security policy to backend service..."
    
    # Check if backend service exists
    if ! gcloud compute backend-services describe "${BACKEND_SERVICE_NAME}" --global &>/dev/null; then
        warning "Backend service '${BACKEND_SERVICE_NAME}' not found. Creating example backend service..."
        create_backend_service
    fi
    
    # Attach security policy
    gcloud compute backend-services update "${BACKEND_SERVICE_NAME}" \
        --global \
        --security-policy="${POLICY_NAME}"
    
    success "Security policy attached to backend service"
}

# Create example backend service (if needed)
create_backend_service() {
    log "🏗️ Creating example backend service..."
    
    # Create health check
    gcloud compute health-checks create http hotelbooking-health-check \
        --port=8080 \
        --request-path="/api/health" \
        --check-interval=30s \
        --timeout=10s \
        --healthy-threshold=2 \
        --unhealthy-threshold=3 || true
    
    # Create backend service
    gcloud compute backend-services create "${BACKEND_SERVICE_NAME}" \
        --global \
        --health-checks=hotelbooking-health-check \
        --port-name=http \
        --protocol=HTTP \
        --timeout=30s || true
    
    success "Backend service created"
}

# Test security policy
test_security_policy() {
    log "🧪 Testing security policy..."
    
    # Test SQL injection block
    log "Testing SQL injection protection..."
    curl -s -o /dev/null -w "%{http_code}" "https://your-domain.com/api/test?id=1' OR '1'='1" || true
    
    # Test XSS block
    log "Testing XSS protection..."
    curl -s -o /dev/null -w "%{http_code}" "https://your-domain.com/api/test?search=<script>alert('xss')</script>" || true
    
    # Test rate limiting
    log "Testing rate limiting..."
    for i in {1..6}; do
        curl -s -o /dev/null -w "%{http_code}" "https://your-domain.com/api/auth/login"
        sleep 1
    done
    
    success "Security policy tests completed"
}

# Generate monitoring dashboard
create_monitoring_dashboard() {
    log "📊 Creating monitoring dashboard..."
    
    cat > /tmp/cloud-armor-dashboard.json << 'EOF'
{
  "displayName": "Hotel Booking - Cloud Armor Security",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Cloud Armor - Blocked Requests",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_security_policy\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "widget": {
          "title": "Cloud Armor - Rate Limiting",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"gce_security_policy\" AND metric.label.action=\"throttle\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE",
                      "crossSeriesReducer": "REDUCE_SUM"
                    }
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF
    
    # Create dashboard
    gcloud monitoring dashboards create --config-from-file=/tmp/cloud-armor-dashboard.json
    
    success "Monitoring dashboard created"
}

# Main deployment function
main() {
    log "🚀 Starting Cloud Armor deployment for Hotel Booking System"
    log "Project: ${PROJECT_ID}"
    log "Policy: ${POLICY_NAME}"
    
    check_prerequisites
    create_security_policy
    update_security_policy
    enable_adaptive_protection
    attach_to_backend_service
    create_monitoring_dashboard
    
    success "🎉 Cloud Armor deployment completed successfully!"
    
    log "📋 Next steps:"
    log "1. Update your load balancer to use the backend service"
    log "2. Configure your domain to point to the load balancer"
    log "3. Test the security rules with the test function"
    log "4. Monitor the Cloud Armor logs in Cloud Logging"
    
    log "🔍 Useful commands:"
    log "• View policy: gcloud compute security-policies describe ${POLICY_NAME}"
    log "• List rules: gcloud compute security-policies rules list --security-policy=${POLICY_NAME}"
    log "• View logs: gcloud logging read 'resource.type=\"gce_security_policy\"' --limit=50"
    log "• Test policy: ${0} test"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "test")
        test_security_policy
        ;;
    "delete")
        log "🗑️ Deleting Cloud Armor policy..."
        gcloud compute security-policies delete "${POLICY_NAME}" --quiet
        success "Security policy deleted"
        ;;
    "status")
        log "📊 Security policy status:"
        gcloud compute security-policies describe "${POLICY_NAME}"
        ;;
    *)
        echo "Usage: $0 {deploy|test|delete|status}"
        echo "  deploy - Deploy Cloud Armor security policy"
        echo "  test   - Test security policy rules"
        echo "  delete - Delete security policy"
        echo "  status - Show policy status"
        exit 1
        ;;
esac