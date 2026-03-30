# Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND - Firebase Hosting                                     │
│  URL: https://kairo.srinesh.in (or custom domain)               │
│  Build: dist/                                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ API calls (HTTPS/WebSocket)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  WHATSAPP BRIDGE - Persistent Server (NOT Vercel)               │
│  ⚠️  WhatsApp requires persistent connections                   │
│  ⚠️  Serverless (Vercel, AWS Lambda) will NOT work             │
│                                                                  │
│  Recommended hosting:                                            │
│  - Railway (railway.app) - $5/mo starter                       │
│  - Render - Free tier available                                 │
│  - Fly.io - Free tier available                                 │
│  - DigitalOcean Droplet - $4/mo                                 │
│  - Any VPS with Node.js support                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Deployment (Firebase)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Initialize Firebase (first time only)
```bash
firebase init hosting
# Select: Use existing project
# Select: kairo (or your project ID)
# Public directory: dist
# Single-page app: Yes
# Don't overwrite index.html
```

### 3. Deploy
```bash
npm run build  # Build first
firebase deploy
```

### Custom Domain (optional)
```bash
firebase hosting:sites:create kairo-app
firebase hosting:domain:add kairo.srinesh.in
```

---

## WhatsApp Bridge Deployment (Fly.io)

### 1. Install Fly CLI
```bash
npm install -g flyctl
flyctl auth login
```

### 2. Create volume for WhatsApp sessions
WhatsApp sessions must persist across restarts.
```bash
flyctl volumes create whatsapp_sessions --region iad
```

### 3. Deploy the bridge
```bash
cd whatsapp-bridge
flyctl deploy
```

### 4. Set secrets in Fly dashboard or CLI
```bash
# Required secrets
flyctl secrets set GROQ_API_KEY=your_groq_api_key

# Optional configuration
flyctl secrets set BRIDGE_PORT=3001
flyctl secrets set CALENDAR_URL=https://your-frontend-url.com
flyctl secrets set ALLOWED_ORIGINS=https://your-frontend-url.com
flyctl secrets set BRIDGE_ADMIN_API_KEY=your-secure-admin-key
```

### 5. Get bridge URL
```bash
flyctl info
```
Look for `Hostname` - something like `kairo-bridge.fly.dev`

### 6. Update frontend .env
```
VITE_BRIDGE_URL=https://kairo-bridge.fly.dev
```

### 7. Rebuild and redeploy frontend
```bash
npm run build
firebase deploy
```

### Useful Fly Commands
```bash
flyctl logs                           # View logs
flyctl ssh console                    # SSH into container
flyctl machine list                   # List machines
flyctl machine stop <id>              # Stop machine
flyctl machine restart <id>           # Restart machine
flyctl secrets list                   # List secrets
```

---

## Vercel Bridge (NOT RECOMMENDED)

⚠️ **Vercel serverless functions will NOT work for WhatsApp bridge**

WhatsApp Baileys requires:
- Persistent WebSocket connections
- Long-running processes
- File system access for session storage

Serverless functions:
- Timeout after 10-30 seconds
- Don't maintain persistent connections
- File system is ephemeral

If you still want to try, use Vercel Serverless Functions with WebSockets (paid feature):
```json
// vercel.json
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "memory": 3008,
      "timeout": 60
    }
  }
}
```

But expect it to disconnect frequently and lose WhatsApp sessions.

---

## Environment Variables Summary

### Frontend (.env)
```
VITE_BRIDGE_URL=https://your-bridge-url.railway.app
VITE_USE_BRIDGE_PROXY=true
```

### Bridge Server (Railway/Render env vars)
```
GROQ_API_KEY=your_groq_key
BRIDGE_PORT=3001
ALLOWED_ORIGINS=https://kairo.srinesh.in
CALENDAR_URL=https://kairo.srinesh.in
```
