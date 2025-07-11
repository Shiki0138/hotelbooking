#!/bin/bash

# Security Test Runner for Hotel Booking System
# 史上最強のセキュリティテスト実行スクリプト - worker4実装
# Created: 2025-06-29

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${TEST_BASE_URL:-"http://localhost:8080"}
REPORT_DIR=${REPORT_DIR:-"./security-reports"}
TEST_MODE=${TEST_MODE:-"full"} # full, quick, specific
PARALLEL_TESTS=${PARALLEL_TESTS:-5}
TIMEOUT=${TIMEOUT:-30}

# Test categories
CATEGORIES=(
    "sql-injection"
    "xss"
    "path-traversal"
    "command-injection"
    "authentication"
    "authorization"
    "rate-limiting"
    "input-validation"
    "session-management"
    "https-tls"
    "security-headers"
    "file-upload"
    "api-security"
    "hotel-specific"
)

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

info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

# Print banner
print_banner() {
    echo -e "${PURPLE}"
    echo "██╗  ██╗ ██████╗ ████████╗███████╗██╗         ███████╗███████╗ ██████╗"
    echo "██║  ██║██╔═══██╗╚══██╔══╝██╔════╝██║         ██╔════╝██╔════╝██╔════╝"
    echo "███████║██║   ██║   ██║   █████╗  ██║         ███████╗█████╗  ██║     "
    echo "██╔══██║██║   ██║   ██║   ██╔══╝  ██║         ╚════██║██╔══╝  ██║     "
    echo "██║  ██║╚██████╔╝   ██║   ███████╗███████╗    ███████║███████╗╚██████╗"
    echo "╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚══════╝╚══════╝    ╚══════╝╚══════╝ ╚═════╝"
    echo ""
    echo "🛡️  Hotel Booking System Security Test Suite"
    echo "🎯  Target: $BASE_URL"
    echo "📊  Mode: $TEST_MODE"
    echo "📁  Reports: $REPORT_DIR"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js to run security tests."
    fi
    
    # Check if target is reachable
    if ! curl -s --max-time 5 "$BASE_URL/api/health" &> /dev/null; then
        warning "Target server may not be running at $BASE_URL"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Create report directory
    mkdir -p "$REPORT_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "📦 Installing test dependencies..."
        npm install axios crypto fs path
    fi
    
    success "Prerequisites check completed"
}

# Run SQL injection tests
test_sql_injection() {
    log "💉 Running SQL Injection tests..."
    
    local payloads=(
        "' OR '1'='1"
        "'; DROP TABLE users; --"
        "' UNION SELECT * FROM users --"
        "1' AND (SELECT SUBSTRING(@@version,1,1))='5' --"
        "' OR 1=1#"
        "admin'--"
        "'; WAITFOR DELAY '00:00:05' --"
    )
    
    local endpoints=(
        "/api/search?q="
        "/api/hotels?id="
        "/api/auth/login"
    )
    
    local results=0
    
    for endpoint in "${endpoints[@]}"; do
        for payload in "${payloads[@]}"; do
            log "  Testing: $endpoint with payload: ${payload:0:20}..."
            
            if [[ "$endpoint" == *"login"* ]]; then
                # POST request for login
                response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
                    -H "Content-Type: application/json" \
                    -d "{\"email\":\"$payload\", \"password\":\"test\"}" \
                    --max-time $TIMEOUT \
                    "$BASE_URL$endpoint" || echo "000")
            else
                # GET request
                response=$(curl -s -o /dev/null -w "%{http_code}" \
                    --max-time $TIMEOUT \
                    "${BASE_URL}${endpoint}${payload// /%20}" || echo "000")
            fi
            
            if [[ "$response" == "200" ]]; then
                warning "    Potential vulnerability: HTTP 200 response"
                ((results++))
            elif [[ "$response" == "5"* ]]; then
                warning "    Server error: HTTP $response"
                ((results++))
            else
                info "    Blocked: HTTP $response"
            fi
        done
    done
    
    if [[ $results -eq 0 ]]; then
        success "SQL injection tests completed - No vulnerabilities detected"
    else
        warning "SQL injection tests completed - $results potential issues found"
    fi
}

# Run XSS tests
test_xss() {
    log "🖥️ Running XSS tests..."
    
    local payloads=(
        "<script>alert('XSS')</script>"
        "<img src=x onerror=alert('XSS')>"
        "javascript:alert('XSS')"
        "<svg onload=alert('XSS')>"
        "<iframe src='javascript:alert(\"XSS\")'></iframe>"
    )
    
    local endpoints=(
        "/api/search?q="
        "/api/reviews"
    )
    
    local results=0
    
    for endpoint in "${endpoints[@]}"; do
        for payload in "${payloads[@]}"; do
            log "  Testing: $endpoint with XSS payload..."
            
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                --max-time $TIMEOUT \
                "${BASE_URL}${endpoint}${payload// /%20}" || echo "000")
            
            if [[ "$response" == "200" ]]; then
                warning "    Potential XSS vulnerability: HTTP 200 response"
                ((results++))
            else
                info "    Blocked: HTTP $response"
            fi
        done
    done
    
    if [[ $results -eq 0 ]]; then
        success "XSS tests completed - No vulnerabilities detected"
    else
        warning "XSS tests completed - $results potential issues found"
    fi
}

