# WhatsApp Bridge Deployment Guide

This guide covers deploying the WhatsApp Bridge server to Render using Git-connected auto-deploy.

## Prerequisites

1. **Render Account** - Sign up at [render.com](https://render.com)
2. **GitHub Repository** - Your Kairo project must be pushed to GitHub
3. **Docker Hub Access** (optional) - Only if you need private image caching

## Setup (One-Time)

### Option A: Blueprint Deploy (render.yaml — Recommended)

The root `render.yaml` defines the entire service. After pushing to GitHub:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and creates the service

### Option B: Manual Setup in Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `kairo-bridge`
   - **Root Directory:** `whatsapp-bridge`
   - **Environment:** `Docker`
   - **Health Check Path:** `/health`
5. Add environment variables (see below)
6. Click **Create Web Service**

## Environment Variables

Set these in the **Render Dashboard** → **Environment** tab:

### Required Variables

```env
# Node environment
NODE_ENV=production

# Groq API Configuration
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_TEXT_MODEL=llama-3.1-8b-instant
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# CORS Configuration
CALENDAR_URL=https://kairocalender.web.app
ALLOWED_ORIGINS=https://kairocalender.web.app,https://kairocalender.firebaseapp.com,https://kairo.srinesh.in

# Authentication
BRIDGE_REQUIRE_AUTH=true

# Supabase (single source of truth for state)
# Service role key — server only. NEVER ship to frontend.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key

# Render sets PORT automatically - DO NOT set PORT or BRIDGE_PORT
```

### Supabase Migration

Run `supabase/whatsapp_rebuild.sql` in the Supabase SQL Editor before deploying.
Adds the tables the bridge writes to: `whatsapp_status`, `whatsapp_chats`,
`whatsapp_watched_groups`, `whatsapp_events`. Idempotent.

### Important Notes

- **DO NOT set PORT or BRIDGE_PORT** - Render automatically injects the correct port
- **DO NOT commit .env files** - Set variables in Render dashboard
- **Keep GROQ_API_KEY secure** - Never expose in frontend code

## Deployment

Render auto-deploys on every push to the connected branch:

```bash
git push origin main
```

That's it. No CLI, no manual uploads. Render watches your branch and builds/deploys automatically.

## Post-Deployment

### 1. Get Your Render URL

Your service URL will be:
```
https://kairo-bridge.onrender.com
```

Or check the Render dashboard for the exact URL.

### 2. Update Frontend Configuration

Update your **frontend `.env`** file:

```env
# Set this to your Render URL
VITE_BRIDGE_URL=https://kairo-bridge.onrender.com
VITE_USE_BRIDGE_PROXY=true
```

### 3. Test the Deployment

Check if the bridge is running:

```bash
curl https://kairo-bridge.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Multi-tenant WhatsApp Bridge is running",
  "activeSessions": 0,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Monitoring

### View Logs

Logs are available in the Render dashboard under the **Logs** tab. You can also stream them via:

```bash
# Install Render CLI (optional — for log streaming only)
npm install -g @render/cli

# Stream logs
render logs
```

### Check Status

Status and metrics are visible in the Render dashboard.

## Troubleshooting

### CORS Errors

**Symptom:** Frontend shows "Not allowed by CORS" or "CORS error"

**Solution:**
1. Check `ALLOWED_ORIGINS` in Render dashboard includes your frontend URL
2. Check `CALENDAR_URL` is set correctly
3. Render auto-allows `*.onrender.com` and `*.ngrok-free.dev` domains
4. Push a new commit to trigger redeploy, or use **Manual Deploy** → **Deploy latest commit** in dashboard

### Bridge Not Connecting

**Symptom:** Frontend shows "Bridge server unreachable"

**Solution:**
1. Verify the service is running in Render dashboard
2. Check the service URL matches your `VITE_BRIDGE_URL`
3. Wait 30-60 seconds — free-tier Render services spin down after inactivity and take a moment to wake up
4. Test health endpoint: `curl https://kairo-bridge.onrender.com/health`

### Cold Starts on Free Tier

On Render's free tier, web services **spin down after 15 minutes of inactivity**. The first request after a spin-down will take 30-60 seconds to respond (Chromium startup). Use a health check ping service like [UptimeRobot](https://uptimerobot.com) to keep it warm.

### Build Failures

**Symptom:** Deployment fails during build

**Solution:**
1. Check the Dockerfile exists in `whatsapp-bridge/`
2. Verify `render.yaml` at repo root has `rootDir: whatsapp-bridge`
3. Check Render logs for specific build errors

## Local Testing Before Deployment

### Start Bridge Locally

```bash
cd whatsapp-bridge
npm install
npm start
```

Bridge runs on `http://localhost:3001`

### Test with ngrok (Optional)

For testing with your deployed frontend:

```bash
ngrok http 3001
```

Update frontend `.env`:
```env
VITE_BRIDGE_URL=https://your-subdomain.ngrok-free.dev
```

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in Render
- [ ] Set secure `BRIDGE_ADMIN_API_KEY`
- [ ] Set `BRIDGE_REQUIRE_AUTH=true`
- [ ] Add all frontend URLs to `ALLOWED_ORIGINS`
- [ ] Test CORS with production frontend URL
- [ ] Verify GROQ_API_KEY is valid
- [ ] Remove `VITE_GROQ_API_KEY` from frontend `.env`
- [ ] Set `VITE_USE_BRIDGE_PROXY=true` in frontend
- [ ] Test health endpoint
- [ ] Monitor logs for errors
- [ ] Consider upgrading from Free to Starter plan to avoid cold starts

## Security Notes

1. **Never commit `.env` files** - Use Render dashboard for variables
2. **Use bridge proxy in production** - Never expose GROQ_API_KEY in frontend
3. **Regenerate BRIDGE_ADMIN_API_KEY** - Use a secure random key
4. **Enable authentication** - Set `BRIDGE_REQUIRE_AUTH=true`
5. **Limit CORS origins** - Only allow your actual frontend domains

## Need Help?

- Render Docs: https://docs.render.com
- Kairo Issues: https://github.com/your-repo/kairo/issues
- Render Status: https://status.render.com
