# Hotel Booking System - Terraform Outputs
# AWS インフラ出力値 - worker4実装

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "database_username" {
  description = "Database username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "database_password" {
  description = "Database password"
  value       = random_password.db_password.result
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = random_password.redis_password.result
  sensitive   = true
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# IAM Outputs
output "ecs_execution_role_arn" {
  description = "ARN of the ECS execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 uploads bucket"
  value       = aws_s3_bucket.uploads.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 uploads bucket"
  value       = aws_s3_bucket.uploads.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.uploads.bucket_domain_name
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Hosted zone ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

# CloudWatch Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.arn
}

# ACM Certificate Outputs
output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

# SES Outputs
output "ses_domain_identity" {
  description = "SES domain identity"
  value       = length(aws_ses_domain_identity.main) > 0 ? aws_ses_domain_identity.main[0].domain : null
}

# Connection String Outputs (for application configuration)
output "database_url" {
  description = "Complete database connection URL"
  value       = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Complete Redis connection URL"
  value       = "redis://:${random_password.redis_password.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
  sensitive   = true
}

# Environment Configuration
output "environment_variables" {
  description = "Environment variables for the application"
  value = {
    NODE_ENV                = "production"
    DATABASE_URL           = "postgresql://${aws_db_instance.main.username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    REDIS_URL              = "redis://:${random_password.redis_password.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
    S3_BUCKET_NAME         = aws_s3_bucket.uploads.bucket
    AWS_REGION             = var.aws_region
    CLOUDFRONT_DOMAIN      = aws_cloudfront_distribution.main.domain_name
    LOG_GROUP_NAME         = aws_cloudwatch_log_group.ecs.name
  }
  sensitive = true
}

# Network Configuration
output "nat_gateway_ips" {
  description = "Public IP addresses of the NAT gateways"
  value       = aws_eip.nat[*].public_ip
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

# Monitoring and Logging
output "application_url" {
  description = "Application URL"
  value       = length(var.domain_names) > 0 ? "https://${var.domain_names[0]}" : "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "monitoring_endpoints" {
  description = "Monitoring and health check endpoints"
  value = {
    health_check = "/api/health"
    metrics      = "/api/metrics"
    logs         = "/api/logs"
  }
}

# Backup Information
output "backup_configuration" {
  description = "Backup configuration details"
  value = {
    rds_backup_window           = aws_db_instance.main.backup_window
    rds_backup_retention_period = aws_db_instance.main.backup_retention_period
    s3_versioning_enabled       = aws_s3_bucket_versioning.uploads.versioning_configuration[0].status
  }
}

# Security Information
output "security_configuration" {
  description = "Security configuration details"
  value = {
    rds_encryption_enabled   = aws_db_instance.main.storage_encrypted
    redis_encryption_enabled = aws_elasticache_replication_group.main.at_rest_encryption_enabled
    s3_encryption_enabled    = true
    vpc_flow_logs_enabled    = false # Add VPC flow logs if needed
  }
}

# Cost Information
output "estimated_monthly_costs" {
  description = "Estimated monthly costs (USD) - rough estimates"
  value = {
    rds      = "~$50-150 (depending on instance class)"
    redis    = "~$30-100 (depending on node type)"
    ecs      = "~$50-200 (depending on task count and size)"
    alb      = "~$20-30"
    cloudfront = "~$10-50 (depending on traffic)"
    s3       = "~$5-30 (depending on storage)"
    total    = "~$165-560 per month"
  }
}

# Deployment Information
output "deployment_info" {
  description = "Information needed for deployment"
  value = {
    cluster_name           = aws_ecs_cluster.main.name
    execution_role_arn     = aws_iam_role.ecs_execution.arn
    task_role_arn         = aws_iam_role.ecs_task.arn
    subnets               = aws_subnet.private[*].id
    security_groups       = [aws_security_group.ecs.id]
    log_group             = aws_cloudwatch_log_group.ecs.name
    target_group_arn      = aws_lb.main.arn
  }
}

# Terraform State Information
output "terraform_state_bucket" {
  description = "S3 bucket used for Terraform state"
  value       = "hotelbooking-terraform-state"
}

output "terraform_lock_table" {
  description = "DynamoDB table used for Terraform state locking"
  value       = "hotelbooking-terraform-locks"
}