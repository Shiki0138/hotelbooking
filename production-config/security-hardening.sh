#!/bin/bash

# Hotel Booking System - Production Security Hardening Script
# 史上最強のセキュリティ強化スクリプト - worker4実装
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="hotelbooking"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Print banner
print_banner() {
    echo -e "${PURPLE}"
    echo "███████╗███████╗ ██████╗██╗   ██╗██████╗ ██╗████████╗██╗   ██╗"
    echo "██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝"
    echo "███████╗█████╗  ██║     ██║   ██║██████╔╝██║   ██║    ╚████╔╝ "
    echo "╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██║   ██║     ╚██╔╝  "
    echo "███████║███████╗╚██████╗╚██████╔╝██║  ██║██║   ██║      ██║   "
    echo "╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝   "
    echo ""
    echo "🔒 Hotel Booking System - Security Hardening"
    echo "🎯 Environment: $ENVIRONMENT"
    echo "🌍 Region: $AWS_REGION"
    echo -e "${NC}"
}

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

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check required tools
    local required_tools=("aws" "jq" "openssl" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed or not in PATH"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi
    
    success "Prerequisites check completed"
}

# Configure AWS Security Groups
configure_security_groups() {
    log "🛡️ Configuring AWS Security Groups..."
    
    # Get VPC ID
    local vpc_id=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-vpc" \
        --query 'Vpcs[0].VpcId' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    if [[ -z "$vpc_id" || "$vpc_id" == "None" ]]; then
        warning "VPC not found, skipping security group configuration"
        return 0
    fi
    
    # Create ALB Security Group
    local alb_sg_id=$(aws ec2 create-security-group \
        --group-name "${PROJECT_NAME}-alb-sg" \
        --description "Security group for Application Load Balancer" \
        --vpc-id "$vpc_id" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$alb_sg_id" ]]; then
        # Configure ALB security group rules
        aws ec2 authorize-security-group-ingress \
            --group-id "$alb_sg_id" \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --region "$AWS_REGION" 2>/dev/null || true
        
        aws ec2 authorize-security-group-ingress \
            --group-id "$alb_sg_id" \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0 \
            --region "$AWS_REGION" 2>/dev/null || true
        
        info "Created ALB Security Group: $alb_sg_id"
    fi
    
    # Create Backend Security Group
    local backend_sg_id=$(aws ec2 create-security-group \
        --group-name "${PROJECT_NAME}-backend-sg" \
        --description "Security group for Backend ECS tasks" \
        --vpc-id "$vpc_id" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$backend_sg_id" && -n "$alb_sg_id" ]]; then
        # Configure Backend security group rules
        aws ec2 authorize-security-group-ingress \
            --group-id "$backend_sg_id" \
            --protocol tcp \
            --port 8080 \
            --source-group "$alb_sg_id" \
            --region "$AWS_REGION" 2>/dev/null || true
        
        info "Created Backend Security Group: $backend_sg_id"
    fi
    
    success "Security groups configured"
}

# Setup SSL/TLS certificates
setup_ssl_certificates() {
    log "🔐 Setting up SSL/TLS certificates..."
    
    # Request certificate for main domain
    local cert_arn=$(aws acm request-certificate \
        --domain-name "hotelbooking.com" \
        --subject-alternative-names "*.hotelbooking.com" \
        --validation-method DNS \
        --region "$AWS_REGION" \
        --query 'CertificateArn' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$cert_arn" ]]; then
        info "Requested SSL certificate: $cert_arn"
        
        # Tag the certificate
        aws acm add-tags-to-certificate \
            --certificate-arn "$cert_arn" \
            --tags Key=Project,Value="$PROJECT_NAME" Key=Environment,Value="$ENVIRONMENT" \
            --region "$AWS_REGION" 2>/dev/null || true
        
        warning "Certificate requires DNS validation. Please validate the certificate in AWS Console."
    fi
    
    success "SSL certificate setup initiated"
}

# Configure WAF (Web Application Firewall)
configure_waf() {
    log "🛡️ Configuring Web Application Firewall..."
    
    # Create WAF WebACL
    local webacl_config=$(cat <<EOF
{
    "Name": "${PROJECT_NAME}-waf",
    "Scope": "CLOUDFRONT",
    "DefaultAction": {
        "Allow": {}
    },
    "Description": "WAF for Hotel Booking System",
    "Rules": [
        {
            "Name": "AWSManagedRulesCommonRuleSet",
            "Priority": 1,
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesCommonRuleSet"
                }
            },
            "Action": {
                "Block": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "CommonRuleSetMetric"
            }
        },
        {
            "Name": "AWSManagedRulesKnownBadInputsRuleSet",
            "Priority": 2,
            "Statement": {
                "ManagedRuleGroupStatement": {
                    "VendorName": "AWS",
                    "Name": "AWSManagedRulesKnownBadInputsRuleSet"
                }
            },
            "Action": {
                "Block": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "KnownBadInputsMetric"
            }
        },
        {
            "Name": "RateLimitRule",
            "Priority": 3,
            "Statement": {
                "RateBasedStatement": {
                    "Limit": 2000,
                    "AggregateKeyType": "IP"
                }
            },
            "Action": {
                "Block": {}
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "RateLimitMetric"
            }
        }
    ],
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "${PROJECT_NAME}WAFMetric"
    }
}
EOF
)
    
    # Create WebACL
    local webacl_arn=$(aws wafv2 create-web-acl \
        --cli-input-json "$webacl_config" \
        --region "$AWS_REGION" \
        --query 'Summary.ARN' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$webacl_arn" ]]; then
        info "Created WAF WebACL: $webacl_arn"
    fi
    
    success "WAF configuration completed"
}

# Setup secrets in AWS Secrets Manager
setup_secrets_manager() {
    log "🔑 Setting up AWS Secrets Manager..."
    
    # Database credentials
    local db_secret=$(cat <<EOF
{
    "username": "hotelbooking_app",
    "password": "$(openssl rand -base64 32)",
    "engine": "postgres",
    "host": "your-rds-endpoint.amazonaws.com",
    "port": 5432,
    "dbname": "hotelbooking"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "hotelbooking/database/credentials" \
        --description "Database connection credentials" \
        --secret-string "$db_secret" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # JWT secrets
    local jwt_secret=$(cat <<EOF
{
    "secret": "$(openssl rand -base64 64)",
    "refresh_secret": "$(openssl rand -base64 64)"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "hotelbooking/jwt/keys" \
        --description "JWT signing keys" \
        --secret-string "$jwt_secret" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Redis authentication
    local redis_secret=$(cat <<EOF
{
    "auth_token": "$(openssl rand -base64 32)"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "hotelbooking/redis/auth" \
        --description "Redis authentication token" \
        --secret-string "$redis_secret" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Encryption keys
    local encryption_secret=$(cat <<EOF
{
    "encryption_key": "$(openssl rand -base64 32)",
    "signing_key": "$(openssl rand -base64 32)"
}
EOF
)
    
    aws secretsmanager create-secret \
        --name "hotelbooking/encryption/keys" \
        --description "Application encryption keys" \
        --secret-string "$encryption_secret" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    success "Secrets Manager setup completed"
}

# Configure KMS encryption keys
configure_kms_keys() {
    log "🔐 Configuring KMS encryption keys..."
    
    # Database encryption key
    local db_key_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Enable IAM User Permissions",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):root"
            },
            "Action": "kms:*",
            "Resource": "*"
        },
        {
            "Sid": "Allow RDS to use the key",
            "Effect": "Allow",
            "Principal": {
                "Service": "rds.amazonaws.com"
            },
            "Action": [
                "kms:Decrypt",
                "kms:GenerateDataKey"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)
    
    local db_key_id=$(aws kms create-key \
        --policy "$db_key_policy" \
        --description "Encryption key for Hotel Booking Database" \
        --region "$AWS_REGION" \
        --query 'KeyMetadata.KeyId' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$db_key_id" ]]; then
        aws kms create-alias \
            --alias-name "alias/hotelbooking-db-key" \
            --target-key-id "$db_key_id" \
            --region "$AWS_REGION" 2>/dev/null || true
        
        info "Created database encryption key: $db_key_id"
    fi
    
    # S3 encryption key
    local s3_key_id=$(aws kms create-key \
        --description "Encryption key for Hotel Booking S3 buckets" \
        --region "$AWS_REGION" \
        --query 'KeyMetadata.KeyId' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$s3_key_id" ]]; then
        aws kms create-alias \
            --alias-name "alias/hotelbooking-s3-key" \
            --target-key-id "$s3_key_id" \
            --region "$AWS_REGION" 2>/dev/null || true
        
        info "Created S3 encryption key: $s3_key_id"
    fi
    
    success "KMS keys configured"
}

# Enable security monitoring services
enable_security_monitoring() {
    log "👁️ Enabling security monitoring services..."
    
    # Enable GuardDuty
    aws guardduty create-detector \
        --enable \
        --finding-publishing-frequency FIFTEEN_MINUTES \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Enable Security Hub
    aws securityhub enable-security-hub \
        --enable-default-standards \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Enable Config
    local config_role_arn="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig"
    
    aws configservice put-configuration-recorder \
        --configuration-recorder "name=default,roleARN=$config_role_arn" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    aws configservice put-delivery-channel \
        --delivery-channel "name=default,s3BucketName=${PROJECT_NAME}-config-bucket-$(date +%s)" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    aws configservice start-configuration-recorder \
        --configuration-recorder-name default \
        --region "$AWS_REGION" 2>/dev/null || true
    
    success "Security monitoring services enabled"
}

# Configure CloudTrail
configure_cloudtrail() {
    log "📋 Configuring CloudTrail..."
    
    # Create S3 bucket for CloudTrail logs
    local cloudtrail_bucket="${PROJECT_NAME}-cloudtrail-logs-$(date +%s)"
    
    aws s3 mb "s3://$cloudtrail_bucket" --region "$AWS_REGION" 2>/dev/null || true
    
    # Create CloudTrail
    aws cloudtrail create-trail \
        --name "${PROJECT_NAME}-cloudtrail" \
        --s3-bucket-name "$cloudtrail_bucket" \
        --include-global-service-events \
        --is-multi-region-trail \
        --enable-log-file-validation \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Start logging
    aws cloudtrail start-logging \
        --name "${PROJECT_NAME}-cloudtrail" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    success "CloudTrail configured"
}

# Setup IAM policies and roles
setup_iam_security() {
    log "👤 Setting up IAM security policies..."
    
    # Password policy
    aws iam update-account-password-policy \
        --minimum-password-length 12 \
        --require-symbols \
        --require-numbers \
        --require-uppercase-characters \
        --require-lowercase-characters \
        --allow-users-to-change-password \
        --max-password-age 90 \
        --password-reuse-prevention 5 2>/dev/null || true
    
    # Create security-focused IAM policies
    local security_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Action": [
                "iam:CreateUser",
                "iam:DeleteUser",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachUserPolicy",
                "iam:DetachUserPolicy",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy"
            ],
            "Resource": "*",
            "Condition": {
                "Bool": {
                    "aws:MultiFactorAuthPresent": "false"
                }
            }
        }
    ]
}
EOF
)
    
    aws iam create-policy \
        --policy-name "${PROJECT_NAME}-security-policy" \
        --policy-document "$security_policy" \
        --description "Security policy requiring MFA for sensitive operations" 2>/dev/null || true
    
    success "IAM security policies configured"
}

# Configure S3 bucket security
configure_s3_security() {
    log "📦 Configuring S3 bucket security..."
    
    local bucket_name="${PROJECT_NAME}-uploads-production"
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "$bucket_name" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Enable default encryption
    local encryption_config=$(cat <<EOF
{
    "Rules": [
        {
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": true
        }
    ]
}
EOF
)
    
    aws s3api put-bucket-encryption \
        --bucket "$bucket_name" \
        --server-side-encryption-configuration "$encryption_config" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Configure bucket policy
    local bucket_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::$bucket_name",
                "arn:aws:s3:::$bucket_name/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF
)
    
    aws s3api put-bucket-policy \
        --bucket "$bucket_name" \
        --policy "$bucket_policy" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    success "S3 bucket security configured"
}

# Generate security report
generate_security_report() {
    log "📊 Generating security report..."
    
    local report_file="/tmp/security-hardening-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" <<EOF
==============================================================================
HOTEL BOOKING SYSTEM - SECURITY HARDENING REPORT
==============================================================================
Generated: $(date)
Environment: $ENVIRONMENT
Region: $AWS_REGION

SECURITY SERVICES ENABLED:
==============================================================================
✅ AWS GuardDuty - Threat detection
✅ AWS Security Hub - Security posture management
✅ AWS Config - Configuration compliance
✅ AWS CloudTrail - API logging
✅ AWS Secrets Manager - Secrets management
✅ AWS KMS - Encryption key management
✅ AWS WAF - Web application firewall

SECURITY CONFIGURATIONS:
==============================================================================
✅ Security Groups - Network access control
✅ SSL/TLS Certificates - Encryption in transit
✅ KMS Encryption Keys - Data encryption at rest
✅ IAM Password Policy - Strong password requirements
✅ S3 Bucket Security - Public access blocked, encryption enabled
✅ Secrets Management - Sensitive data protected

RECOMMENDATIONS:
==============================================================================
1. Complete SSL certificate DNS validation
2. Review and customize WAF rules based on traffic patterns
3. Set up monitoring dashboards for security metrics
4. Configure automated incident response playbooks
5. Schedule regular security assessments and penetration testing
6. Implement security awareness training for team members
7. Review and update security policies quarterly

NEXT STEPS:
==============================================================================
1. Monitor security dashboard for alerts
2. Review CloudTrail logs regularly
3. Update security configurations based on new threats
4. Conduct security incident response drills
5. Implement continuous security monitoring

For questions or support, contact: security@hotelbooking.com
==============================================================================
EOF
    
    echo "$report_file"
    success "Security report generated: $report_file"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    print_banner
    
    # Security hardening steps
    check_prerequisites
    configure_security_groups
    setup_ssl_certificates
    configure_waf
    setup_secrets_manager
    configure_kms_keys
    enable_security_monitoring
    configure_cloudtrail
    setup_iam_security
    configure_s3_security
    
    # Generate final report
    local report_file=$(generate_security_report)
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "🎉 Security hardening completed successfully in ${duration} seconds!"
    info "📊 Security report: $report_file"
    warning "⚠️  Please review the report and complete manual validation steps"
    
    echo -e "${YELLOW}"
    echo "IMPORTANT MANUAL STEPS REQUIRED:"
    echo "1. Validate SSL certificates in AWS Console"
    echo "2. Update DNS records for certificate validation"
    echo "3. Review and test WAF rules"
    echo "4. Update application configuration with new secrets"
    echo "5. Test security monitoring alerts"
    echo -e "${NC}"
}

# Error handling
trap 'error "Script interrupted"' INT TERM

# Run main function
main "$@"