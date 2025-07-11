# Backend Deployment Guide

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build for production**:
   ```bash
   npm run build:prod
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

## Required Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `JWT_SECRET`: A secure random string for JWT signing

## Deployment Status

The backend is configured to work with:
- ✅ Core hotel booking functionality
- ✅ Mock Prisma client (for deployment without database migrations)
- ✅ Basic email service
- ✅ Authentication routes
- ✅ Admin panel routes

## Known Issues

Some TypeScript compilation errors exist but do not prevent the JavaScript build from completing. The application will run with the generated JavaScript files.

## Port Configuration

Default port is 3000. Can be changed via the `PORT` environment variable.