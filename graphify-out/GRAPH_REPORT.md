# Graph Report - .  (2026-05-08)

## Corpus Check
- 119 files · ~84,385 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 879 nodes · 1524 edges · 76 communities (48 shown, 28 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell UI|App Shell UI]]
- [[_COMMUNITY_Calendar Views|Calendar Views]]
- [[_COMMUNITY_Groq Client|Groq Client]]
- [[_COMMUNITY_Bridge Auth|Bridge Auth]]
- [[_COMMUNITY_Bridge API Endpoints|Bridge API Endpoints]]
- [[_COMMUNITY_Auth + Supabase|Auth + Supabase]]
- [[_COMMUNITY_WhatsApp Client|WhatsApp Client]]
- [[_COMMUNITY_App UI + Auth|App UI + Auth]]
- [[_COMMUNITY_Accessibility + Validation|Accessibility + Validation]]
- [[_COMMUNITY_Modal + Chat UI|Modal + Chat UI]]
- [[_COMMUNITY_Settings + Performance|Settings + Performance]]
- [[_COMMUNITY_Test Mocks|Test Mocks]]
- [[_COMMUNITY_Error Boundary + Tests|Error Boundary + Tests]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_Session Manager (WS)|Session Manager (WS)]]
- [[_COMMUNITY_useEventStore Tests|useEventStore Tests]]
- [[_COMMUNITY_Session Manager Core|Session Manager Core]]
- [[_COMMUNITY_User Data IO|User Data IO]]
- [[_COMMUNITY_WhatsApp Processor|WhatsApp Processor]]
- [[_COMMUNITY_Legacy Auth Middleware|Legacy Auth Middleware]]
- [[_COMMUNITY_Responsive Hooks|Responsive Hooks]]
- [[_COMMUNITY_Analyzer + Extractor|Analyzer + Extractor]]
- [[_COMMUNITY_Product Docs|Product Docs]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_App Architecture|App Architecture]]
- [[_COMMUNITY_Bridge Docs|Bridge Docs]]
- [[_COMMUNITY_Calendar Push|Calendar Push]]
- [[_COMMUNITY_Extractor Tests|Extractor Tests]]
- [[_COMMUNITY_Offline + PWA|Offline + PWA]]
- [[_COMMUNITY_Bridge Client + Proxy|Bridge Client + Proxy]]
- [[_COMMUNITY_Bridge Startup|Bridge Startup]]
- [[_COMMUNITY_App Icons|App Icons]]
- [[_COMMUNITY_Screenshots|Screenshots]]
- [[_COMMUNITY_Register Flow|Register Flow]]
- [[_COMMUNITY_Bridge Config|Bridge Config]]
- [[_COMMUNITY_Event Broadcast|Event Broadcast]]
- [[_COMMUNITY_Notifications|Notifications]]
- [[_COMMUNITY_Docs Concepts|Docs Concepts]]
- [[_COMMUNITY_Status Flow|Status Flow]]
- [[_COMMUNITY_Connect Flow|Connect Flow]]
- [[_COMMUNITY_Groups Flow|Groups Flow]]
- [[_COMMUNITY_Mobile UI|Mobile UI]]
- [[_COMMUNITY_Toast UI|Toast UI]]
- [[_COMMUNITY_Profile + Auth|Profile + Auth]]
- [[_COMMUNITY_Cross-Tab Storage|Cross-Tab Storage]]
- [[_COMMUNITY_Admin Access|Admin Access]]
- [[_COMMUNITY_Message Handling|Message Handling]]
- [[_COMMUNITY_Groq Chat Proxy|Groq Chat Proxy]]
- [[_COMMUNITY_Session Handler Wiring|Session Handler Wiring]]
- [[_COMMUNITY_useDebounce (dup)|useDebounce (dup)]]
- [[_COMMUNITY_usePWA (dup)|usePWA (dup)]]
- [[_COMMUNITY_A11y Utilities|A11y Utilities]]
- [[_COMMUNITY_Glass Panel UI|Glass Panel UI]]
- [[_COMMUNITY_Notification Grouping|Notification Grouping]]
- [[_COMMUNITY_Env Config|Env Config]]
- [[_COMMUNITY_Holiday API|Holiday API]]
- [[_COMMUNITY_Performance Detection|Performance Detection]]
- [[_COMMUNITY_Validation|Validation]]
- [[_COMMUNITY_Notification Store|Notification Store]]
- [[_COMMUNITY_Toast Store|Toast Store]]
- [[_COMMUNITY_WhatsApp Settings|WhatsApp Settings]]
- [[_COMMUNITY_dateUtils Tests|dateUtils Tests]]
- [[_COMMUNITY_Analyzer Stubs|Analyzer Stubs]]
- [[_COMMUNITY_VITE_BRIDGE_URL Naming|VITE_BRIDGE_URL Naming]]
- [[_COMMUNITY_Firebase Hosting|Firebase Hosting]]
- [[_COMMUNITY_Supabase Auth|Supabase Auth]]
- [[_COMMUNITY_Testing Summary|Testing Summary]]
- [[_COMMUNITY_Admin Sessions|Admin Sessions]]

