# 🚀 WhatsApp Multi-Tenant System - Complete Setup Guide

## ✅ What's Been Fixed

### 1. **Backend (WhatsApp Bridge)**
- ✅ Multi-tenant architecture complete
- ✅ Per-user session isolation
- ✅ API key authentication
- ✅ Increased Puppeteer timeout to 180 seconds
- ✅ Added `--single-process` flag to prevent Chrome crashes
- ✅ Clean session management

### 2. **Frontend Integration**
- ✅ WhatsAppPopup component created
- ✅ TopBar WhatsApp icon wired
- ✅ WhatsAppTab updated with multi-tenant API
- ✅ Auto-registration with bridge on login
- ✅ Proper error handling and loading states

### 3. **Database**
- ✅ `bridge_api_keys` table created in Supabase
- ✅ RLS policies configured
- ✅ Auto-generation of API keys
- ✅ Helper functions for frontend

---

## 🖥️ Running the System

### **Backend (WhatsApp Bridge)**
```bash
cd C:\Users\Ricky\Desktop\ai-calendar\whatsapp-bridge
pm2 start bridge-server.js --name "whatsapp-bridge-multi"
pm2 save

# Check status
pm2 status

# View logs
pm2 logs whatsapp-bridge-multi --lines 50

# Restart
pm2 restart whatsapp-bridge-multi
```

### **Frontend (React App)**
```bash
cd C:\Users\Ricky\Desktop\ai-calendar
npm run dev
```

### **Test Page**
Open in browser: `C:\Users\Ricky\Desktop\ai-calendar\test-whatsapp-flow.html`

---

## 🧪 Testing the WhatsApp Connection

### **Method 1: Using the React App**

