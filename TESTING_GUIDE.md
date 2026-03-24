# Development Mode Testing Guide

## Current Status

✅ **Server Running:** http://localhost:5175  
✅ **Auth Mode:** DISABLED (dev mode - no Supabase required)  
✅ **Build:** Successfully compiled

## Expected Behavior

Since there are no Supabase credentials in `.env`, the app runs in **development mode**:

- ✅ No authentication required
- ✅ Calendar loads directly (no login page)
- ✅ All features work with localStorage
- ✅ Login/Signup pages exist but are non-functional (expected)

## Testing Checklist

### 1. Main Application (http://localhost:5175)
- [ ] Calendar loads without showing login page
- [ ] Can add new events
- [ ] Can edit existing events
- [ ] Can delete events
- [ ] Dark mode toggle works
- [ ] Week/Day/Month view switching works
- [ ] Search functionality works
- [ ] Chat sidebar works
- [ ] Settings modal opens

### 2. Auth Pages (For Visual Inspection)
- [ ] http://localhost:5175/login - Shows login page
- [ ] http://localhost:5175/signup - Shows signup page
- [ ] http://localhost:5175/forgot-password - Shows password reset page
- [ ] Forms are styled correctly
- [ ] Google OAuth button visible
- [ ] Clicking "Sign In" shows error (expected - no Supabase)

### 3. Browser Console Check
Open browser DevTools (F12) and check for:
- [ ] `[EnvConfig] Environment:` log showing dev mode
- [ ] `[Supabase] Running in dev mode without authentication` warning (expected)
- [ ] No other critical errors

### 4. Routing Test
- [ ] Navigate to http://localhost:5175/random-path - Should redirect to `/`
- [ ] TopBar user icon shows (plain icon, not user menu)
- [ ] No "Sign out" option appears (because not authenticated)

## Common Issues & Solutions

### Issue: "Missing VITE_SUPABASE_URL" error
**Solution:** This is expected! The app should continue in dev mode. Check console for:
```
[Supabase] Running in dev mode without authentication
```

### Issue: App redirects to /login immediately
**Solution:** Check that `VITE_REQUIRE_AUTH` is NOT set to `true` in `.env`. Dev mode should allow bypassing auth.

### Issue: Events not persisting
**Solution:** In dev mode, events save to localStorage. Check Application > Local Storage in DevTools.

## Next Steps After Testing

Once you've verified the app works:

### Option A: Continue with Supabase Setup
1. Follow `SUPABASE_SETUP.md`
2. Add credentials to `.env`
3. Restart dev server
4. Test authentication flows

### Option B: Report Issues
If anything doesn't work as expected, let me know and I'll fix it!

---

**Current Mode:** Development (localStorage)  
**To Enable Auth:** Set up Supabase and update `.env`