## God Nodes (most connected - your core abstractions)
1. `useSettingsStore` - 31 edges
2. `useDarkStore` - 30 edges
3. `useEventStore` - 30 edges
4. `fetchWithTimeout()` - 18 edges
5. `getCurrentUserId()` - 17 edges
6. `useAuth()` - 16 edges
7. `getSupabaseClient()` - 16 edges
8. `fmtDate()` - 14 edges
9. `Icon()` - 13 edges
10. `useThemeColors()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Application Error Screenshot` --semantically_similar_to--> `Time Input Validation Error Screenshot`  [AMBIGUOUS] [semantically similar]
  app-error.png → time-validation-error.png
- `SessionManager (multi-tenant WhatsApp sessions + WebSocket)` --rationale_for--> `Multi-Tenant WhatsApp Bridge Design`  [EXTRACTED]
  whatsapp-bridge/sessionManager.js → README.md
- `processIncomingMessage (message processing pipeline)` --rationale_for--> `WhatsApp Event Extraction Pipeline (keyword filter -> AI -> parse -> push)`  [EXTRACTED]
  whatsapp-bridge/whatsappProcessor.js → DOCS.md
- `Vite Manual Code Splitting (vendor-react, vendor-ui, vendor-utils)` --conceptually_related_to--> `CalendarApp (Store Initialization, Theme, Real-time, Mobile/Desktop Orchestrator)`  [INFERRED]
  vite.config.js → src/App.jsx
- `callGroq (Groq API HTTP client)` --rationale_for--> `Groq Llama 3.3 70B for LLM inference (~200ms)`  [EXTRACTED]
  whatsapp-bridge/whatsappProcessor.js → DOCS.md

## Hyperedges (group relationships)
- **Bridge Credential Provisioning Flow (DB RPC â†’ sessionStorage â†’ Dual Client Access)** — get_or_create_bridge_api_key, bridge_credential_storage, whatsapp_client, groq_client [INFERRED 0.80]
- **Theme Application Pipeline (Preset JS Objects â†’ CSS Custom Properties â†’ DOM)** — theme_preset_engine, calendar_app_orchestrator, tailwind_theme_tokens [INFERRED 0.85]
- **Drag-and-Drop Reschedule Architecture** — eventblock, daycolumn, dayview, weekview, eventstore_reschedule [INFERRED 0.90]
- **Calendar View Interface Pattern** — dayview, weekview, monthview, calendar_view_navigation, event_opacity_dimming [INFERRED 0.85]
- **WhatsApp Event Ingestion Pipeline** — AuthContext_AuthProvider, WhatsAppPopup_WhatsAppPopup, useWhatsAppWebSocket_useWhatsAppWebSocket, useWhatsAppSync_useWhatsAppSync, whatsappClient_api_module [INFERRED 0.85]
- **Sidebar Event Browsing System** — Sidebar_Sidebar, MiniCalendar_MiniCalendar, TaskList_TaskList, useEventStore_store, dateUtils_dateUtils [INFERRED 0.90]
- **Notification Generation and Display Lifecycle** — useNotificationTriggers_useNotificationTriggers, useNotificationStore_store, useEventStore_store, NotificationPanel_NotificationPanel [INFERRED 0.88]
- **Optimistic Update with Temp ID Replacement Pattern** — useEventStore, useChatStore [INFERRED 0.90]
- **Supabase Realtime Subscription Pattern** — useEventStore, useChatStore, useSettingsStore, Supabase_realtime [INFERRED 0.85]
- **RLS-Enforced Multi-Tenant Data Isolation** — RLS_policies, profiles_table, events_table, chat_messages_table, bridge_api_keys_table, useEventStore, useChatStore, useSettingsStore, supabaseQueries [EXTRACTED 1.00]
- **WhatsApp Event Extraction Pipeline (message â†’ keyword filter â†’ Groq AI â†’ extractEvents â†’ dedupe â†’ push â†’ WebSocket broadcast)** — whatsappProcessor_main, whatsappProcessor_keywordFilter, whatsappProcessor_textAnalysis, whatsappProcessor_callGroq, extractor_extractEvents, whatsappProcessor_dedup, whatsappProcessor_pushEvents, sessionManager_notifyNewEvents [EXTRACTED 1.00]
- **Multi-Tenant Authentication Flow (bridgeAuthMiddleware â†’ validateUserParam â†’ getOrCreateApiKey â†’ validateApiKey â†’ dev bypass)** — middleware_bridgeAuth_middleware, middleware_bridgeAuth_validateUserParam, middleware_bridgeAuth_main, middleware_bridgeAuth_devBypass, bridge_server_registerEndpoint [EXTRACTED 1.00]
- **Session Lifecycle Orchestration (bridge-server â†’ sessionManager â†’ restore/cleanup/shutdown on SIGINT/SIGTERM)** — bridge_server_lifecycle, sessionManager_lifecycle, sessionManager_multiTenant, sessionManager_getClient [EXTRACTED 1.00]
- **PWA Manifest Icon Set** — icon_svg, apple_touch_icon_png, icon_192_png, icon_512_png [EXTRACTED 1.00]
- **UI Error and Validation Screenshots** — time_validation_error_png, app_error_png [AMBIGUOUS 0.30]