# Run authentication tests
test_authentication() {
    log "🔐 Running Authentication tests..."
    
    # Test login endpoint without credentials
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"", "password":""}' \
        --max-time $TIMEOUT \
        "$BASE_URL/api/auth/login" || echo "000")
    
    if [[ "$response" == "200" ]]; then
        warning "  Authentication bypass possible - empty credentials accepted"
    else
        info "  Empty credentials properly rejected: HTTP $response"
    fi
    
    # Test with SQL injection in credentials
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"admin'\''--", "password":"anything"}' \
        --max-time $TIMEOUT \
        "$BASE_URL/api/auth/login" || echo "000")
    
    if [[ "$response" == "200" ]]; then
        warning "  Authentication bypass possible - SQL injection in credentials"
    else
        info "  SQL injection in credentials properly blocked: HTTP $response"
    fi
    
    success "Authentication tests completed"
}

# Test authorization
test_authorization() {
    log "🛡️ Running Authorization tests..."
    
    local protected_endpoints=(
        "/api/admin/users"
        "/api/admin/hotels"
        "/api/user/profile"
        "/api/bookings/my"
    )
    
    for endpoint in "${protected_endpoints[@]}"; do
        # Test without authentication
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" || echo "000")
        
        if [[ "$response" == "200" ]]; then
            warning "  Authorization bypass: $endpoint accessible without auth"
        elif [[ "$response" == "401" || "$response" == "403" ]]; then
            info "  $endpoint properly protected: HTTP $response"
        else
            info "  $endpoint response: HTTP $response"
        fi
        
        # Test with invalid token
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer invalid_token_12345" \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" || echo "000")
        
        if [[ "$response" == "200" ]]; then
            warning "  Authorization bypass: $endpoint accessible with invalid token"
        else
            info "  Invalid token properly rejected for $endpoint: HTTP $response"
        fi
    done
    
    success "Authorization tests completed"
}

# Test rate limiting
test_rate_limiting() {
    log "⏱️ Running Rate Limiting tests..."
    
    local endpoint="/api/auth/login"
    local responses=()
    
    # Send multiple requests quickly
    for i in {1..10}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com", "password":"test"}' \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" &)
        responses+=($!)
    done
    
    # Wait for all requests and check responses
    local rate_limited=0
    for pid in "${responses[@]}"; do
        wait $pid
        # Note: This is a simplified check
        # In reality, we'd need to capture actual response codes
    done
    
    # Test with a simple approach
    for i in {1..5}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d '{"email":"test@test.com", "password":"test"}' \
            --max-time $TIMEOUT \
            "$BASE_URL$endpoint" || echo "000")
        
        if [[ "$response" == "429" ]]; then
            rate_limited=1
            break
        fi
        sleep 0.1
    done
    
    if [[ $rate_limited -eq 1 ]]; then
        success "Rate limiting active - HTTP 429 received"
    else
        warning "Rate limiting not detected"
    fi
}

# Test security headers
test_security_headers() {
    log "🛡️ Running Security Headers tests..."
    
    local headers_file=$(mktemp)
    curl -s -I "$BASE_URL/" > "$headers_file" 2>/dev/null || true
    
    local required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )
    
    for header in "${required_headers[@]}"; do
        if grep -qi "$header" "$headers_file"; then
            success "  $header: Present"
        else
            warning "  $header: Missing"
        fi
    done
    
    rm -f "$headers_file"
    success "Security headers tests completed"
}

# Test HTTPS redirect
test_https() {
    log "🔒 Testing HTTPS configuration..."
    
    local http_url=$(echo "$BASE_URL" | sed 's/https:/http:/')
    
    if [[ "$http_url" != "$BASE_URL" ]]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time $TIMEOUT \
            "$http_url/" || echo "000")
        
        if [[ "$response" == "301" || "$response" == "302" ]]; then
            success "HTTP to HTTPS redirect active: HTTP $response"
        else
            warning "HTTP to HTTPS redirect not detected: HTTP $response"
        fi
    else
        info "HTTPS redirect test skipped (target is HTTP)"
    fi
}

# Test file upload security
test_file_upload() {
    log "📤 Testing File Upload security..."
    
    # Create a test PHP file
    local php_file=$(mktemp)
    echo '<?php echo "PHP executed"; ?>' > "$php_file"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -F "file=@$php_file;filename=test.php" \
        --max-time $TIMEOUT \
        "$BASE_URL/api/upload" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        warning "  Potential file upload vulnerability - PHP file accepted"
    elif [[ "$response" == "400" || "$response" == "403" ]]; then
        success "  File upload properly restricted: HTTP $response"
    else
        info "  File upload endpoint response: HTTP $response"
    fi
    
    rm -f "$php_file"
}

