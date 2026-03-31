# Agent Guidelines for Kairo

Kairo is an intelligent calendar application with WhatsApp integration, built with React, TypeScript, and Supabase.

## Project Overview

```
src/
├── api/                    # API abstraction layer
│   ├── groqClient.js       # Groq LLM API client
│   └── whatsappClient.js   # WhatsApp bridge API client
├── components/             # React components
│   ├── Calendar/           # Calendar views (WeekView, MonthView, DayView, DayColumn, EventBlock, TopBar)
│   ├── Chat/               # Chat sidebar & LLM integration (ChatSidebar, useLLM)
│   ├── Modal/              # Modal dialogs (EventModal, SettingsModal)
│   │   └── tabs/           # Settings modal tabs (CalendarTab, WhatsAppTab, AppearanceTab, etc.)
│   ├── Notifications/      # Notification system (NotificationPanel, NotificationItem)
│   ├── Sidebar/            # Sidebar components (Sidebar, TaskList, MiniCalendar)
│   ├── WhatsApp/           # WhatsApp integration (WhatsAppSettings, WhatsAppPopup, WhatsAppToast)
│   ├── ErrorBoundary.jsx   # Error boundary wrapper
│   ├── Icons.jsx           # Icon components
│   ├── LoadingSpinner.jsx  # Loading state components
│   ├── MobileDrawer.jsx    # Mobile navigation drawer
│   ├── MobileNav.jsx       # Mobile bottom navigation
│   ├── OfflineIndicator.jsx # Network status indicator
│   ├── ProtectedRoute.jsx  # Auth route wrapper
│   ├── PWAInstallPrompt.jsx # PWA installation prompt
│   └── ToastContainer.jsx  # Toast notification system
├── contexts/               # React contexts
│   └── AuthContext.jsx     # Supabase authentication context
├── hooks/                  # Custom React hooks
│   ├── useAsync.js         # Async state management
│   ├── useDebounce.js      # Value debouncing
│   ├── useLocalStorage.js  # localStorage wrapper
│   ├── useMediaQuery.js    # Responsive breakpoints
│   ├── useMobileLayout.js  # Mobile layout detection
│   ├── useNotificationTriggers.js # Notification scheduling
│   ├── usePWA.js           # PWA install prompt
│   ├── useThemeColors.js   # Theme color utilities
│   ├── useWhatsAppBridgeStatus.js # Bridge connection status
│   └── useWhatsAppSync.js  # WhatsApp event sync polling
├── lib/                    # Utility functions
│   ├── accessibility.js    # Screen reader & focus trap utilities
│   ├── constants.ts        # App-wide constants (TypeScript)
│   ├── dateUtils.ts        # Date parsing/formatting (TypeScript)
│   ├── envConfig.js        # Environment configuration
│   ├── supabase.js         # Supabase client initialization
│   ├── supabaseQueries.js  # Supabase query helpers
│   └── validation.js       # Input validation & sanitization
├── pages/                  # Page-level components
│   ├── AuthCallback.jsx    # OAuth callback handler
│   ├── ForgotPassword.jsx  # Password reset page
│   ├── Login.jsx           # Login page
│   └── Signup.jsx          # Registration page
├── store/                  # Zustand state management
│   ├── useChatStore.js     # Chat history & AI messages
│   ├── useDarkStore.js     # Dark mode preference
│   ├── useEventStore.js    # Event CRUD & sync (localStorage persistence)
│   ├── useNotificationStore.js # Notification queue & dismissal
│   ├── useSettingsStore.js # App settings (awake hours, themes, etc.)
│   ├── useToastStore.js    # Toast notifications
│   └── useWhatsAppSettings.js # WhatsApp sync preferences
├── __tests__/              # Test files
│   ├── App.integration.test.jsx
│   ├── dateUtils.test.js
│   ├── useEventStore.test.js
│   └── validation.test.js
├── App.jsx                 # Root component with routing
├── main.jsx                # React entry point
├── setupTests.js           # Vitest global setup
└── index.css               # Global styles & Tailwind imports
```

## Build & Test Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:5173)

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run all tests (Vitest, watch mode)
npm run test:ui          # Run tests with Vitest UI browser
npm run test:coverage    # Run tests with coverage report

# Single test file - use vitest directly:
npx vitest run src/__tests__/dateUtils.test.js
npx vitest run src/components/Modal/__tests__/EventModal.test.jsx

# TypeScript checking
npx tsc --noEmit         # Check types without emitting