## Communities (76 total, 28 thin omitted)

### Community 0 - "App Shell UI"
Cohesion: 0.06
Nodes (44): TopBar(), VIEWS, SUGGESTIONS, Icon(), icons, LoadingSkeleton(), MobileDrawer(), MobileNav() (+36 more)

### Community 1 - "Calendar Views"
Cohesion: 0.05
Nodes (50): HourCells, NowLine, SleepZone, DayPreviewPopup(), DayView(), HOURS, EventBlock(), MonthView() (+42 more)

### Community 2 - "Groq Client"
Cohesion: 0.05
Nodes (46): buildMultimodalContent(), checkHealth(), extractTextFromPDF(), fetchWithTimeout(), fileToDataUrl(), generateText(), getCurrentBridgeApiKey(), getCurrentUserId() (+38 more)

### Community 3 - "Bridge Auth"
Cohesion: 0.07
Nodes (52): API_KEYS_FILE, atomicWriteJson(), bridgeAuthMiddleware(), configDir, crypto, fs, generateApiKey(), getAllApiKeys() (+44 more)

### Community 4 - "Bridge API Endpoints"
Cohesion: 0.05
Nodes (50): analyzeText (thin wrapper over extractEvents), Connect/Disconnect/Logout Endpoints, Event CRUD Endpoints (/users/:userId/events), Groq API Proxy Endpoint (/users/:userId/chat), Groups/Contacts/Watched-Groups Endpoints, Server Lifecycle (restore, cleanup, shutdown), Bridge Server (Express HTTP + WebSocket), Register Endpoint (POST /register) (+42 more)

### Community 5 - "Auth + Supabase"
Cohesion: 0.06
Nodes (40): App Integration Tests, AuthCallback Page, ForgotPassword Page, Login Page, Nager.Date API (v3), Row Level Security Policies, Signup Page, Supabase Realtime Publication (+32 more)

### Community 6 - "WhatsApp Client"
Cohesion: 0.11
Nodes (33): clearEvents(), connectWhatsApp(), disconnectWhatsApp(), fetchWithTimeout(), getBridgeHeaders(), getBridgeUrl(), getContacts(), getCurrentUserId() (+25 more)

### Community 7 - "App UI + Auth"
Cohesion: 0.07
Nodes (41): AuthProvider, Lazy Bridge Registration on Auth - Bridge is optional, calendar works without WhatsApp, ensureBridgeRegistration, MiniCalendar, NotificationPanel, groupNotificationsByDate, Sidebar, SidebarSection (+33 more)

### Community 8 - "Accessibility + Validation"
Cohesion: 0.08
Nodes (22): announce(), formatDateForSR(), formatDurationForSR(), formatTimeForSR(), getEventAriaLabel(), handleListNavigation(), KEYS, containsHtmlTags() (+14 more)

### Community 9 - "Modal + Chat UI"
Cohesion: 0.09
Nodes (29): AboutTab, AppearanceTab, Calendar View Slide Navigation, CalendarTab, ChatFab, ChatSidebar, DayColumn, DayPreviewPopup (+21 more)

### Community 10 - "Settings + Performance"
Cohesion: 0.13
Nodes (17): calculatePerformanceScore(), checkWebGLSupport(), detectDeviceCapabilities(), getBlurLevel(), getBlurLevelFromScore(), getPerformanceTierName(), shouldEnableBlur(), TABS (+9 more)

