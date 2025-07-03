# Hotel Booking System - Terraform Variables
# AWS インフラ変数定義 - worker4実装

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "hotelbooking"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 1000
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "hotelbooking"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "hotelbooking_app"
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.medium"
}

# ECS Configuration
variable "ecs_cpu" {
  description = "ECS task CPU"
  type        = number
  default     = 1024
}

variable "ecs_memory" {
  description = "ECS task memory"
  type        = number
  default     = 2048
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 2
}

# Domain Configuration
variable "domain_names" {
  description = "List of domain names for the application"
  type        = list(string)
  default     = []
}

# Application Configuration
variable "app_environment" {
  description = "Application environment variables"
  type        = map(string)
  default     = {}
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging (ELK stack)"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Auto Scaling Configuration
variable "enable_auto_scaling" {
  description = "Enable auto scaling for ECS services"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 10
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "target_memory_utilization" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "spot_allocation_strategy" {
  description = "Spot allocation strategy"
  type        = string
  default     = "diversified"
}

# Notification Configuration
variable "sns_email_endpoints" {
  description = "List of email addresses for SNS notifications"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# ECR Configuration
variable "ecr_repository_names" {
  description = "List of ECR repository names"
  type        = list(string)
  default     = ["hotelbooking-backend", "hotelbooking-frontend"]
}

variable "ecr_lifecycle_policy" {
  description = "ECR lifecycle policy to manage image retention"
  type        = string
  default     = <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged images older than 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF
}

# CloudWatch Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "metric_filter_patterns" {
  description = "CloudWatch metric filter patterns"
  type        = map(string)
  default = {
    error_pattern = "[timestamp, request_id, \"ERROR\"]"
    warn_pattern  = "[timestamp, request_id, \"WARN\"]"
  }
}

# API Gateway Configuration (if needed)
variable "enable_api_gateway" {
  description = "Enable API Gateway for external API access"
  type        = bool
  default     = false
}

variable "api_gateway_throttle_rate" {
  description = "API Gateway throttle rate limit"
  type        = number
  default     = 1000
}

variable "api_gateway_throttle_burst" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 2000
}

# Route 53 Configuration
variable "enable_route53" {
  description = "Enable Route 53 for DNS management"
  type        = bool
  default     = false
}

variable "route53_zone_name" {
  description = "Route 53 hosted zone name"
  type        = string
  default     = ""
}

# ElastiCache Configuration
variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the replication group"
  type        = number
  default     = 2
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = true
}

variable "redis_multi_az" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = true
}

# S3 Configuration
variable "s3_versioning_enabled" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules"
  type = list(object({
    id     = string
    status = string
    transitions = list(object({
      days          = number
      storage_class = string
    }))
    expiration = object({
      days = number
    })
  }))
  default = [
    {
      id     = "delete_old_versions"
      status = "Enabled"
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 365
      }
    }
  ]
}

# Secrets Manager Configuration
variable "enable_secrets_manager" {
  description = "Enable AWS Secrets Manager for sensitive data"
  type        = bool
  default     = true
}

variable "secret_rotation_days" {
  description = "Number of days for automatic secret rotation"
  type        = number
  default     = 30
}

# Performance Configuration
variable "enable_elasticache_encryption" {
  description = "Enable encryption for ElastiCache"
  type        = bool
  default     = true
}

variable "enable_rds_encryption" {
  description = "Enable encryption for RDS"
  type        = bool
  default     = true
}

variable "rds_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}