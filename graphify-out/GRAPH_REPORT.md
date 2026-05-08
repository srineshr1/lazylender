# Graph Report - .  (2026-05-08)

## Corpus Check
- 118 files · ~84,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 837 nodes · 1451 edges · 68 communities (44 shown, 24 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core UI Components|Core UI Components]]
- [[_COMMUNITY_AIGroq API Client|AI/Groq API Client]]
- [[_COMMUNITY_Accessibility & UI Utilities|Accessibility & UI Utilities]]
- [[_COMMUNITY_Bridge Auth Middleware|Bridge Auth Middleware]]
- [[_COMMUNITY_Bridge Server API Endpoints|Bridge Server API Endpoints]]
- [[_COMMUNITY_Auth Pages & Supabase RLS|Auth Pages & Supabase RLS]]
- [[_COMMUNITY_WhatsApp Bridge Client|WhatsApp Bridge Client]]
- [[_COMMUNITY_Auth Context & Notifications|Auth Context & Notifications]]
- [[_COMMUNITY_Modal Tabs & Chat UI|Modal Tabs & Chat UI]]
- [[_COMMUNITY_WebSocket Session Manager|WebSocket Session Manager]]
- [[_COMMUNITY_Test Setup & DOM Mocks|Test Setup & DOM Mocks]]
- [[_COMMUNITY_Error Boundary & Error Handling|Error Boundary & Error Handling]]
- [[_COMMUNITY_Supabase Client & Auth Config|Supabase Client & Auth Config]]
- [[_COMMUNITY_Session Lifecycle|Session Lifecycle]]
- [[_COMMUNITY_Event Store Tests|Event Store Tests]]
- [[_COMMUNITY_WhatsApp Message Processing|WhatsApp Message Processing]]
- [[_COMMUNITY_Calendar DayWeek Views|Calendar Day/Week Views]]
- [[_COMMUNITY_User Data File Persistence|User Data File Persistence]]
- [[_COMMUNITY_Date Utilities & Tasks|Date Utilities & Tasks]]
- [[_COMMUNITY_Date Utility Tests|Date Utility Tests]]
- [[_COMMUNITY_Holiday API & External Data|Holiday API & External Data]]
- [[_COMMUNITY_WhatsApp WebSocket Hooks|WhatsApp WebSocket Hooks]]
- [[_COMMUNITY_CSS & Tailwind Config|CSS & Tailwind Config]]
- [[_COMMUNITY_Sidebar Navigation Components|Sidebar Navigation Components]]
- [[_COMMUNITY_Mobile Layout & Responsive|Mobile Layout & Responsive]]
- [[_COMMUNITY_PWA Service Worker & Install|PWA Service Worker & Install]]
- [[_COMMUNITY_ViteVitest Build Config|Vite/Vitest Build Config]]
- [[_COMMUNITY_Bridge Config & Env|Bridge Config & Env]]
- [[_COMMUNITY_Event Extraction Pipeline|Event Extraction Pipeline]]
- [[_COMMUNITY_Chat LLM Integration|Chat LLM Integration]]
- [[_COMMUNITY_Zustand State Management|Zustand State Management]]
- [[_COMMUNITY_Documentation & Setup|Documentation & Setup]]
- [[_COMMUNITY_Deployment Configs|Deployment Configs]]
- [[_COMMUNITY_Calendar Event Modal|Calendar Event Modal]]
- [[_COMMUNITY_Profile & Settings Modals|Profile & Settings Modals]]
- [[_COMMUNITY_WhatsApp Connection UI|WhatsApp Connection UI]]
- [[_COMMUNITY_Toast Notifications|Toast Notifications]]
- [[_COMMUNITY_WhatsApp QR & Status|WhatsApp QR & Status]]
- [[_COMMUNITY_Bridge Testing|Bridge Testing]]
- [[_COMMUNITY_Message Watch & Filtering|Message Watch & Filtering]]
- [[_COMMUNITY_Calendar Month View|Calendar Month View]]
- [[_COMMUNITY_DB Schema & Migrations|DB Schema & Migrations]]
- [[_COMMUNITY_Media Query Hook|Media Query Hook]]
- [[_COMMUNITY_Notification Triggers|Notification Triggers]]
- [[_COMMUNITY_themeColors Hook|themeColors Hook]]
- [[_COMMUNITY_Calendar Event Block|Calendar Event Block]]
- [[_COMMUNITY_Day Preview Popup|Day Preview Popup]]
- [[_COMMUNITY_Day Column Drag-Drop|Day Column Drag-Drop]]
- [[_COMMUNITY_Bridge Extractor Core|Bridge Extractor Core]]
- [[_COMMUNITY_Bridge Calendar Push|Bridge Calendar Push]]
- [[_COMMUNITY_WebSocket Server Core|WebSocket Server Core]]
- [[_COMMUNITY_Timetable Prompts|Timetable Prompts]]
- [[_COMMUNITY_WhatsApp Settings Store|WhatsApp Settings Store]]
- [[_COMMUNITY_LoginSignup Pages|Login/Signup Pages]]
- [[_COMMUNITY_Debounce Hook|Debounce Hook]]
- [[_COMMUNITY_Async Hook|Async Hook]]
- [[_COMMUNITY_Protected Route Guard|Protected Route Guard]]
- [[_COMMUNITY_Mobile Navigation Drawer|Mobile Navigation Drawer]]
- [[_COMMUNITY_WhatsApp Toast UI|WhatsApp Toast UI]]
- [[_COMMUNITY_Application Error Screenshots|Application Error Screenshots]]

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
- `Time Input Validation Error Screenshot` --semantically_similar_to--> `Application Error Screenshot`  [AMBIGUOUS] [semantically similar]
  time-validation-error.png → app-error.png