### Community 11 - "Test Mocks"
Cohesion: 0.08
Nodes (3): DOMMatrixMock, localStorageMock, Path2DMock

### Community 12 - "Error Boundary + Tests"
Cohesion: 0.09
Nodes (18): ErrorBoundary, banners, buttons, chatInputs, dayTab, grids, mockHook, mockState (+10 more)

### Community 13 - "Supabase Client"
Cohesion: 0.16
Nodes (16): AuthProvider(), getEnvConfig(), isAuthRequired(), validateSupabaseConfig(), getSupabaseClient(), clearChatMessages(), deleteEvent(), fetchChatMessages() (+8 more)

### Community 14 - "Session Manager (WS)"
Cohesion: 0.1
Nodes (14): authenticateWsClient(), { Client, LocalAuth }, crypto, fs, initialize(), { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds, sanitizeUserId, writeUserFile, readUserFile }, loadApiKeys(), logoutSession() (+6 more)

### Community 15 - "useEventStore Tests"
Cohesion: 0.1
Nodes (19): STATUS_STYLES, { addEvent }, { addEvent, cancelEvent }, { addEvent, deleteEvent }, { addEvent, editEvent }, { addEvent, events }, { addEvent, markDone }, { addEvent, markDone, cancelEvent } (+11 more)

### Community 16 - "Session Manager Core"
Cohesion: 0.13
Nodes (14): cleanupInactiveSessions(), { Client, LocalAuth }, fs, initialize(), { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds, sanitizeUserId }, logoutSession(), path, restoreExistingSessions() (+6 more)

### Community 17 - "User Data IO"
Cohesion: 0.24
Nodes (17): getClient(), deleteUserDir(), fs, getUserAuthDir(), getUserDir(), getUserPublicDir(), getUserStatus(), initUserDir() (+9 more)

### Community 18 - "WhatsApp Processor"
Cohesion: 0.23
Nodes (14): analyzeImageWithGroq(), analyzePdfWithGroq(), analyzeTextWithGroq(), axios, callGroq(), dedupeEvents(), { extractEvents }, isPotentialEventMessage() (+6 more)

### Community 19 - "Legacy Auth Middleware"
Cohesion: 0.27
Nodes (11): API_KEY_FILE, authMiddleware(), createFingerprint(), crypto, fs, generateApiKey(), getAllApiKeys(), getOrCreateApiKey() (+3 more)

### Community 20 - "Responsive Hooks"
Cohesion: 0.38
Nodes (9): BREAKPOINTS, useBreakpoint(), useIsDesktop(), useIsLargeDesktop(), useIsMobile(), useIsTablet(), useMediaQuery(), useMobileLayout() (+1 more)

### Community 21 - "Analyzer + Extractor"
Cohesion: 0.24
Nodes (3): analyzeText(), { extractEvents }, extractEvents()

### Community 22 - "Product Docs"
Cohesion: 0.42
Nodes (9): Kairo README, Groq API (Llama 3.3 70B), Groq for LLM Inference Decision, Microservices Architecture, Multi-tenant WhatsApp Bridge Decision, Offline-first Architecture, React PWA Frontend, Supabase (Auth, Postgres, Realtime) (+1 more)

### Community 23 - "Service Worker"
Cohesion: 0.29
Nodes (6): data, fetchPromise, options, PRECACHE_ASSETS, responseClone, url

### Community 24 - "App Architecture"
Cohesion: 0.29
Nodes (7): CalendarApp (Store Initialization, Theme, Real-time, Mobile/Desktop Orchestrator), ErrorBoundary (React Class-based Crash Fallback UI), ProtectedRoute (Auth Gate with LoadingSkeleton Fallback), Supabase Realtime Subscription Initialize/Cleanup Lifecycle, Tailwind Custom Theme Tokens (sidebar, chat, accent, event colors, DM Sans fonts), Dynamic CSS Custom Properties Theme Engine (royal, emerald, rose, ocean presets), Vite Manual Code Splitting (vendor-react, vendor-ui, vendor-utils)

### Community 25 - "Bridge Docs"
Cohesion: 0.33
Nodes (7): Kairo Agent Notes, WhatsApp Bridge README, Bridge Server Module, WhatsApp Bridge Deployment Guide, Render Blueprint (kairo-bridge), Testing & Deployment Summary, CORS & Connection Troubleshooting Guide

### Community 26 - "Calendar Push"
Cohesion: 0.33
Nodes (4): axios, fs, path, QUEUE_FILE