# In watch mode, press 'o' to run only changed tests
```

## Code Style Guidelines

### TypeScript & JavaScript
- **Strict TypeScript** is enabled (`strict: true` in tsconfig.json)
- Enable all strict checks: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- Use **JSDoc comments** for exported functions and complex logic (see `src/lib/validation.js` and `src/lib/constants.ts`)
- Prefer **`.jsx`** for React components with UI, **`.tsx`** when using TypeScript generics/typing
- Use **`.ts`** for utilities, hooks, and type definitions
- Use **interface** for object shapes, **type** for unions and primitives
- Use **const** for constants, **let** only when reassignment is needed

### Imports
- React imports: `import React, { useState, useEffect } from 'react'`
- Path aliases: Use `@/*` instead of relative paths (e.g., `import { fmtDate } from '@/lib/dateUtils'`)
- Group imports order: React → external libraries → internal modules (separated by blank lines)
- Side effect imports (like setupTests) should be at the top
- Use `import type { TypeName }` for type-only imports when appropriate

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EventModal.jsx`, `WeekView.jsx` |
| Hooks | camelCase with `use` prefix | `useAsync.js`, `useMobileLayout.js` |
| Stores | camelCase with `use` prefix | `useEventStore.js` |
| Utilities | camelCase | `dateUtils.ts`, `validation.js` |
| Constants | SCREAMING_SNAKE_CASE | `PX_PER_HOUR`, `DEFAULT_DURATION` |
| Types/Interfaces | PascalCase | `Event`, `User`, `MiniCalDay` |
| Files | Match content type | `useEventStore.js`, `dateUtils.ts` |

### Components
- Use **functional components** with hooks (no class components)
- Destructure props at the top: `function EventModal({ isOpen, onClose, defaultDate })`
- Prefer **Tailwind CSS** for styling with CSS variables for theming
- Use **ErrorBoundary** components for error handling in component trees
- Component files should be `.jsx` extension

### Theming & Dark Mode
Dark mode is enabled via `class` on the html element. Use Tailwind color classes directly:
- **Backgrounds**: `main` (light), `light-bg`, `light-card`, `sidebar`, `sidebar-deep`, `sidebar-card`, `chat`
- **Text**: `light-text`, `light-text-secondary`
- **Accents**: `accent`, `accent-light`
- **Event colors**: `event-pink`, `event-green`, `event-blue`, `event-amber`, `event-gray`
- **Chat-specific**: `chat-msg-user`, `chat-msg-ai`, `chat-input`

Custom fonts: `DM Sans` (sans), `DM Serif Display` (display)

### Accessibility
- Use `announce()` from `@/lib/accessibility` for screen reader announcements
- Implement focus trapping in modals with `createFocusTrap()` from `@/lib/accessibility`
- Use ARIA attributes: `role`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-required`
- Keyboard navigation support required for all interactive elements

### State Management (Zustand)
```javascript
// Store pattern (see src/store/useEventStore.js)
export const useEventStore = create((set, get) => ({
  events: [],
  isLoading: false,
  
  // Actions as functions within the store
  addEvent: async (ev) => {
    set({ isLoading: true })
    // ... async logic with try/catch
    set({ error: error.message, isLoading: false })
  },
}))
```

### Error Handling
- Use **try/catch** for all async operations
- Log errors with `console.error` and include context
- Use **toast notifications** for user-facing errors (from `useToastStore`)
- Return error state from stores: `set({ error: error.message, isLoading: false })`
- Never expose sensitive data in error messages

### Testing Patterns
- Use **Vitest** with **@testing-library/react**
- Test setup in `src/setupTests.js` (cleanup, localStorage mock, matchMedia mock)
- Mock stores with `vi.mock()`:
```javascript
vi.mock('../../../store/useEventStore', () => ({
  useEventStore: () => ({
    addEvent: vi.fn(),
    editEvent: vi.fn(),
  }),
}))
```
- Use `fireEvent` for user interactions, `waitFor` for async assertions
- Test file naming: `*.test.{js,jsx,ts,tsx}` or `*.spec.{js,jsx,ts,tsx}`
- Place tests next to components in `__tests__/` subdirectory, or in `src/__tests__/`
- Vitest config: `vitest.config.js` with jsdom environment and 5s timeout

### Validation & Sanitization
- Always **sanitize user input** before storage (see `src/lib/validation.js`)
- Use `sanitizeString()` to remove HTML tags and scripts
- Validate on both client and server-side
- Use **YYYY-MM-DD** date format and **HH:MM** 24-hour time format

### API Patterns (Supabase)
- Use the **supabase client** from `@/lib/supabase`
- Always include `user_id` filter for security: `.eq('user_id', userId)`
- Real-time subscriptions use Supabase channel pattern with `supabase.channel()` and `postgres_changes`
- Handle offline with `pendingSync` queue (see `useEventStore`)
- Use optimistic UI updates for better UX (update UI immediately, sync to DB in background)

## Environment Configuration

- Environment variables in `.env` (see `.env.example`)
- Use `import.meta.env.VITE_*` for client-side variables
- Use `@/lib/envConfig` for runtime env configuration with validation

## WhatsApp Bridge Server

The `whatsapp-bridge/` directory contains a Node.js server for WhatsApp integration:
- Uses `whatsapp-web.js` for WhatsApp Web protocol
- Runs separately from the main Vite dev server
- Requires separate environment configuration

## Pre-commit Checks

Before committing, verify:
1. Tests pass: `npm run test`
2. Build succeeds: `npm run build`
3. No TypeScript errors: `npx tsc --noEmit`
