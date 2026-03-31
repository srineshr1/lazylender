# Kairo Setup Guide

Complete guide for setting up Kairo for local development and production deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [WhatsApp Bridge Setup](#whatsapp-bridge-setup)
- [Production Deployment](#production-deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** v9 or higher (comes with Node.js)
- **Git** for version control

### Optional (for full AI features)
- **Groq API Key** — For LLM-powered features ([Get free key](https://console.groq.com/))
- **Supabase Project** — For authentication and real-time sync ([Create project](https://supabase.com/))

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/kairo.git
cd kairo
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install WhatsApp Bridge Dependencies

```bash
cd whatsapp-bridge
npm install
cd ..
```

---

## Environment Configuration

### Frontend Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Supabase Configuration (Required for auth & sync)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# WhatsApp Bridge URL
# For local development:
VITE_WHATSAPP_BRIDGE_URL=http://localhost:3001
# For production (Railway):
# VITE_WHATSAPP_BRIDGE_URL=https://your-app.up.railway.app

# Polling interval for WhatsApp events (milliseconds)
VITE_POLL_INTERVAL=3000
```

### WhatsApp Bridge Configuration

Create a `.env` file in the `whatsapp-bridge` directory:

```bash
cd whatsapp-bridge
cp .env.example .env
```

Edit `whatsapp-bridge/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration (same as frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# Groq API for LLM features
GROQ_API_KEY=gsk_your_groq_api_key

# CORS Configuration
# For local development:
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
# For production:
# ALLOWED_ORIGINS=https://kairocalender.web.app,https://your-domain.com
```

### Getting API Keys

#### Supabase
1. Go to [supabase.com](https://supabase.com/) and create a project
2. Navigate to **Settings > API**
3. Copy the **URL** and **anon/public** key for frontend
4. Copy the **service_role** key for WhatsApp bridge (keep this secret!)

#### Groq
1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up for a free account
3. Create an API key in the dashboard
4. Copy the key (starts with `gsk_`)

---

## Running the Application

### Development Mode

You need to run two servers: the frontend (Vite) and the WhatsApp bridge.

#### Terminal 1: Frontend (React)

```bash
# From root directory
npm run dev
```

Opens at `http://localhost:5173`

#### Terminal 2: WhatsApp Bridge (Node.js)

```bash
# From whatsapp-bridge directory
cd whatsapp-bridge
node bridge-server.js
```

Opens at `http://localhost:3001`

### Using the Application

1. Open `http://localhost:5173` in your browser
2. Sign up or log in with your email
3. Click the WhatsApp icon in the top bar
4. Scan the QR code with WhatsApp on your phone
5. Select groups to monitor
6. Events will automatically sync from WhatsApp messages

---

## WhatsApp Bridge Setup

### How It Works

The WhatsApp bridge connects to WhatsApp Web using the `whatsapp-web.js` library. It:

1. Generates a QR code for authentication
2. Monitors configured groups for messages
3. Extracts calendar events using AI (Groq/Llama)
4. Pushes events to Supabase for sync

### Session Persistence

WhatsApp sessions are stored in `whatsapp-bridge/sessions/`. Once authenticated, you won't need to scan the QR code again unless:
- You log out from WhatsApp
- The session expires (~2 weeks)
- You clear the sessions directory

### Configuring Watched Groups

After connecting WhatsApp:
1. Go to Settings (gear icon)
2. Navigate to the WhatsApp tab
3. Toggle on the groups you want to monitor
4. Events will be extracted from messages in those groups

### Keywords for Event Detection

The bridge looks for these keywords to identify schedule-related messages:
- exam, test, quiz, assignment
- deadline, due, submit
- class, lecture, lab
- postponed, cancelled, rescheduled
- meeting, event, seminar

---

## Production Deployment

### Frontend (Firebase Hosting)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```

3. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### WhatsApp Bridge (Railway)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and link project:
   ```bash
   cd whatsapp-bridge
   railway login
   railway link
   ```

3. Deploy:
   ```bash
   railway up --no-gitignore
   ```

**Important**: Use `--no-gitignore` because the Railway project is not Git-connected.

### Environment Variables on Railway

Set these in the Railway dashboard:

| Variable | Value |
|----------|-------|
| `PORT` | (Railway sets automatically) |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Your Supabase URL |
| `SUPABASE_SERVICE_KEY` | Your service role key |
| `GROQ_API_KEY` | Your Groq API key |
| `ALLOWED_ORIGINS` | `https://kairocalender.web.app` |

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npx vitest run src/__tests__/dateUtils.test.js
```

---

## Troubleshooting

### Common Issues

#### "Cannot connect to Supabase"

- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Verify your Supabase project is active (free tier pauses after inactivity)

#### "WhatsApp QR code not appearing"

- Ensure the bridge server is running (`node bridge-server.js`)
- Check that `VITE_WHATSAPP_BRIDGE_URL` points to the correct URL
- Look for errors in the bridge server terminal

#### "Events not syncing from WhatsApp"

- Verify you've selected groups to monitor in Settings
- Check that messages contain relevant keywords
- Look at bridge server logs for extraction errors

#### "Groq API errors"

- Verify your `GROQ_API_KEY` is valid
- Check your Groq dashboard for rate limits
- The free tier has generous limits but may throttle heavy usage

#### "CORS errors in browser console"

- Ensure `ALLOWED_ORIGINS` includes your frontend URL
- For local dev: `http://localhost:5173`
- For production: your Firebase hosting URL

#### "WhatsApp session expired"

- Delete the `whatsapp-bridge/sessions/` directory
- Restart the bridge server
- Scan the QR code again

### Getting Help

1. Check the browser console for errors (F12 > Console)
2. Check the terminal running the bridge server
3. Review logs in the Railway dashboard (production)
4. Check Supabase logs for database errors

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run all tests |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Run tests with coverage |
| `npx tsc --noEmit` | Type check without building |

---

## Project Scripts

### Root Directory

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

### WhatsApp Bridge

```bash
# Start the server
node bridge-server.js

# Deploy to Railway
railway up --no-gitignore
```

---

## Additional Resources

- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Groq API Documentation](https://console.groq.com/docs)
- [whatsapp-web.js Guide](https://wwebjs.dev/guide/)
- [Railway Documentation](https://docs.railway.app/)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
