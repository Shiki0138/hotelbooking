#!/bin/bash
# Secrets Management Script for Production
# Handles encryption, decryption, and rotation of sensitive data

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SECRETS_DIR="/etc/hotelbooking/secrets"
ENCRYPTION_KEY_PATH="/etc/hotelbooking/encryption.key"
BACKUP_DIR="/var/backups/hotelbooking/secrets"
LOG_FILE="/var/log/hotelbooking/secrets-manager.log"

# Create necessary directories
sudo mkdir -p "$SECRETS_DIR" "$BACKUP_DIR" "$(dirname "$LOG_FILE")"
sudo chmod 700 "$SECRETS_DIR" "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

# Generate encryption key if not exists
generate_encryption_key() {
    if [[ ! -f "$ENCRYPTION_KEY_PATH" ]]; then
        echo -e "${YELLOW}Generating new encryption key...${NC}"
        sudo openssl rand -hex 32 | sudo tee "$ENCRYPTION_KEY_PATH" > /dev/null
        sudo chmod 600 "$ENCRYPTION_KEY_PATH"
        log "Generated new encryption key"
        echo -e "${GREEN}✅ Encryption key generated${NC}"
    else
        echo -e "${GREEN}✅ Encryption key already exists${NC}"
    fi
}

# Encrypt a value
encrypt_value() {
    local value="$1"
    local key=$(sudo cat "$ENCRYPTION_KEY_PATH")
    
    # Generate random IV
    local iv=$(openssl rand -hex 16)
    
    # Encrypt using AES-256-GCM
    local encrypted=$(echo -n "$value" | openssl enc -aes-256-gcm -K "$key" -iv "$iv" -a -A)
    
    # Return format: IV:ENCRYPTED_DATA
    echo "ENCRYPTED:${iv}:${encrypted}"
}

