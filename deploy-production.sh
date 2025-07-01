#!/bin/bash

# Hotel Booking System - Production Deployment Script
# 史上最強の本番デプロイスクリプト - worker4実装
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
VERSION="${VERSION:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# AWS Configuration
ECS_CLUSTER="${PROJECT_NAME}-cluster"
BACKEND_SERVICE="${PROJECT_NAME}-backend-service"
FRONTEND_SERVICE="${PROJECT_NAME}-frontend-service"
BACKEND_REPOSITORY="${PROJECT_NAME}-backend"
FRONTEND_REPOSITORY="${PROJECT_NAME}-frontend"

# Deployment Settings
DEPLOY_TIMEOUT=600
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true
ENABLE_NOTIFICATIONS=true
DRY_RUN=false

# Print banner
print_banner() {
    echo -e "${PURPLE}"
    echo "██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗"
    echo "██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝"
    echo "██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ "
    echo "██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  "
    echo "██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   "
    echo "╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   "
    echo ""
    echo "🚀 Hotel Booking System - Production Deployment"
    echo "🎯 Environment: $ENVIRONMENT"
    echo "📦 Version: $VERSION"
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
    local required_tools=("aws" "docker" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed or not in PATH"
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi
    
    # Check required environment variables
    local required_vars=("AWS_ACCOUNT_ID")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Environment variable $var is not set"
        fi
    done
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        error "Docker is not running"
    fi
    
    # Validate AWS region
    if ! aws ec2 describe-regions --region-names "$AWS_REGION" &> /dev/null; then
        error "Invalid AWS region: $AWS_REGION"
    fi
    
    success "Prerequisites check completed"
}

# Pre-deployment validation
pre_deployment_validation() {
    log "🔍 Running pre-deployment validation..."
    
    # Check if cluster exists
    if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" &> /dev/null; then
        error "ECS cluster '$ECS_CLUSTER' not found"
    fi
    
    # Check if services exist
    if ! aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$BACKEND_SERVICE" --region "$AWS_REGION" &> /dev/null; then
        error "ECS service '$BACKEND_SERVICE' not found"
    fi
    
    if ! aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$FRONTEND_SERVICE" --region "$AWS_REGION" &> /dev/null; then
        error "ECS service '$FRONTEND_SERVICE' not found"
    fi
    
    # Check if ECR repositories exist
    if ! aws ecr describe-repositories --repository-names "$BACKEND_REPOSITORY" --region "$AWS_REGION" &> /dev/null; then
        error "ECR repository '$BACKEND_REPOSITORY' not found"
    fi
    
    if ! aws ecr describe-repositories --repository-names "$FRONTEND_REPOSITORY" --region "$AWS_REGION" &> /dev/null; then
        error "ECR repository '$FRONTEND_REPOSITORY' not found"
    fi
    
    # Validate current deployment
    local backend_status=$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$BACKEND_SERVICE" --region "$AWS_REGION" --query 'services[0].status' --output text)
    local frontend_status=$(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$FRONTEND_SERVICE" --region "$AWS_REGION" --query 'services[0].status' --output text)
    
    if [[ "$backend_status" != "ACTIVE" ]]; then
        warning "Backend service is not in ACTIVE state: $backend_status"
    fi
    
    if [[ "$frontend_status" != "ACTIVE" ]]; then
        warning "Frontend service is not in ACTIVE state: $frontend_status"
    fi
    
    success "Pre-deployment validation completed"
}

# Build and push Docker images
build_and_push_images() {
    log "🏗️ Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    # Build backend image
    log "Building backend image..."
    cd "$SCRIPT_DIR/backend"
    
    local backend_image="$ECR_REGISTRY/$BACKEND_REPOSITORY:$VERSION"
    docker build \
        --tag "$backend_image" \
        --tag "$ECR_REGISTRY/$BACKEND_REPOSITORY:latest" \
        --label "git.commit=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        --label "git.branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')" \
        --label "build.date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --label "build.environment=$ENVIRONMENT" \
        --label "build.version=$VERSION" \
        .
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log "Pushing backend image..."
        docker push "$backend_image"
        docker push "$ECR_REGISTRY/$BACKEND_REPOSITORY:latest"
    fi
    
    # Build frontend image
    log "Building frontend image..."
    cd "$SCRIPT_DIR/frontend"
    
    local frontend_image="$ECR_REGISTRY/$FRONTEND_REPOSITORY:$VERSION"
    docker build \
        --tag "$frontend_image" \
        --tag "$ECR_REGISTRY/$FRONTEND_REPOSITORY:latest" \
        --label "git.commit=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        --label "git.branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')" \
        --label "build.date=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --label "build.environment=$ENVIRONMENT" \
        --label "build.version=$VERSION" \
        .
    
    if [[ "$DRY_RUN" == "false" ]]; then
        log "Pushing frontend image..."
        docker push "$frontend_image"
        docker push "$ECR_REGISTRY/$FRONTEND_REPOSITORY:latest"
    fi
    
    cd "$SCRIPT_DIR"
    
    success "Docker images built and pushed successfully"
}

# Update ECS task definitions
update_task_definitions() {
    log "📋 Updating ECS task definitions..."
    
    local backend_image="$ECR_REGISTRY/$BACKEND_REPOSITORY:$VERSION"
    local frontend_image="$ECR_REGISTRY/$FRONTEND_REPOSITORY:$VERSION"
    
    # Update backend task definition
    log "Updating backend task definition..."
    local backend_task_def=$(aws ecs describe-task-definition \
        --task-definition "$BACKEND_SERVICE" \
        --region "$AWS_REGION" \
        --query 'taskDefinition')
    
    local updated_backend_task_def=$(echo "$backend_task_def" | jq \
        --arg IMAGE "$backend_image" \
        '.containerDefinitions[0].image = $IMAGE | 
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')
    
    if [[ "$DRY_RUN" == "false" ]]; then
        aws ecs register-task-definition \
            --region "$AWS_REGION" \
            --cli-input-json "$updated_backend_task_def" > /dev/null
    fi
    
    # Update frontend task definition
    log "Updating frontend task definition..."
    local frontend_task_def=$(aws ecs describe-task-definition \
        --task-definition "$FRONTEND_SERVICE" \
        --region "$AWS_REGION" \
        --query 'taskDefinition')
    
    local updated_frontend_task_def=$(echo "$frontend_task_def" | jq \
        --arg IMAGE "$frontend_image" \
        '.containerDefinitions[0].image = $IMAGE | 
         del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')
    
    if [[ "$DRY_RUN" == "false" ]]; then
        aws ecs register-task-definition \
            --region "$AWS_REGION" \
            --cli-input-json "$updated_frontend_task_def" > /dev/null
    fi
    
    success "Task definitions updated successfully"
}

# Deploy to ECS
deploy_to_ecs() {
    log "🚀 Deploying to ECS..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would deploy to ECS cluster '$ECS_CLUSTER'"
        return
    fi
    
    # Store current task definition ARNs for rollback
    local current_backend_task_def=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$BACKEND_SERVICE" \
        --region "$AWS_REGION" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    local current_frontend_task_def=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$FRONTEND_SERVICE" \
        --region "$AWS_REGION" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Update backend service
    log "Updating backend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$BACKEND_SERVICE" \
        --task-definition "$BACKEND_SERVICE" \
        --region "$AWS_REGION" \
        --force-new-deployment > /dev/null
    
    # Update frontend service
    log "Updating frontend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$FRONTEND_SERVICE" \
        --task-definition "$FRONTEND_SERVICE" \
        --region "$AWS_REGION" \
        --force-new-deployment > /dev/null
    
    success "ECS services updated successfully"
    
    # Store rollback information
    echo "$current_backend_task_def" > "/tmp/${PROJECT_NAME}_rollback_backend.txt"
    echo "$current_frontend_task_def" > "/tmp/${PROJECT_NAME}_rollback_frontend.txt"
}

# Wait for deployment to complete
wait_for_deployment() {
    log "⏳ Waiting for deployment to complete..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would wait for deployment completion"
        return
    fi
    
    local start_time=$(date +%s)
    local timeout_time=$((start_time + DEPLOY_TIMEOUT))
    
    # Wait for services to stabilize
    log "Waiting for services to stabilize..."
    
    while [[ $(date +%s) -lt $timeout_time ]]; do
        local backend_stable=$(aws ecs describe-services \
            --cluster "$ECS_CLUSTER" \
            --services "$BACKEND_SERVICE" \
            --region "$AWS_REGION" \
            --query 'services[0].deployments[?status==`PRIMARY`].rolloutState' \
            --output text)
        
        local frontend_stable=$(aws ecs describe-services \
            --cluster "$ECS_CLUSTER" \
            --services "$FRONTEND_SERVICE" \
            --region "$AWS_REGION" \
            --query 'services[0].deployments[?status==`PRIMARY`].rolloutState' \
            --output text)
        
        if [[ "$backend_stable" == "COMPLETED" && "$frontend_stable" == "COMPLETED" ]]; then
            success "Deployment completed successfully"
            return
        fi
        
        if [[ "$backend_stable" == "FAILED" || "$frontend_stable" == "FAILED" ]]; then
            error "Deployment failed"
        fi
        
        info "Backend: $backend_stable, Frontend: $frontend_stable - Waiting..."
        sleep 30
    done
    
    error "Deployment timeout after $DEPLOY_TIMEOUT seconds"
}

# Health check
health_check() {
    log "🏥 Running health checks..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would perform health checks"
        return
    fi
    
    local backend_url="https://api.hotelbooking.com"
    local frontend_url="https://hotelbooking.com"
    
    local start_time=$(date +%s)
    local timeout_time=$((start_time + HEALTH_CHECK_TIMEOUT))
    
    # Health check backend
    log "Checking backend health..."
    while [[ $(date +%s) -lt $timeout_time ]]; do
        if curl -f -s "$backend_url/api/health" > /dev/null; then
            success "Backend health check passed"
            break
        fi
        info "Backend health check failed, retrying in 10 seconds..."
        sleep 10
    done
    
    # Health check frontend
    log "Checking frontend health..."
    start_time=$(date +%s)
    timeout_time=$((start_time + HEALTH_CHECK_TIMEOUT))
    
    while [[ $(date +%s) -lt $timeout_time ]]; do
        if curl -f -s "$frontend_url/health" > /dev/null; then
            success "Frontend health check passed"
            break
        fi
        info "Frontend health check failed, retrying in 10 seconds..."
        sleep 10
    done
    
    # Run comprehensive health checks
    log "Running comprehensive health checks..."
    if [[ -x "$SCRIPT_DIR/production-config/run-security-tests.sh" ]]; then
        "$SCRIPT_DIR/production-config/run-security-tests.sh" quick || warning "Some security tests failed"
    fi
    
    success "Health checks completed"
}

# Rollback deployment
rollback_deployment() {
    log "🔄 Rolling back deployment..."
    
    if [[ ! -f "/tmp/${PROJECT_NAME}_rollback_backend.txt" ]] || [[ ! -f "/tmp/${PROJECT_NAME}_rollback_frontend.txt" ]]; then
        error "Rollback information not found"
    fi
    
    local rollback_backend_task_def=$(cat "/tmp/${PROJECT_NAME}_rollback_backend.txt")
    local rollback_frontend_task_def=$(cat "/tmp/${PROJECT_NAME}_rollback_frontend.txt")
    
    # Rollback backend service
    log "Rolling back backend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$BACKEND_SERVICE" \
        --task-definition "$rollback_backend_task_def" \
        --region "$AWS_REGION" > /dev/null
    
    # Rollback frontend service
    log "Rolling back frontend service..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$FRONTEND_SERVICE" \
        --task-definition "$rollback_frontend_task_def" \
        --region "$AWS_REGION" > /dev/null
    
    # Wait for rollback to complete
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$BACKEND_SERVICE" "$FRONTEND_SERVICE" \
        --region "$AWS_REGION"
    
    success "Rollback completed successfully"
}

# Send notifications
send_notifications() {
    local status="$1"
    local message="$2"
    
    if [[ "$ENABLE_NOTIFICATIONS" != "true" ]]; then
        return
    fi
    
    log "📧 Sending notifications..."
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" == "failure" ]]; then
            color="danger"
            emoji="❌"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Hotel Booking System Deployment\",\"attachments\":[{\"color\":\"$color\",\"fields\":[{\"title\":\"Status\",\"value\":\"$status\",\"short\":true},{\"title\":\"Environment\",\"value\":\"$ENVIRONMENT\",\"short\":true},{\"title\":\"Version\",\"value\":\"$VERSION\",\"short\":true},{\"title\":\"Message\",\"value\":\"$message\",\"short\":false}]}]}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || warning "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
        echo -e "Subject: Hotel Booking System Deployment - $status\n\n$message" | \
        mail -s "Deployment $status" "$NOTIFICATION_EMAIL" 2>/dev/null || warning "Failed to send email notification"
    fi
}

# Update CloudWatch dashboard
update_monitoring() {
    log "📊 Updating monitoring and metrics..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would update monitoring dashboard"
        return
    fi
    
    # Update CloudWatch dashboard
    if [[ -f "$SCRIPT_DIR/aws-infrastructure/cloudwatch-dashboard.json" ]]; then
        aws cloudwatch put-dashboard \
            --dashboard-name "HotelBooking-Production" \
            --dashboard-body "file://$SCRIPT_DIR/aws-infrastructure/cloudwatch-dashboard.json" \
            --region "$AWS_REGION" > /dev/null || warning "Failed to update CloudWatch dashboard"
    fi
    
    # Put deployment metrics
    aws cloudwatch put-metric-data \
        --namespace "HotelBooking/Deployments" \
        --metric-data \
            MetricName=DeploymentCount,Value=1,Unit=Count,Dimensions=[{Name=Environment,Value=$ENVIRONMENT}] \
            MetricName=DeploymentSuccess,Value=1,Unit=Count,Dimensions=[{Name=Environment,Value=$ENVIRONMENT}] \
        --region "$AWS_REGION" > /dev/null || warning "Failed to put deployment metrics"
    
    success "Monitoring updated successfully"
}

# Cleanup old resources
cleanup() {
    log "🧹 Cleaning up old resources..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        info "DRY RUN: Would cleanup old resources"
        return
    fi
    
    # Clean up old task definition revisions (keep latest 5)
    local backend_task_defs=$(aws ecs list-task-definitions \
        --family-prefix "$BACKEND_SERVICE" \
        --status ACTIVE \
        --region "$AWS_REGION" \
        --query 'taskDefinitionArns' \
        --output text | tr '\t' '\n' | tail -n +6)
    
    for task_def in $backend_task_defs; do
        aws ecs deregister-task-definition \
            --task-definition "$task_def" \
            --region "$AWS_REGION" > /dev/null || true
    done
    
    local frontend_task_defs=$(aws ecs list-task-definitions \
        --family-prefix "$FRONTEND_SERVICE" \
        --status ACTIVE \
        --region "$AWS_REGION" \
        --query 'taskDefinitionArns' \
        --output text | tr '\t' '\n' | tail -n +6)
    
    for task_def in $frontend_task_defs; do
        aws ecs deregister-task-definition \
            --task-definition "$task_def" \
            --region "$AWS_REGION" > /dev/null || true
    done
    
    # Clean up old ECR images (keep latest 10)
    aws ecr list-images \
        --repository-name "$BACKEND_REPOSITORY" \
        --filter tagStatus=UNTAGGED \
        --region "$AWS_REGION" \
        --query 'imageIds[?imageDigest!=null]|sort_by(@, &imagePushedAt)|[:-10]' \
        --output json | \
    jq '.[] | select(.imageDigest != null)' | \
    aws ecr batch-delete-image \
        --repository-name "$BACKEND_REPOSITORY" \
        --region "$AWS_REGION" \
        --image-ids file:///dev/stdin > /dev/null 2>&1 || true
    
    aws ecr list-images \
        --repository-name "$FRONTEND_REPOSITORY" \
        --filter tagStatus=UNTAGGED \
        --region "$AWS_REGION" \
        --query 'imageIds[?imageDigest!=null]|sort_by(@, &imagePushedAt)|[:-10]' \
        --output json | \
    jq '.[] | select(.imageDigest != null)' | \
    aws ecr batch-delete-image \
        --repository-name "$FRONTEND_REPOSITORY" \
        --region "$AWS_REGION" \
        --image-ids file:///dev/stdin > /dev/null 2>&1 || true
    
    # Clean up temporary files
    rm -f "/tmp/${PROJECT_NAME}_rollback_backend.txt" "/tmp/${PROJECT_NAME}_rollback_frontend.txt"
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    print_banner
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --no-notifications)
                ENABLE_NOTIFICATIONS=false
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --dry-run           Perform a dry run without making changes"
                echo "  --no-rollback       Disable automatic rollback on failure"
                echo "  --no-notifications  Disable deployment notifications"
                echo "  --version VERSION   Specify deployment version"
                echo "  --environment ENV   Specify environment (default: production)"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Deployment pipeline
    check_prerequisites
    pre_deployment_validation
    
    # Build and deploy
    if build_and_push_images && update_task_definitions && deploy_to_ecs; then
        if wait_for_deployment && health_check; then
            update_monitoring
            cleanup
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            success "🎉 Deployment completed successfully in ${duration} seconds!"
            send_notifications "success" "Deployment to $ENVIRONMENT completed successfully in ${duration} seconds"
        else
            if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
                warning "Deployment failed, initiating rollback..."
                rollback_deployment
                send_notifications "warning" "Deployment failed and was rolled back"
            else
                send_notifications "failure" "Deployment failed"
                error "Deployment failed"
            fi
        fi
    else
        send_notifications "failure" "Deployment build/push failed"
        error "Deployment build/push failed"
    fi
}

# Error handling
trap 'error "Script interrupted"' INT TERM

# Run main function
main "$@"