# CORS & Connection Troubleshooting Guide

Quick reference for fixing frontend-to-backend connection issues.

## Quick Diagnosis

### Check 1: Health Endpoint
Test if the bridge is reachable:

```bash
# Local bridge
curl http://localhost:3001/health

# Render/Production bridge
curl https://kairo-bridge.onrender.com/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Multi-tenant WhatsApp Bridge is running",
  "activeSessions": 0
}
```

### Check 2: Browser Console
Open DevTools (F12) → Console tab. Look for:

✅ **Good signs:**
- `[WhatsApp] Registration successful`
- `[Groq] Request completed`

❌ **Bad signs:**
- `CORS policy: No 'Access-Control-Allow-Origin' header`
- `Failed to fetch`
- `NetworkError`
- `ERR_CONNECTION_REFUSED`

## Common Issues & Fixes

### Issue 1: CORS Error

**Symptom:**
```
Access to fetch at 'https://kairo-bridge.onrender.com/register' from origin 'https://kairocalender.web.app' has been blocked by CORS policy
```

**Cause:** Bridge doesn't recognize your frontend URL

**Fix:**

1. **Check bridge environment variables** in the Render dashboard → Environment tab
   - Ensure `CALENDAR_URL` and `ALLOWED_ORIGINS` are set

2. **Ensure these are set:**
   ```env
   CALENDAR_URL=https://kairocalender.web.app
   ALLOWED_ORIGINS=https://kairocalender.web.app,https://kairo.srinesh.in
   ```

3. **Redeploy:**
   Push a new commit, or use **Manual Deploy** → **Deploy latest commit** in Render dashboard.

4. **Check logs** in Render dashboard → Logs tab

### Issue 2: ngrok CORS Blocked

**Symptom:**
```
[CORS] Blocked request from origin: https://abc-123.ngrok-free.dev
```

**Fix:**
The CORS configuration now **automatically allows** ngrok and onrender.com domains. If still blocked:

1. Check bridge logs to confirm the origin being rejected
2. Add to `ALLOWED_ORIGINS` in `.env`:
   ```env
   ALLOWED_ORIGINS=https://abc-123.ngrok-free.dev
   ```
3. Restart bridge: `npm start`

### Issue 3: Localhost CORS in Dev

**Symptom:**
Frontend can't connect to bridge when both running locally

**Fix:**

1. **Frontend `.env`** should have:
   ```env
   VITE_BRIDGE_URL=
   ```
   (Empty = use Vite proxy)

2. **Vite config** should have proxy (already configured in `vite.config.js`):
   ```js
   proxy: {
     '/register': { target: 'http://localhost:3001' },
     '/users': { target: 'http://localhost:3001' },
     '/health': { target: 'http://localhost:3001' }
   }
   ```

3. **Bridge `.env`** should include:
   ```env
   CALENDAR_URL=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175
   ```

### Issue 4: Render Cold Start (Free Tier)

**Symptom:**
Frontend shows "Bridge server unreachable" after a period of inactivity

**Cause:** Render free tier services sleep after 15 min of inactivity

**Fix:**
- Wait 30-60 seconds and retry (the service needs time to wake up)
- Use [UptimeRobot](https://uptimerobot.com) or a similar service to ping `/health` every 5 min to keep it warm
- Upgrade to Render Starter plan ($7/mo) to eliminate cold starts

### Issue 5: Credentials Not Sent

**Symptom:**
```
Error: Bridge credentials not set
```

**Cause:** User not registered with bridge

**Fix:**
The app should auto-register on first login. Force re-registration:

1. Clear browser storage (DevTools → Application → Storage → Clear)
2. Sign out and sign back in
3. Check console for `[WhatsApp] Registration successful`

### Issue 6: Rate Limited

**Symptom:**
```
HTTP 429: Too many requests
```

**Cause:** Exceeded rate limit (120 requests/minute per user)

**Fix:**
- Wait 1 minute
- Check for polling loops in code
- Increase `VITE_POLL_INTERVAL` in frontend `.env`

## Debugging Steps

### 1. Check Bridge is Running

**Local:**
```bash
cd whatsapp-bridge
npm start
```

**Render:**
Check the Render dashboard → Logs tab

### 2. Verify Environment Variables

**Frontend:**
```bash
cat .env
```

**Bridge (Render):**
Render dashboard → Environment tab

**Bridge (Local):**
```bash
cd whatsapp-bridge
cat .env
```

### 3. Test CORS Manually

Using curl with origin header:

```bash
curl -H "Origin: https://kairocalender.web.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://kairo-bridge.onrender.com/health \
     -v
```

Look for:
```
< Access-Control-Allow-Origin: https://kairocalender.web.app
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 4. Check Network Tab

1. Open DevTools (F12) → Network tab
2. Try to connect to bridge
3. Click on failed request
4. Check "Response Headers":
   - Should have `Access-Control-Allow-Origin`
   - Should have `Access-Control-Allow-Credentials: true`

## Production Deployment Checklist

Before deploying to production:

- [ ] **Bridge env vars set in Render dashboard:**
  - `GROQ_API_KEY` (not placeholder)
  - `CALENDAR_URL` (production frontend URL)
  - `ALLOWED_ORIGINS` (all production URLs)
  - `BRIDGE_REQUIRE_AUTH=true`
  - `BRIDGE_ADMIN_API_KEY` (secure random key)

- [ ] **Frontend `.env` has:**
  - `VITE_BRIDGE_URL` (Render URL)
  - `VITE_USE_BRIDGE_PROXY=true`
  - `VITE_SUPABASE_URL` (production Supabase)
  - `VITE_SUPABASE_ANON_KEY` (production key)
  - **NO** `VITE_GROQ_API_KEY` (security risk!)

- [ ] **Deploy bridge first (auto-deploys on `git push`)**

- [ ] **Test health endpoint:**
  ```bash
  curl https://kairo-bridge.onrender.com/health
  ```

- [ ] **Build frontend:**
  ```bash
  npm run build
  ```

- [ ] **Test CORS from frontend URL**

## Quick Fixes Reference

| Problem | Quick Fix |
|---------|-----------|
| CORS error | Add origin to `ALLOWED_ORIGINS` → redeploy |
| Connection refused | Check bridge is running → Render dashboard |
| 404 Not Found | Verify Render URL is correct |
| 429 Rate Limited | Wait 1 minute |
| 401 Unauthorized | Clear storage, re-login |
| Bridge unreachable | Check `VITE_BRIDGE_URL` in frontend `.env` |
| Cold start (free tier) | Wait 30-60s, or use ping service to keep warm |

## Still Having Issues?

1. **Check Render logs** in the dashboard
2. **Check browser console** for detailed error messages
3. **Test with curl** to isolate frontend vs backend issues
4. **Verify all environment variables** are set correctly
5. **Compare with working local setup** — What's different?

## Emergency Reset

If nothing works:

```bash
# 1. Manual redeploy via Render dashboard
#    Go to Web Service → Manual Deploy → Deploy latest commit

# 2. Clear browser storage
#    DevTools → Application → Storage → Clear site data

# 3. Re-login to app

# 4. Check Render logs for errors
```