- `Multi-Tenant WhatsApp Bridge Design` --rationale_for--> `SessionManager (multi-tenant WhatsApp sessions + WebSocket)`  [EXTRACTED]
  README.md → whatsapp-bridge/sessionManager.js
- `WhatsApp Event Extraction Pipeline (keyword filter -> AI -> parse -> push)` --rationale_for--> `processIncomingMessage (message processing pipeline)`  [EXTRACTED]
  DOCS.md → whatsapp-bridge/whatsappProcessor.js
- `Vite Manual Code Splitting (vendor-react, vendor-ui, vendor-utils)` --conceptually_related_to--> `CalendarApp (Store Initialization, Theme, Real-time, Mobile/Desktop Orchestrator)`  [INFERRED]
  vite.config.js → src/App.jsx
- `Groq Llama 3.3 70B for LLM inference (~200ms)` --rationale_for--> `callGroq (Groq API HTTP client)`  [EXTRACTED]
  DOCS.md → whatsapp-bridge/whatsappProcessor.js

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

## Communities (68 total, 24 thin omitted)

### Community 0 - "Core UI Components"
Cohesion: 0.06
Nodes (43): TopBar(), VIEWS, SUGGESTIONS, Icon(), icons, LoadingSkeleton(), MobileDrawer(), MobileNav() (+35 more)

### Community 1 - "AI/Groq API Client"
Cohesion: 0.05
Nodes (46): buildMultimodalContent(), checkHealth(), extractTextFromPDF(), fetchWithTimeout(), fileToDataUrl(), generateText(), getCurrentBridgeApiKey(), getCurrentUserId() (+38 more)

### Community 2 - "Accessibility & UI Utilities"
Cohesion: 0.05
Nodes (38): announce(), formatDateForSR(), formatDurationForSR(), formatTimeForSR(), getEventAriaLabel(), handleListNavigation(), KEYS, calculatePerformanceScore() (+30 more)

### Community 3 - "Bridge Auth Middleware"
Cohesion: 0.05
Nodes (51): API_KEYS_FILE, atomicWriteJson(), bridgeAuthMiddleware(), configDir, crypto, fs, generateApiKey(), getAllApiKeys() (+43 more)

### Community 4 - "Bridge Server API Endpoints"
Cohesion: 0.05
Nodes (50): analyzeText (thin wrapper over extractEvents), Connect/Disconnect/Logout Endpoints, Event CRUD Endpoints (/users/:userId/events), Groq API Proxy Endpoint (/users/:userId/chat), Groups/Contacts/Watched-Groups Endpoints, Server Lifecycle (restore, cleanup, shutdown), Bridge Server (Express HTTP + WebSocket), Register Endpoint (POST /register) (+42 more)

### Community 5 - "Auth Pages & Supabase RLS"
Cohesion: 0.06
Nodes (40): App Integration Tests, AuthCallback Page, ForgotPassword Page, Login Page, Nager.Date API (v3), Row Level Security Policies, Signup Page, Supabase Realtime Publication (+32 more)

### Community 6 - "WhatsApp Bridge Client"
Cohesion: 0.11
Nodes (32): clearEvents(), connectWhatsApp(), disconnectWhatsApp(), fetchWithTimeout(), getBridgeHeaders(), getBridgeUrl(), getContacts(), getCurrentUserId() (+24 more)

### Community 7 - "Auth Context & Notifications"
Cohesion: 0.07
Nodes (41): AuthProvider, Lazy Bridge Registration on Auth - Bridge is optional, calendar works without WhatsApp, ensureBridgeRegistration, MiniCalendar, NotificationPanel, groupNotificationsByDate, Sidebar, SidebarSection (+33 more)