### Community 27 - "Extractor Tests"
Cohesion: 0.33
Nodes (5): events, examEvents, holidayEvents, labEvents, result

### Community 28 - "Offline + PWA"
Cohesion: 0.4
Nodes (5): Offline-First Sync Queue (pendingSync + isOnline in useEventStore), OfflineIndicator (Online/Offline Banner + Pending Sync Count), PWAInstallPrompt (Install Banner + Update Banner with Dismiss Persistence), Service Worker Stale-While-Revalidate + Network-First PWA Caching, Service Worker Push Notification + Background Sync Handlers

### Community 29 - "Bridge Client + Proxy"
Cohesion: 0.7
Nodes (5): Bridge Credential Sharing via sessionStorage (bridge_user_id, bridge_api_key), Groq AI Client (Bridge-Proxy, Vision/PDF, Retry Backoff), Exponential Backoff with Jitter Retry Pattern, Vite Dev Proxy to Bridge (localhost:3001), WhatsApp Bridge Client (Register, Connect, Groups, Events, Watched Groups)

### Community 30 - "Bridge Startup"
Cohesion: 0.4
Nodes (5): sessionManager.cleanupInactiveSessions, sessionManager.getWebSocketServer, sessionManager.restoreExistingSessions, sessionManager.shutdown, Startup and Shutdown Lifecycle

### Community 31 - "App Icons"
Cohesion: 1.0
Nodes (4): iOS Apple Touch Icon (180x180), PWA Icon 192x192, PWA Icon 512x512, Kairo App SVG Icon (PWA Source)

### Community 32 - "Screenshots"
Cohesion: 0.67
Nodes (4): Application Error Screenshot, Kairo Test Results (Final Passing), Time Input Validation Error Screenshot, Week View Calendar UI Documentation Screenshot

### Community 33 - "Register Flow"
Cohesion: 0.5
Nodes (4): getOrCreateApiKey, initUserDir, Register Endpoint Handler, userDirExists

### Community 35 - "Event Broadcast"
Cohesion: 0.67
Nodes (3): broadcastToUser(), notifyNewEvents(), pushEvents()

### Community 36 - "Notifications"
Cohesion: 0.67
Nodes (3): NotificationItem, deleteNotification (useNotificationStore), markRead (useNotificationStore)

### Community 37 - "Docs Concepts"
Cohesion: 0.67
Nodes (3): Kairo (AI-powered calendar with WhatsApp integration), Microservices Architecture (React frontend + Supabase + Bridge + Groq), Offline-First Architecture (localStorage cache + optimistic UI)

### Community 38 - "Status Flow"
Cohesion: 0.67
Nodes (3): getUserStatus, sessionManager.getSessionState, Status Endpoint Handler

### Community 39 - "Connect Flow"
Cohesion: 0.67
Nodes (3): Connect Endpoint Handler, sessionManager.createSession, sessionManager.hasSession

### Community 40 - "Groups Flow"
Cohesion: 0.67
Nodes (3): Groups Endpoint Handler, readUserFile, writeUserFile

## Ambiguous Edges - Review These
- `Application Error Screenshot` → `Time Input Validation Error Screenshot`  [AMBIGUOUS]
  time-validation-error.png · relation: semantically_similar_to
- `Application Error Screenshot` → `Kairo Test Results (Final Passing)`  [AMBIGUOUS]
  kairo-test-final.png · relation: conceptually_related_to
- `Time Input Validation Error Screenshot` → `Week View Calendar UI Documentation Screenshot`  [AMBIGUOUS]
  time-validation-error.png · relation: conceptually_related_to

## Knowledge Gaps
- **262 isolated node(s):** `PRECACHE_ASSETS`, `url`, `responseClone`, `fetchPromise`, `data` (+257 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Application Error Screenshot` and `Time Input Validation Error Screenshot`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Application Error Screenshot` and `Kairo Test Results (Final Passing)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Time Input Validation Error Screenshot` and `Week View Calendar UI Documentation Screenshot`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useEventStore` connect `App Shell UI` to `Calendar Views`, `Groq Client`, `WhatsApp Client`, `Accessibility + Validation`, `useEventStore Tests`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `Settings + Performance` to `App Shell UI`, `Calendar Views`, `Accessibility + Validation`, `WhatsApp Client`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `useDarkStore` connect `App Shell UI` to `Calendar Views`, `Settings + Performance`, `Responsive Hooks`, `WhatsApp Client`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `PRECACHE_ASSETS`, `url`, `responseClone` to the rest of the system?**
  _262 weakly-connected nodes found - possible documentation gaps or missing edges._