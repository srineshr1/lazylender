# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend:**
```bash
npm run dev          # Vite dev server (port 5173, proxies /users /health → localhost:3001)
npm run build        # Production build
npx vitest run       # Run vitest once (no watch)
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
- `bridge-server.js` — Express API (control plane only: connect/disconnect/logout/chat/health)
- `sessionManager.js` — Per-user WhatsApp session lifecycle, writes status + chats to Supabase
- `whatsappProcessor.js` — Groq-powered event extraction, inserts into `whatsapp_events`
- `extractor.js` — Event parser used by processor
- `middleware/bridgeAuth.js` — `X-User-ID` + `X-API-Key` validated against Supabase `bridge_api_keys`
- `supabaseClient.js` — Service-role Supabase client (server-only)

## State Architecture

**Supabase is the single source of truth** for all bridge state. Frontend never polls the bridge for status, chats, watched groups, or events — it reads/subscribes via Supabase Realtime. Bridge writes state to Supabase using the service role key.

Tables (see `supabase/whatsapp_rebuild.sql`):
- `bridge_api_keys` — per-user API key. Frontend gets it via `supabase.rpc('get_or_create_bridge_api_key')`. Bridge validates against this table with 5min in-memory cache.
- `whatsapp_status` — per-user `{ status, qr, message, connected }`. Realtime; populates QR/connection UI.
- `whatsapp_chats` — group + 1:1 chat directory; refreshed when `ready` fires.
- `whatsapp_watched_groups` — frontend writes (RLS); bridge reads to filter messages.
- `whatsapp_events` — extracted events queue. Bridge inserts; frontend subscribes via Realtime, processes, deletes the row.

## Critical Gotchas

**Module systems differ:** Frontend is ESM (`import/export`). Bridge is CommonJS (`require`).

**Render free tier consequences:** Bridge spins down after ~15 min idle and **wipes its filesystem on redeploy**. WhatsApp Web LocalAuth in `sessions/` does NOT persist — users must re-scan QR after every cold start. Status table reflects current state via Realtime so UI handles this gracefully.

**Environment variables:**
- Frontend: `VITE_BRIDGE_URL` (empty in dev, Vite proxy handles it). `VITE_USE_BRIDGE_PROXY=true` in prod. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Never `VITE_GROQ_API_KEY` in prod.
- Bridge: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `GROQ_API_KEY`, `CALENDAR_URL`, `ALLOWED_ORIGINS`. Render auto-sets `PORT`.

**Bridge endpoints (slim):** `GET /health` (public). `POST /users/:id/connect|disconnect|logout` and `POST /users/:id/chat` require `X-User-ID` + `X-API-Key`. No `/register` — keys come from Supabase RPC.

**Rate limits:** Global 120 req/min per user/IP; Groq proxy 30 req/min per user.

## Testing

Vitest with jsdom, `@testing-library/react`. Config in `vitest.config.js`. Tests in `src/__tests__/`. 5s default timeout.

```bash
npx vitest run src/__tests__/SomeTest.test.jsx   # Single test file
```
