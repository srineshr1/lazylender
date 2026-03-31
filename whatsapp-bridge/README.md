# WhatsApp Bridge Server

Multi-tenant WhatsApp bridge server for Kairo calendar app. Handles WhatsApp message processing, event extraction using Groq AI, and serves as a secure proxy for the Groq API.

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GROQ_API_KEY
   ```

3. **Start server:**
   ```bash
   npm start
   ```

   Server runs on `http://localhost:3001`

4. **Verify it's running:**
   ```bash
   curl http://localhost:3001/health
   ```

### Production Deployment (Railway)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Railway deployment instructions.

**Quick deploy:**
```bash
# Windows
deploy.bat

# Linux/Mac/Git Bash
bash deploy.sh
```

## Project Structure

```
whatsapp-bridge/
├── bridge-server.js       # Express server with CORS & auth
├── sessions/              # WhatsApp session management
│   └── manager.js         # Session lifecycle manager
├── middleware/            # Express middleware
│   ├── auth.js            # Auth middleware
│   └── bridgeAuth.js      # Bridge-specific auth
├── utils/                 # Utilities
│   └── userData.js        # User data persistence
├── config/                # Configuration files
├── whatsappProcessor.js   # Message processing logic
├── analyzer.js            # AI-powered content analysis
├── extractor.js           # Event extraction utilities
├── calendarPush.js        # Event queue management
├── deploy.sh              # Railway deployment script (Linux/Mac)
├── deploy.bat             # Railway deployment script (Windows)
├── DEPLOYMENT.md          # Detailed deployment guide
├── TROUBLESHOOTING.md     # CORS & connection fixes
├── Dockerfile             # Production container config
├── railway.toml           # Railway deployment config
└── package.json           # Dependencies & scripts
```

## Environment Variables

Required variables (set in Railway dashboard for production):

```env
# Required
GROQ_API_KEY=your_groq_api_key_here
CALENDAR_URL=https://kairocalender.web.app
ALLOWED_ORIGINS=https://kairocalender.web.app,https://kairo.srinesh.in

# Optional
GROQ_TEXT_MODEL=llama-3.1-8b-instant
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
BRIDGE_PORT=3001  # Don't set in Railway (auto-injected)
BRIDGE_REQUIRE_AUTH=true
BRIDGE_ADMIN_API_KEY=your_secure_admin_key
```

See [.env.example](./.env.example) for full reference.

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `POST /register` - Register new user and get API key

### Authenticated Endpoints

All require `X-User-ID` and `X-API-Key` headers:

- `POST /users/:userId/connect` - Connect WhatsApp
- `POST /users/:userId/disconnect` - Disconnect WhatsApp
- `POST /users/:userId/logout` - Logout (delete session)
- `GET /users/:userId/status` - Get connection status & QR code
- `GET /users/:userId/groups` - Get WhatsApp groups
- `GET /users/:userId/events` - Get pending events
- `DELETE /users/:userId/events` - Clear event queue
- `POST /users/:userId/chat` - Groq API proxy endpoint

See API docs for full details.

## CORS Configuration

The bridge automatically allows:
- All URLs in `ALLOWED_ORIGINS` environment variable
- `CALENDAR_URL` environment variable
- All `localhost` ports (5173-5177) for development
- All `.ngrok-free.dev` and `.ngrok.io` domains
- All `.railway.app` and `.up.railway.app` domains

For CORS issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Common Issues

### Frontend can't connect to bridge

1. **Check bridge is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check CORS configuration:**
   - Ensure frontend URL is in `ALLOWED_ORIGINS`
   - Check bridge logs for CORS errors

3. **For local dev:** Leave `VITE_BRIDGE_URL` empty in frontend `.env`

4. **For production:** Set `VITE_BRIDGE_URL` to Railway URL

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed fixes.

### GROQ_API_KEY not working

1. Verify key at [console.groq.com](https://console.groq.com)
2. Check key is set correctly in Railway dashboard (not in `.env` file)
3. Redeploy: `railway up`

### Railway deployment fails

1. Check Railway logs: `railway logs`
2. Verify environment variables in Railway dashboard
3. Ensure Railway CLI is up to date: `npm update -g @railway/cli`

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start with auto-reload (Node 18+)
- `npm run start:legacy` - Start legacy WhatsApp client (deprecated)

## Deployment

### Railway (Recommended)

**Manual deployment (no Git connection):**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

Or use the deployment scripts:
- Windows: `deploy.bat`
- Linux/Mac: `bash deploy.sh`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete guide.

### Using ngrok for Testing

```bash
# Start bridge locally
npm start

# In another terminal, expose with ngrok
ngrok http 3001
```

Update frontend `.env`:
```env
VITE_BRIDGE_URL=https://your-subdomain.ngrok-free.dev
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive API keys
2. **Use bridge proxy in production** - Don't expose `GROQ_API_KEY` in frontend
3. **Set `BRIDGE_REQUIRE_AUTH=true`** in production
4. **Use secure `BRIDGE_ADMIN_API_KEY`** - Generate a long random string
5. **Limit CORS origins** - Only allow trusted frontend domains

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete Railway deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Fix CORS & connection issues
- [.env.example](./.env.example) - Environment variable reference

## Support

- Railway docs: https://docs.railway.app
- Groq docs: https://console.groq.com/docs
- Report issues: https://github.com/your-repo/kairo/issues
