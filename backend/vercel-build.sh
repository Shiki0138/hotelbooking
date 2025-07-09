#!/bin/bash
# Vercel build script

echo "Installing production dependencies..."
npm ci --production

echo "Generating Prisma client..."
npx prisma generate

echo "Build completed!"