# Decrypt a value
decrypt_value() {
    local encrypted_value="$1"
    local key=$(sudo cat "$ENCRYPTION_KEY_PATH")
    
    # Remove ENCRYPTED: prefix
    encrypted_value=${encrypted_value#ENCRYPTED:}
    
    # Split IV and encrypted data
    local iv=$(echo "$encrypted_value" | cut -d: -f1)
    local data=$(echo "$encrypted_value" | cut -d: -f2)
    
    # Decrypt
    echo -n "$data" | openssl enc -aes-256-gcm -K "$key" -iv "$iv" -d -a -A
}

# Generate secure password
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Setup production secrets
setup_production_secrets() {
    echo -e "${YELLOW}Setting up production secrets...${NC}"
    
    # Generate database passwords
    local db_app_password=$(generate_password 32)
    local db_readonly_password=$(generate_password 32)
    local db_admin_password=$(generate_password 32)
    local db_backup_password=$(generate_password 32)
    local db_monitor_password=$(generate_password 32)
    
    # Generate application secrets
    local jwt_secret=$(generate_password 64)
    local session_secret=$(generate_password 64)
    local redis_password=$(generate_password 32)
    
    # Create secrets file
    cat > /tmp/secrets.json << EOF
{
    "DB_PASSWORD": "$(encrypt_value "$db_app_password")",
    "DB_READONLY_PASSWORD": "$(encrypt_value "$db_readonly_password")",
    "DB_ADMIN_PASSWORD": "$(encrypt_value "$db_admin_password")",
    "DB_BACKUP_PASSWORD": "$(encrypt_value "$db_backup_password")",
    "DB_MONITOR_PASSWORD": "$(encrypt_value "$db_monitor_password")",
    "REDIS_PASSWORD": "$(encrypt_value "$redis_password")",
    "JWT_SECRET": "$(encrypt_value "$jwt_secret")",
    "SESSION_SECRET": "$(encrypt_value "$session_secret")"
}
EOF
    
    # Move to secure location
    sudo mv /tmp/secrets.json "$SECRETS_DIR/production-secrets.json"
    sudo chmod 600 "$SECRETS_DIR/production-secrets.json"
    
    # Create PostgreSQL password update script
    cat > /tmp/update_db_passwords.sql << EOF
-- Update database user passwords
ALTER USER hotelbooking_app PASSWORD '$db_app_password';
ALTER USER hotelbooking_readonly PASSWORD '$db_readonly_password';
ALTER USER hotelbooking_admin PASSWORD '$db_admin_password';
ALTER USER hotelbooking_backup PASSWORD '$db_backup_password';
ALTER USER hotelbooking_monitor PASSWORD '$db_monitor_password';
EOF
    
    sudo mv /tmp/update_db_passwords.sql "$SECRETS_DIR/update_db_passwords.sql"
    sudo chmod 600 "$SECRETS_DIR/update_db_passwords.sql"
    
    log "Generated production secrets"
    echo -e "${GREEN}✅ Production secrets generated${NC}"
    echo -e "${YELLOW}⚠️  Run the following command to update database passwords:${NC}"
    echo "sudo -u postgres psql -d lastminutestay -f $SECRETS_DIR/update_db_passwords.sql"
}

# Rotate secrets
rotate_secrets() {
    echo -e "${YELLOW}Rotating secrets...${NC}"
    
    # Backup current secrets
    local backup_file="$BACKUP_DIR/secrets-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    sudo tar -czf "$backup_file" -C "$SECRETS_DIR" .
    log "Backed up secrets to $backup_file"
    
    # Generate new JWT secret
    local new_jwt_secret=$(generate_password 64)
    
    # Update secrets file
    local secrets_file="$SECRETS_DIR/production-secrets.json"
    if [[ -f "$secrets_file" ]]; then
        # Read current secrets
        local current_secrets=$(sudo cat "$secrets_file")
        
        # Update JWT secret (implement dual-key rotation in app)
        local old_jwt_encrypted=$(echo "$current_secrets" | jq -r '.JWT_SECRET')
        local old_jwt=$(decrypt_value "$old_jwt_encrypted")
        
        # Create rotation file
        cat > /tmp/jwt-rotation.json << EOF
{
    "current": "$(encrypt_value "$new_jwt_secret")",
    "previous": "$old_jwt_encrypted",
    "rotated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
        
        sudo mv /tmp/jwt-rotation.json "$SECRETS_DIR/jwt-rotation.json"
        sudo chmod 600 "$SECRETS_DIR/jwt-rotation.json"
        
        # Update main secrets file
        echo "$current_secrets" | jq ".JWT_SECRET = \"$(encrypt_value "$new_jwt_secret")\"" | sudo tee "$secrets_file" > /dev/null
        
        log "Rotated JWT secret"
        echo -e "${GREEN}✅ Secrets rotated successfully${NC}"
    else
        echo -e "${RED}❌ Secrets file not found${NC}"
        exit 1
    fi
}

# Verify secrets
verify_secrets() {
    echo -e "${YELLOW}Verifying secrets...${NC}"
    
    local secrets_file="$SECRETS_DIR/production-secrets.json"
    if [[ ! -f "$secrets_file" ]]; then
        echo -e "${RED}❌ Secrets file not found${NC}"
        exit 1
    fi
    
    # Test decryption of each secret
    local secrets=$(sudo cat "$secrets_file")
    local all_good=true
    
    for key in $(echo "$secrets" | jq -r 'keys[]'); do
        local encrypted_value=$(echo "$secrets" | jq -r ".$key")
        if [[ "$encrypted_value" == ENCRYPTED:* ]]; then
            if decrypt_value "$encrypted_value" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ $key: Valid${NC}"
            else
                echo -e "${RED}❌ $key: Invalid${NC}"
                all_good=false
            fi
        else
            echo -e "${YELLOW}⚠️  $key: Not encrypted${NC}"
            all_good=false
        fi
    done
    
    if [[ "$all_good" == true ]]; then
        log "All secrets verified successfully"
        echo -e "${GREEN}✅ All secrets are valid${NC}"
    else
        log "Some secrets failed verification"
        echo -e "${RED}❌ Some secrets are invalid${NC}"
        exit 1
    fi
}

# Export secrets for application
export_secrets() {
    local output_file="${1:-.secrets.enc}"
    echo -e "${YELLOW}Exporting secrets...${NC}"
    
    local secrets_file="$SECRETS_DIR/production-secrets.json"
    if [[ ! -f "$secrets_file" ]]; then
        echo -e "${RED}❌ Secrets file not found${NC}"
        exit 1
    fi
    
    # Copy encrypted secrets
    sudo cp "$secrets_file" "$output_file"
    sudo chown $(whoami):$(whoami) "$output_file"
    chmod 600 "$output_file"
    
    log "Exported secrets to $output_file"
    echo -e "${GREEN}✅ Secrets exported to $output_file${NC}"
}

# Main menu
case "${1:-help}" in
    init)
        generate_encryption_key
        setup_production_secrets
        ;;
    rotate)
        rotate_secrets
        ;;
    verify)
        verify_secrets
        ;;
    export)
        export_secrets "${2:-.secrets.enc}"
        ;;
    encrypt)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 encrypt <value>"
            exit 1
        fi
        encrypt_value "$2"
        ;;
    decrypt)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 decrypt <encrypted_value>"
            exit 1
        fi
        decrypt_value "$2"
        ;;
    *)
        echo "Hotel Booking System - Secrets Manager"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init     - Initialize secrets for production"
        echo "  rotate   - Rotate secrets (JWT, etc.)"
        echo "  verify   - Verify all secrets are valid"
        echo "  export   - Export encrypted secrets file"
        echo "  encrypt  - Encrypt a single value"
        echo "  decrypt  - Decrypt a single value"
        echo ""
        echo "Examples:"
        echo "  $0 init"
        echo "  $0 rotate"
        echo "  $0 encrypt 'my-secret-password'"
        echo "  $0 decrypt 'ENCRYPTED:iv:data'"
        ;;
esac