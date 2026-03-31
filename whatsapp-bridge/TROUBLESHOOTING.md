# CORS & Connection Troubleshooting Guide

Quick reference for fixing frontend-to-backend connection issues.

## Quick Diagnosis

### Check 1: Health Endpoint
Test if the bridge is reachable:

```bash
# Local bridge
curl http://localhost:3001/health

# Railway/Production bridge
curl https://your-project.up.railway.app/health
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
Access to fetch at 'https://your-bridge.up.railway.app/register' from origin 'https://kairocalender.web.app' has been blocked by CORS policy
```

**Cause:** Bridge doesn't recognize your frontend URL

**Fix:**

1. **Check bridge environment variables**
   ```bash
   cd whatsapp-bridge
   railway variables
   ```

2. **Ensure these are set:**
   ```env
   CALENDAR_URL=https://kairocalender.web.app
   ALLOWED_ORIGINS=https://kairocalender.web.app,https://kairo.srinesh.in
   ```

3. **Redeploy:**
   ```bash
   railway up
   ```

4. **Check logs:**
   ```bash
   railway logs | grep CORS
   ```

### Issue 2: ngrok CORS Blocked

**Symptom:**
```
[CORS] Blocked request from origin: https://abc-123.ngrok-free.dev
```

**Fix:**
The CORS configuration now **automatically allows** ngrok domains. If still blocked:

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

### Issue 4: Railway Deployment URL Changed

**Symptom:**
Frontend shows "Bridge server unreachable" after redeployment

**Cause:** Railway may assign a new URL

**Fix:**

1. Get new URL:
   ```bash
   cd whatsapp-bridge
   railway status
   ```

2. Update frontend `.env`:
   ```env
   VITE_BRIDGE_URL=https://new-url.up.railway.app
   ```

3. Rebuild frontend:
   ```bash
   npm run build
   ```

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

**Railway:**
```bash
railway logs --follow
```

### 2. Verify Environment Variables

**Frontend:**
```bash
# Should show your variables
cat .env
```

**Bridge (Railway):**
```bash
railway variables
```

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
     https://your-bridge.up.railway.app/health \
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

- [ ] **Bridge `.env` has:**
  - `GROQ_API_KEY` (not placeholder)
  - `CALENDAR_URL` (production frontend URL)
  - `ALLOWED_ORIGINS` (all production URLs)
  - `BRIDGE_REQUIRE_AUTH=true`
  - `BRIDGE_ADMIN_API_KEY` (secure random key)

- [ ] **Frontend `.env` has:**
  - `VITE_BRIDGE_URL` (Railway URL)
  - `VITE_USE_BRIDGE_PROXY=true`
  - `VITE_SUPABASE_URL` (production Supabase)
  - `VITE_SUPABASE_ANON_KEY` (production key)
  - **NO** `VITE_GROQ_API_KEY` (security risk!)

- [ ] **Deploy bridge first:**
  ```bash
  cd whatsapp-bridge
  railway up
  ```

- [ ] **Test health endpoint:**
  ```bash
  curl https://your-bridge.up.railway.app/health
  ```

- [ ] **Build frontend:**
  ```bash
  npm run build
  ```

- [ ] **Test CORS from frontend URL**

## Quick Fixes Reference

| Problem | Quick Fix |
|---------|-----------|
| CORS error | Add origin to `ALLOWED_ORIGINS` → `railway up` |
| Connection refused | Check bridge is running → `railway logs` |
| 404 Not Found | Verify Railway URL is correct |
| 429 Rate Limited | Wait 1 minute |
| 401 Unauthorized | Clear storage, re-login |
| Bridge unreachable | Check `VITE_BRIDGE_URL` in frontend `.env` |
| Env vars not working | Railway: Set in dashboard, not `.env` |

## Still Having Issues?

1. **Check bridge logs:**
   ```bash
   railway logs --follow
   ```

2. **Check browser console** for detailed error messages

3. **Test with curl** to isolate frontend vs backend issues

4. **Verify all environment variables** are set correctly

5. **Compare with working local setup** - What's different?

## Emergency Reset

If nothing works:

```bash
# 1. Reset Railway project
railway down
railway up

# 2. Clear browser storage
# DevTools → Application → Storage → Clear site data

# 3. Re-login to app

# 4. Check logs
railway logs --follow
```
