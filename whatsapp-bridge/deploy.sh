#!/bin/bash
# WhatsApp Bridge Deployment Script for Railway
# Since the Railway project is not connected to Git, use `railway up` for manual deployment

set -e  # Exit on any error

echo "🚂 Deploying WhatsApp Bridge to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "📦 Install it with: npm install -g @railway/cli"
    echo "🔗 Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo "🔑 Run: railway login"
    exit 1
fi

# Check if linked to a project
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project"
    echo "🔗 Run: railway link"
    exit 1
fi

echo "✅ Railway CLI ready"
echo ""

# Show current project info
echo "📊 Current project:"
railway status
echo ""

# Confirm deployment
read -p "🤔 Deploy to Railway now? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Deploy using railway up (manual upload)
# IMPORTANT: Use --no-gitignore because parent .gitignore excludes sessions/ directory
# but we need sessions/manager.js (source code) to be uploaded
echo "📤 Uploading and deploying..."
railway up --no-gitignore

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 Check logs with: railway logs"
echo "🌐 Open dashboard: railway open"
echo "⚙️  Set environment variables in Railway dashboard if needed"