### Community 8 - "Modal Tabs & Chat UI"
Cohesion: 0.09
Nodes (29): AboutTab, AppearanceTab, Calendar View Slide Navigation, CalendarTab, ChatFab, ChatSidebar, DayColumn, DayPreviewPopup (+21 more)

### Community 9 - "WebSocket Session Manager"
Cohesion: 0.09
Nodes (16): authenticateWsClient(), broadcastToUser(), { Client, LocalAuth }, crypto, fs, initialize(), { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds, sanitizeUserId, writeUserFile, readUserFile }, loadApiKeys() (+8 more)

### Community 10 - "Test Setup & DOM Mocks"
Cohesion: 0.08
Nodes (3): DOMMatrixMock, localStorageMock, Path2DMock

### Community 11 - "Error Boundary & Error Handling"
Cohesion: 0.09
Nodes (18): ErrorBoundary, banners, buttons, chatInputs, dayTab, grids, mockHook, mockState (+10 more)

### Community 12 - "Supabase Client & Auth Config"
Cohesion: 0.16
Nodes (16): AuthProvider(), getEnvConfig(), isAuthRequired(), validateSupabaseConfig(), getSupabaseClient(), clearChatMessages(), deleteEvent(), fetchChatMessages() (+8 more)

### Community 13 - "Session Lifecycle"
Cohesion: 0.13
Nodes (14): cleanupInactiveSessions(), { Client, LocalAuth }, fs, initialize(), { initUserDir, getUserAuthDir, getUserPublicDir, getAllUserIds, sanitizeUserId }, logoutSession(), path, restoreExistingSessions() (+6 more)

### Community 14 - "Event Store Tests"
Cohesion: 0.11
Nodes (18): { addEvent }, { addEvent, cancelEvent }, { addEvent, deleteEvent }, { addEvent, editEvent }, { addEvent, events }, { addEvent, markDone }, { addEvent, markDone, cancelEvent }, { addEvent, reschedule } (+10 more)

### Community 15 - "WhatsApp Message Processing"
Cohesion: 0.2
Nodes (17): readUserFile(), analyzeImageWithGroq(), analyzePdfWithGroq(), analyzeTextWithGroq(), axios, callGroq(), dedupeEvents(), { extractEvents } (+9 more)

### Community 16 - "Calendar Day/Week Views"
Cohesion: 0.2
Nodes (13): DayView(), HOURS, HOURS, WeekView(), BaseEvent, ExpandedEvent, expandRecurring(), fmtDate() (+5 more)

### Community 17 - "User Data File Persistence"
Cohesion: 0.26
Nodes (15): getClient(), deleteUserDir(), fs, getUserAuthDir(), getUserDir(), getUserPublicDir(), getUserStatus(), initUserDir() (+7 more)

### Community 18 - "Date Utilities & Tasks"
Cohesion: 0.15
Nodes (9): addWeek(), parseDate(), subWeek(), TaskList(), getTaskStatus(), getToday(), sanitizeEvent(), STATUS_STYLES (+1 more)

### Community 19 - "Date Utility Tests"
Cohesion: 0.15
Nodes (12): fmt(), getWorkWeekStart(), date, days, events, expanded, meetings, monday (+4 more)

### Community 20 - "Holiday API & External Data"
Cohesion: 0.26
Nodes (8): DayPreviewPopup(), EventBlock(), MonthView(), WEEKDAYS, COLOR_KEYS, THEME_PRESETS, useThemeColors(), getMonthDays()

### Community 21 - "WhatsApp WebSocket Hooks"
Cohesion: 0.17
Nodes (8): HourCells, NowLine, SleepZone, DEFAULT_CALENDAR_URLS, EVENT_COLORS, RECURRENCE_TYPES, TASK_STATUSES, timeToMinutes()

### Community 22 - "CSS & Tailwind Config"
Cohesion: 0.27
Nodes (11): API_KEY_FILE, authMiddleware(), createFingerprint(), crypto, fs, generateApiKey(), getAllApiKeys(), getOrCreateApiKey() (+3 more)

### Community 23 - "Sidebar Navigation Components"
Cohesion: 0.38
Nodes (9): BREAKPOINTS, useBreakpoint(), useIsDesktop(), useIsLargeDesktop(), useIsMobile(), useIsTablet(), useMediaQuery(), useMobileLayout() (+1 more)

### Community 24 - "Mobile Layout & Responsive"
Cohesion: 0.24
Nodes (3): analyzeText(), { extractEvents }, extractEvents()

### Community 25 - "PWA Service Worker & Install"
Cohesion: 0.29
Nodes (6): data, fetchPromise, options, PRECACHE_ASSETS, responseClone, url

