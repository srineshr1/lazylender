# Supabase Setup Guide for AI Calendar

This guide will walk you through setting up Supabase for your AI Calendar app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: `ai-calendar` (or your preferred name)
   - **Database Password**: Choose a strong password (save it somewhere safe!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Free tier is sufficient for development
4. Click "Create new project" and wait 2-3 minutes for setup

## Step 2: Get Your API Credentials

1. Once your project is created, go to **Settings** > **API**
2. Find these two values:
   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public**: A long string starting with `eyJ...`
3. Copy these values - you'll need them for Step 5

## Step 3: Execute the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Open the file `supabase/schema.sql` in your project directory
4. Copy ALL the SQL code from that file
5. Paste it into the Supabase SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this is correct!

This creates all the tables, security policies, and triggers you need.

## Step 4: Configure Google OAuth (Optional - if you want Google sign-in)

### 4.1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services** > **Credentials**
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Fill in:
   - **Name**: `AI Calendar`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local dev)
     - Your Supabase Project URL (from Step 2)
   - **Authorized redirect URIs**:
     - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
     - Replace `YOUR_SUPABASE_PROJECT_REF` with your actual project ref (the part before `.supabase.co`)
7. Click "Create"
8. Copy your **Client ID** and **Client Secret**

### 4.2: Add Google OAuth to Supabase

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Find "Google" in the list and click to expand
3. Toggle "Enable Sign in with Google" to ON
4. Paste your **Client ID** and **Client Secret** from Google
5. Click "Save"

## Step 5: Update Your .env File

1. In your project root, create/update the `.env` file:

```env
# Frontend Environment Variables
# Copy this file to .env for local development

# Ollama Configuration
VITE_OLLAMA_URL=http://localhost:11434

# WhatsApp Bridge Configuration
VITE_BRIDGE_URL=http://localhost:3001
VITE_POLL_INTERVAL=3000

# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Authentication Configuration
# Set to 'true' to require authentication even in development (default: false)
VITE_REQUIRE_AUTH=false
```

2. Replace `YOUR_PROJECT_REF` and the anon key with your actual values from Step 2

## Step 6: Disable Email Confirmation (Optional - for faster testing)

By default, Supabase requires users to confirm their email before signing in. For development, you can disable this:

1. Go to **Authentication** > **Email Auth**
2. Scroll down to "Email Confirmation"
3. Toggle "Enable email confirmations" to OFF
4. Click "Save"

**Note:** Re-enable this in production for security!

## Step 7: Test Your Setup

1. Start your dev server: `npm run dev`
2. Visit `http://localhost:5173`
3. You should see the login page
4. Try creating an account with email/password
5. If Google OAuth is configured, try signing in with Google

## Troubleshooting

### "Missing VITE_SUPABASE_URL" error
- Make sure your `.env` file is in the project root (same level as `package.json`)
- Restart your dev server after creating/updating `.env`

### "Invalid API key" error
- Double-check you copied the **anon public** key, not the service_role key
- Make sure there are no extra spaces in your `.env` file

### Email confirmation emails not sending
- Check **Authentication** > **Email Templates** in Supabase
- For local dev, you can check the email confirmation link in Supabase **Authentication** > **Users** (click on the user)

### Google OAuth not working
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://YOUR_REF.supabase.co/auth/v1/callback`
- Check that you've enabled the Google provider in Supabase Auth settings

## Next Steps

Once Supabase is set up:
1. The app will automatically use Supabase for authentication
2. Events will be saved to the cloud instead of localStorage
3. You can test multi-user functionality by creating multiple accounts
4. Real-time sync will work when you have the same account open in multiple tabs

## Dev Mode (No Auth Required)

If you want to continue developing without authentication:
1. Leave `VITE_REQUIRE_AUTH=false` in your `.env` file
2. The app will use localStorage like before
3. No Supabase connection required

To enable auth in dev mode, set `VITE_REQUIRE_AUTH=true`

---

Need help? Check the Supabase documentation or create an issue in the project repo.
