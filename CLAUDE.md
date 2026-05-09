# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend:**
```bash
npm run dev          # Vite dev server (port 5173, proxies /register /users /health /ws → localhost:3001)
npm run build        # Production build
npm run test         # Vitest watch mode
npm run test:coverage
```

**Bridge (run from `whatsapp-bridge/`):**
```bash
npm start            # Production
npm run dev          # Watch mode
```

**Deploy:**
```bash
npm run build && firebase deploy --only hosting   # Frontend → Firebase
# Bridge auto-deploys to Render on git push to main
```

## Architecture

Three-service app:

1. **Frontend** — React 18 + Vite (ESM), Zustand state, Tailwind CSS, hosted on Firebase
2. **Supabase** — PostgreSQL + Realtime, RLS enforced, handles auth and event storage
3. **WhatsApp Bridge** — `whatsapp-bridge/` is a separate Node.js/Express service (CommonJS), hosted on Render, handles multi-tenant WhatsApp sessions and proxies Groq API calls

**Frontend module map:**
- `src/api/` — Groq and WhatsApp HTTP clients
- `src/store/` — Zustand stores (events, chat, settings, UI)
- `src/hooks/` — Custom hooks: WebSocket sync, PWA, theme, animations
- `src/lib/` — `supabase.js`, `dateUtils.ts`, `envConfig.js` (auth gating), `constants.js`
- `src/contexts/` — `AuthContext` (Supabase session)
- `src/components/` — Calendar, Chat, WhatsApp, Modal subdirs
- `src/pages/` — Auth pages only (Login, Signup, Callback, ForgotPassword)
- `src/App.jsx` — Main routing and layout (~20KB, the core app)

**Bridge module map (`whatsapp-bridge/`):**
- `bridge-server.js` — Express API + WebSocket server
- `sessionManager.js` — Per-user WhatsApp session lifecycle
- `extractor.js` — Event extraction via Groq (Llama 3.3 70B)
- `middleware/` — Auth (`X-User-ID` + `X-API-Key` headers) and CORS

## Critical Gotchas

**Module systems differ:** Frontend is ESM (`import/export`). Bridge is CommonJS (`require`). Don't mix.

**Environment variables:**
- Use `VITE_BRIDGE_URL` (not `VITE_WHATSAPP_BRIDGE_URL`)
- Leave `VITE_BRIDGE_URL` empty in dev — Vite proxy handles it
- Set `VITE_USE_BRIDGE_PROXY=true` in production
- Never set `VITE_GROQ_API_KEY` in production — would expose in JS bundle
- Render auto-sets `PORT`; don't set `BRIDGE_PORT` in prod

**Bridge auth:** All `/users/:userId/*` routes require `X-User-ID` + `X-API-Key` headers. Only `/health` and `/register` are public. API keys stored in `config/api-keys.json` on the bridge (not in Supabase). Supabase has a `bridge_api_keys` table and `get_or_create_bridge_api_key()` helper for the frontend to fetch its key.

**Auth gating:** `src/lib/envConfig.js` enforces auth in production regardless of env vars. Dev uses `VITE_REQUIRE_AUTH`.

**Render deploy:** `render.yaml` at repo root. Push to `main` triggers bridge redeploy. Dockerfile is `whatsapp-bridge/Dockerfile` (Alpine Node 20 + Chromium for whatsapp-web.js).

**Rate limits on bridge:**
- Global: 120 req/min per user/IP
- `/register`: 10 req/15min per IP
- `/users/:userId/chat`: 30 req/min per user

## Testing

Vitest with jsdom, `@testing-library/react`. Config in `vitest.config.js`. Tests in `src/__tests__/` and `whatsapp-bridge/__tests__/`. 5s default timeout.

```bash
npx vitest run src/__tests__/SomeTest.test.jsx   # Single test file
```