### Community 26 - "Vite/Vitest Build Config"
Cohesion: 0.29
Nodes (7): CalendarApp (Store Initialization, Theme, Real-time, Mobile/Desktop Orchestrator), ErrorBoundary (React Class-based Crash Fallback UI), ProtectedRoute (Auth Gate with LoadingSkeleton Fallback), Supabase Realtime Subscription Initialize/Cleanup Lifecycle, Tailwind Custom Theme Tokens (sidebar, chat, accent, event colors, DM Sans fonts), Dynamic CSS Custom Properties Theme Engine (royal, emerald, rose, ocean presets), Vite Manual Code Splitting (vendor-react, vendor-ui, vendor-utils)

### Community 27 - "Bridge Config & Env"
Cohesion: 0.33
Nodes (4): axios, fs, path, QUEUE_FILE

### Community 28 - "Event Extraction Pipeline"
Cohesion: 0.33
Nodes (5): events, examEvents, holidayEvents, labEvents, result

### Community 29 - "Chat LLM Integration"
Cohesion: 0.5
Nodes (4): getMiniCalDays(), DAY_FULL_LABELS, DAY_LABELS, MiniCalendar()

### Community 30 - "Zustand State Management"
Cohesion: 0.4
Nodes (5): Offline-First Sync Queue (pendingSync + isOnline in useEventStore), OfflineIndicator (Online/Offline Banner + Pending Sync Count), PWAInstallPrompt (Install Banner + Update Banner with Dismiss Persistence), Service Worker Stale-While-Revalidate + Network-First PWA Caching, Service Worker Push Notification + Background Sync Handlers

### Community 31 - "Documentation & Setup"
Cohesion: 0.7
Nodes (5): Bridge Credential Sharing via sessionStorage (bridge_user_id, bridge_api_key), Groq AI Client (Bridge-Proxy, Vision/PDF, Retry Backoff), Exponential Backoff with Jitter Retry Pattern, Vite Dev Proxy to Bridge (localhost:3001), WhatsApp Bridge Client (Register, Connect, Groups, Events, Watched Groups)

### Community 32 - "Deployment Configs"
Cohesion: 1.0
Nodes (4): iOS Apple Touch Icon (180x180), PWA Icon 192x192, PWA Icon 512x512, Kairo App SVG Icon (PWA Source)

### Community 33 - "Calendar Event Modal"
Cohesion: 0.67
Nodes (4): Application Error Screenshot, Kairo Test Results (Final Passing), Time Input Validation Error Screenshot, Week View Calendar UI Documentation Screenshot

### Community 35 - "WhatsApp Connection UI"
Cohesion: 0.67
Nodes (3): NotificationItem, deleteNotification (useNotificationStore), markRead (useNotificationStore)

### Community 36 - "Toast Notifications"
Cohesion: 0.67
Nodes (3): Kairo (AI-powered calendar with WhatsApp integration), Microservices Architecture (React frontend + Supabase + Bridge + Groq), Offline-First Architecture (localStorage cache + optimistic UI)

## Ambiguous Edges - Review These
- `Application Error Screenshot` → `Time Input Validation Error Screenshot`  [AMBIGUOUS]
  time-validation-error.png · relation: semantically_similar_to
- `Application Error Screenshot` → `Kairo Test Results (Final Passing)`  [AMBIGUOUS]
  kairo-test-final.png · relation: conceptually_related_to
- `Time Input Validation Error Screenshot` → `Week View Calendar UI Documentation Screenshot`  [AMBIGUOUS]
  time-validation-error.png · relation: conceptually_related_to

## Knowledge Gaps
- **272 isolated node(s):** `PRECACHE_ASSETS`, `url`, `responseClone`, `fetchPromise`, `data` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Application Error Screenshot` and `Time Input Validation Error Screenshot`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Application Error Screenshot` and `Kairo Test Results (Final Passing)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Time Input Validation Error Screenshot` and `Week View Calendar UI Documentation Screenshot`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useEventStore` connect `Core UI Components` to `AI/Groq API Client`, `Accessibility & UI Utilities`, `WhatsApp Bridge Client`, `Event Store Tests`, `Calendar Day/Week Views`, `Date Utilities & Tasks`, `Holiday API & External Data`, `Chat LLM Integration`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `Accessibility & UI Utilities` to `Core UI Components`, `Calendar Day/Week Views`, `Holiday API & External Data`, `WhatsApp Bridge Client`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useDarkStore` connect `Core UI Components` to `Accessibility & UI Utilities`, `WhatsApp Bridge Client`, `Holiday API & External Data`, `WhatsApp WebSocket Hooks`, `Sidebar Navigation Components`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `PRECACHE_ASSETS`, `url`, `responseClone` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._