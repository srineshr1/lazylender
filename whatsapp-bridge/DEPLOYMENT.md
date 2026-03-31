# WhatsApp Bridge Deployment Guide

This guide covers deploying the WhatsApp Bridge server to Railway using manual deployment (`railway up`).

## Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Railway CLI** - Install globally:
   ```bash
   npm install -g @railway/cli
   ```
3. **Railway Project** - Create a new project in Railway dashboard

## Initial Setup

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

Verify installation:
```bash
railway --version
```

### 2. Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### 3. Link to Your Railway Project

Navigate to the bridge directory:
```bash
cd whatsapp-bridge
```

Link to your Railway project:
```bash
railway link
```

Select your project from the list, or create a new one.

## Environment Variables

Set these in the **Railway Dashboard** → **Variables** tab:

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
BRIDGE_ADMIN_API_KEY=generate_a_long_random_secure_key_here

# Railway sets PORT automatically - DO NOT set it manually
```

### Important Notes

- **DO NOT set PORT** - Railway automatically injects the correct port
- **DO NOT commit .env files** - Set variables in Railway dashboard
- **Keep GROQ_API_KEY secure** - Never expose in frontend code

## Deployment

### Method 1: Using Deployment Script (Recommended)

**Windows:**
```bash
deploy.bat
```

**Linux/Mac/Git Bash:**
```bash
bash deploy.sh
```

The script will:
1. Check Railway CLI is installed
2. Verify you're logged in
3. Confirm you're linked to a project
4. Upload and deploy your code

### Method 2: Manual Deployment

```bash
cd whatsapp-bridge
railway up
```

This uploads your local code directly to Railway (bypasses Git).

## Post-Deployment

### 1. Get Your Railway URL

```bash
railway status
```

Or check the Railway dashboard. It will be something like:
```
https://your-project-name.up.railway.app
```

### 2. Update Frontend Configuration

Update your **frontend `.env`** file:

```env
# Set this to your Railway URL
VITE_BRIDGE_URL=https://your-project-name.up.railway.app
VITE_USE_BRIDGE_PROXY=true
```

### 3. Test the Deployment

Check if the bridge is running:

```bash
curl https://your-project-name.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Multi-tenant WhatsApp Bridge is running",
  "activeSessions": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Monitoring

### View Logs

```bash
railway logs
```

Follow logs in real-time:
```bash
railway logs --follow
```

### Check Status

```bash
railway status
```

### Open Dashboard

```bash
railway open
```

## Troubleshooting

### CORS Errors

**Symptom:** Frontend shows "Not allowed by CORS" or "CORS error"

**Solution:**
1. Check `ALLOWED_ORIGINS` in Railway dashboard includes your frontend URL
2. Check `CALENDAR_URL` is set correctly
3. Redeploy after changing variables: `railway up`
4. Check logs for CORS messages: `railway logs`

### Bridge Not Connecting

**Symptom:** Frontend shows "Bridge server unreachable"

**Solution:**
1. Verify Railway service is running: `railway status`
2. Check Railway URL is correct in frontend `.env`
3. Test health endpoint: `curl https://your-project.up.railway.app/health`
4. Check Railway logs: `railway logs`

### API Key Errors

**Symptom:** "Invalid Groq API key" or authentication errors

**Solution:**
1. Verify `GROQ_API_KEY` is set in Railway dashboard
2. Test the key at [console.groq.com](https://console.groq.com)
3. Redeploy: `railway up`

### Build Failures

**Symptom:** Deployment fails during build

**Solution:**
1. Check Dockerfile exists in `whatsapp-bridge/`
2. Verify `railway.toml` is configured correctly
3. Check logs for specific error: `railway logs`
4. Ensure all dependencies are in `package.json`

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `railway login` | Authenticate with Railway |
| `railway link` | Link to a Railway project |
| `railway up` | Deploy current directory |
| `railway logs` | View deployment logs |
| `railway status` | Check project status |
| `railway open` | Open Railway dashboard |
| `railway variables` | Manage environment variables |

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

- [ ] Set `NODE_ENV=production` in Railway
- [ ] Set secure `BRIDGE_ADMIN_API_KEY`
- [ ] Set `BRIDGE_REQUIRE_AUTH=true`
- [ ] Add all frontend URLs to `ALLOWED_ORIGINS`
- [ ] Test CORS with production frontend URL
- [ ] Verify GROQ_API_KEY is valid
- [ ] Remove `VITE_GROQ_API_KEY` from frontend `.env`
- [ ] Set `VITE_USE_BRIDGE_PROXY=true` in frontend
- [ ] Test health endpoint
- [ ] Monitor logs for errors

## Security Notes

1. **Never commit `.env` files** - Use Railway dashboard for variables
2. **Use bridge proxy in production** - Never expose GROQ_API_KEY in frontend
3. **Regenerate BRIDGE_ADMIN_API_KEY** - Use a secure random key
4. **Enable authentication** - Set `BRIDGE_REQUIRE_AUTH=true`
5. **Limit CORS origins** - Only allow your actual frontend domains

## Need Help?

- Railway Docs: https://docs.railway.app
- Kairo Issues: https://github.com/your-repo/kairo/issues
- Railway Discord: https://discord.gg/railway