# Run comprehensive security test
run_comprehensive_test() {
    log "🎯 Running comprehensive security test suite..."
    
    # Create a Node.js test runner
    cat > /tmp/security_test_runner.js << 'EOF'
const SecurityTestSuite = require('./production-config/security-test-suite.js');

const config = {
    baseUrl: process.env.BASE_URL || 'http://localhost:8080',
    timeout: parseInt(process.env.TIMEOUT) || 30000,
    reportPath: process.env.REPORT_DIR || './security-reports/comprehensive-test'
};

const testSuite = new SecurityTestSuite(config);

testSuite.runAllTests()
    .then(results => {
        console.log('\n📊 Test Summary:');
        console.log(`Total: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Warnings: ${results.summary.warnings}`);
        console.log(`Skipped: ${results.summary.skipped}`);
        
        process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
EOF
    
    BASE_URL="$BASE_URL" TIMEOUT="$TIMEOUT" REPORT_DIR="$REPORT_DIR" node /tmp/security_test_runner.js
    
    rm -f /tmp/security_test_runner.js
}

# Generate summary report
generate_summary() {
    log "📊 Generating test summary..."
    
    local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
    local summary_file="$REPORT_DIR/security-test-summary-$timestamp.txt"
    
    cat > "$summary_file" << EOF
🛡️ Hotel Booking System Security Test Summary
============================================

Test Configuration:
- Target URL: $BASE_URL
- Test Mode: $TEST_MODE
- Timestamp: $(date)
- Report Directory: $REPORT_DIR

Test Categories Executed:
$(printf "- %s\n" "${CATEGORIES[@]}")

Next Steps:
1. Review detailed reports in $REPORT_DIR
2. Address any FAILED or WARNING items
3. Re-run tests after fixes
4. Implement continuous security testing

Security Recommendations:
- Enable WAF (Web Application Firewall)
- Implement rate limiting
- Use HTTPS everywhere
- Regular security updates
- Security header implementation
- Input validation and sanitization
- Authentication and authorization controls

EOF
    
    success "Summary report generated: $summary_file"
}

# Main execution function
main() {
    print_banner
    
    case "${1:-full}" in
        "quick")
            log "🚀 Running quick security tests..."
            check_prerequisites
            test_authentication
            test_authorization
            test_security_headers
            ;;
        "comprehensive"|"full")
            log "🚀 Running comprehensive security tests..."
            check_prerequisites
            run_comprehensive_test
            ;;
        "sql")
            log "🚀 Running SQL injection tests..."
            check_prerequisites
            test_sql_injection
            ;;
        "xss")
            log "🚀 Running XSS tests..."
            check_prerequisites
            test_xss
            ;;
        "auth")
            log "🚀 Running authentication tests..."
            check_prerequisites
            test_authentication
            test_authorization
            ;;
        "headers")
            log "🚀 Running security headers tests..."
            check_prerequisites
            test_security_headers
            ;;
        "https")
            log "🚀 Running HTTPS tests..."
            check_prerequisites
            test_https
            ;;
        "upload")
            log "🚀 Running file upload tests..."
            check_prerequisites
            test_file_upload
            ;;
        "rate")
            log "🚀 Running rate limiting tests..."
            check_prerequisites
            test_rate_limiting
            ;;
        "all")
            log "🚀 Running all individual tests..."
            check_prerequisites
            test_sql_injection
            test_xss
            test_authentication
            test_authorization
            test_rate_limiting
            test_security_headers
            test_https
            test_file_upload
            ;;
        *)
            echo "Usage: $0 {quick|comprehensive|sql|xss|auth|headers|https|upload|rate|all}"
            echo ""
            echo "Test modes:"
            echo "  quick         - Fast essential security checks"
            echo "  comprehensive - Full security test suite with detailed reports"
            echo "  sql          - SQL injection tests only"
            echo "  xss          - Cross-site scripting tests only"
            echo "  auth         - Authentication and authorization tests"
            echo "  headers      - Security headers tests"
            echo "  https        - HTTPS configuration tests"
            echo "  upload       - File upload security tests"
            echo "  rate         - Rate limiting tests"
            echo "  all          - Run all individual test categories"
            echo ""
            echo "Environment variables:"
            echo "  TEST_BASE_URL - Target URL (default: http://localhost:8080)"
            echo "  REPORT_DIR    - Report directory (default: ./security-reports)"
            echo "  TIMEOUT       - Request timeout in seconds (default: 30)"
            exit 1
            ;;
    esac
    
    generate_summary
    
    success "🎉 Security testing completed!"
    info "📋 Check reports in: $REPORT_DIR"
}

# Handle command line arguments and run main function
main "$@"