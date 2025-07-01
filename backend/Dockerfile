# Hotel Booking Backend - Production Docker Image
# 史上最強の本番環境Docker設定 - worker4実装
# Created: 2025-06-29

# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application (if needed)
RUN npm run build || echo "No build script found"

# Production stage
FROM node:18-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install security updates and runtime dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    tini \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Copy application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app .

# Remove unnecessary files
RUN rm -rf \
    tests/ \
    test/ \
    *.test.js \
    *.spec.js \
    .git/ \
    .github/ \
    docs/ \
    README.md \
    .env.example

# Create necessary directories
RUN mkdir -p logs tmp uploads && \
    chown -R nodejs:nodejs /app

# Security: Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Expose port
EXPOSE 8080

# Use tini as PID 1 for signal handling
ENTRYPOINT ["tini", "--"]

# Start application
CMD ["node", "src/index.js"]

# Labels for metadata
LABEL maintainer="worker4" \
      description="Hotel Booking System Backend" \
      version="1.0.0" \
      org.opencontainers.image.title="hotelbooking-backend" \
      org.opencontainers.image.description="Production-ready hotel booking backend service" \
      org.opencontainers.image.vendor="HotelBooking Inc." \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.created="2025-06-29" \
      org.opencontainers.image.source="https://github.com/company/hotelbooking" \
      org.opencontainers.image.licenses="MIT"