1. **Start both servers** (backend + frontend)
2. **Open frontend** in browser (http://localhost:5177 or assigned port)
3. **Sign in** with test account:
   - Email: `testuser1@example.com`
   - Password: `TestPass123!`
4. **Click WhatsApp icon** in top bar (green phone)
5. **Click "Connect WhatsApp"**
6. **Wait 1-3 minutes** for QR code to appear
   - First time takes longer (Chrome download)
   - Watch bridge logs: `pm2 logs whatsapp-bridge-multi -f`
7. **Scan QR code** with your phone
8. **Connection complete!** → View groups

### **Method 2: Using Test HTML Page**

1. **Start backend** (pm2 start)
2. **Open**: `C:\Users\Ricky\Desktop\ai-calendar\test-whatsapp-flow.html`
3. **Enter User ID**: `test-user-001` (or any unique ID)
4. **Click "Register with Bridge"**
5. **Click "Connect WhatsApp"**
6. **Watch logs** in the page
7. **QR code appears** → Scan with phone
8. **Click "Get Groups"** after connection

---

## 🔍 Troubleshooting

### **Issue: "Connecting..." Forever**

**Symptoms:**
- Frontend shows "Connecting..." but no QR code
- Bridge logs show timeout or context destroyed errors

**Solutions:**

**Option 1: Check Bridge Logs**
```bash
pm2 logs whatsapp-bridge-multi --lines 50
```

Look for:
- ✅ Good: `📱 QR Code generated`
- ❌ Bad: `Execution context was destroyed`
- ❌ Bad: `Runtime.callFunctionOn timed out`

**Option 2: Clean Sessions and Retry**
```bash
# Stop bridge
pm2 stop whatsapp-bridge-multi

# Clean all sessions
rm -rf whatsapp-bridge/sessions/user_*

# Restart
pm2 restart whatsapp-bridge-multi

# Try connecting again
```

**Option 3: Increase Timeout Further**
If still timing out, edit `whatsapp-bridge/sessions/clientFactory.js`:
```javascript
protocolTimeout: 300000,  // 5 minutes
timeout: 300000
```

Then restart: `pm2 restart whatsapp-bridge-multi`

---

### **Issue: Chrome/Puppeteer Crashes**

**Symptoms:**
- `Execution context was destroyed`
- `Protocol error`

**Solutions:**

**Check if running in single-process mode:**
The fix is already applied in `clientFactory.js`:
```javascript
args: [
  '--single-process',  // ← This prevents multi-process crashes
  '--no-sandbox',
  '--disable-setuid-sandbox',
  // ... other args
]
```

**If still crashing, try headless: false for debugging:**
```javascript
puppeteer: {
  headless: false,  // Opens visible Chrome window
  // ... rest of config
}
```

This lets you see what's happening in the browser.

---

### **Issue: No API Key / Registration Failed**

**Symptoms:**
- Frontend shows "Please sign in to connect WhatsApp"
- LocalStorage missing `bridge_user_id` or `bridge_api_key`

**Solutions:**

**Check if bridge is running:**
```bash
curl http://localhost:3001/health
```

**Check Supabase table:**
1. Go to Supabase Dashboard
2. Table Editor → `bridge_api_keys`
3. Verify user has an API key

**Force re-registration:**
1. Sign out from frontend
2. Clear localStorage in browser DevTools
3. Sign in again
4. Check AuthContext logs in console

---

### **Issue: CORS Errors**

**Symptoms:**
- Browser console shows CORS errors
- Frontend can't connect to backend

**Solutions:**

**Check ALLOWED_ORIGINS in bridge:**
Edit `whatsapp-bridge/.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180
```

Then restart: `pm2 restart whatsapp-bridge-multi`

---

## 📊 Health Check Checklist

Run these commands to verify everything is working:

```bash
# 1. Backend running?
pm2 status
# Expected: whatsapp-bridge-multi | online

# 2. Backend healthy?
curl http://localhost:3001/health
# Expected: {"status":"ok"...}

# 3. Clean sessions?
ls whatsapp-bridge/sessions/
# Expected: Only clientFactory.js and manager.js (no user_ folders yet)

# 4. Frontend running?
# Check browser - should see app on localhost:517X

# 5. Database schema applied?
# Check Supabase Table Editor - should see bridge_api_keys table
```

---

## 🎯 Expected Behavior

### **First Connection (No QR Code Yet)**
1. Click "Connect WhatsApp"
2. Shows "Connecting..." for **1-3 minutes**
3. Bridge downloads Chrome (first time only)
4. Bridge initializes WhatsApp Web
5. QR code appears
6. Scan with phone
7. Status changes to "Connected"

### **Subsequent Connections**
1. Click "Connect WhatsApp"
2. Shows "Connecting..." for **10-30 seconds**
3. QR code appears faster (Chrome already downloaded)
4. Scan with phone
5. Connected

### **If Session Persists**
- No QR code needed
- Reconnects automatically
- Shows "Connected" immediately

---

## 🔧 Configuration Files

### **Backend Config**
`whatsapp-bridge/.env`:
```env
BRIDGE_PORT=3001
CALENDAR_URL=http://localhost:5177
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177
BRIDGE_REQUIRE_AUTH=true
```

### **Frontend Config**
`.env`:
```env
VITE_BRIDGE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xzyavsgnzuykadbljzgb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_GROQ_API_KEY=gsk_...
```

---

## 📝 Key Files Modified

### **Backend:**
- `whatsapp-bridge/sessions/clientFactory.js` - Added timeout, single-process mode
- `whatsapp-bridge/bridge-server.js` - Multi-tenant endpoints (already done)
- `whatsapp-bridge/middleware/bridgeAuth.js` - API key auth (already done)

### **Frontend:**
- `src/components/WhatsApp/WhatsAppPopup.jsx` - NEW popup component
- `src/components/Calendar/TopBar.jsx` - Wired WhatsApp icon
- `src/components/Modal/tabs/WhatsAppTab.jsx` - Updated API calls
- `src/api/whatsappClient.js` - Multi-tenant client (already done)
- `src/contexts/AuthContext.jsx` - Auto-registration (already done)

### **Test Files:**
- `test-whatsapp-flow.html` - Standalone test page

---

## 🚨 Known Limitations

1. **First connection is slow** - Chrome download can take 1-3 minutes
2. **Single-process mode** - Reduced performance but more stable
3. **Memory usage** - Each WhatsApp session uses ~100MB RAM
4. **Windows-specific** - Some Puppeteer args are optimized for Windows

---

## 🎉 Success Criteria

Your system is working correctly when:

✅ Backend shows `online` in PM2  
✅ Health endpoint returns `{"status":"ok"}`  
✅ Frontend shows WhatsApp icon in TopBar  
✅ Clicking icon opens popup  
✅ "Connect WhatsApp" button works  
✅ QR code appears (may take 1-3 min first time)  
✅ Scanning QR connects successfully  
✅ Groups are fetched and displayed  
✅ Multiple users can connect simultaneously  
✅ Each user has separate session directory  

---

## 📞 Next Steps

After verifying WhatsApp connection works:

1. **Test multi-user isolation** - Connect 2 different users
2. **Implement group watching** - Select which groups to monitor
3. **Add event processing** - Extract events from messages
4. **Deploy to production** - VPS setup with PM2 startup

---

**Everything is set up and ready to test!** 🚀

Open the test page or start the frontend to begin testing WhatsApp connections.
