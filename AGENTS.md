# Agent Guidelines for Kairo

An intelligent calendar app with WhatsApp integration. Built with React, TypeScript, Vite, Supabase, and Zustand.

## Build & Test Commands

```bash
# Development
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build

# Testing (Vitest + @testing-library/react)
npm run test             # Run all tests (watch mode)
npm run test:ui          # Run with Vitest UI browser
npm run test:coverage    # Run with coverage report

# Run a SINGLE test file:
npx vitest run src/__tests__/dateUtils.test.js
npx vitest run src/components/Modal/__tests__/EventModal.test.jsx

# Run tests matching a pattern:
npx vitest run --testNamePattern="should format date"
npx vitest run src/__tests__/validation.test.js -t "validateEvent"

# Watch mode for single file:
npx vitest src/__tests__/dateUtils.test.js

# TypeScript type checking (no ESLint configured)
npx tsc --noEmit

# Pre-commit validation
npm run test && npm run build && npx tsc --noEmit
```

## Project Structure

```
src/
├── api/                    # API clients (Groq LLM, WhatsApp bridge)
├── components/             # React components
│   ├── Calendar/           # WeekView, MonthView, DayView, EventBlock, TopBar
│   ├── Chat/               # ChatSidebar, useLLM
│   ├── Modal/              # EventModal, SettingsModal (with tabs/)
│   ├── Notifications/      # NotificationPanel, NotificationItem
│   ├── Sidebar/            # Sidebar, TaskList, MiniCalendar
│   └── WhatsApp/           # WhatsAppSettings, WhatsAppPopup, WhatsAppToast
├── contexts/               # AuthContext.jsx
├── hooks/                  # Custom hooks (useAsync, useDebounce, usePWA, etc.)
├── lib/                    # Utilities (dateUtils, validation, supabase, constants)
├── pages/                  # Auth pages (Login, Signup, ForgotPassword, AuthCallback)
├── store/                  # Zustand stores (useEventStore, useChatStore, etc.)
├── __tests__/              # Root-level test files
├── App.jsx                 # Root component
├── main.jsx                # Entry point
└── setupTests.js           # Vitest setup (localStorage, matchMedia mocks)
```

## Code Style

### TypeScript
- **Strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- Use **`.jsx`** for React components, **`.tsx`** when using TypeScript generics
- Use **`.ts`** for utilities and type definitions
- Use **interface** for object shapes, **type** for unions/primitives
- Use **JSDoc** for exported functions and complex logic
- No ESLint is configured

### Imports
- `import React, { useState } from 'react'` (always include React)
- Use `@/*` path aliases: `import { fmtDate } from '@/lib/dateUtils'`
- Order: React → external libraries → internal modules (blank line separation)
- Use `import type { TypeName }` for type-only imports

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EventModal.jsx`, `WeekView.jsx` |
| Hooks/Stores | camelCase with `use` | `useEventStore.js`, `useMobileLayout.js` |
| Utilities | camelCase | `dateUtils.ts`, `validation.js` |
| Constants | SCREAMING_SNAKE_CASE | `PX_PER_HOUR`, `DEFAULT_DURATION` |
| Types | PascalCase | `Event`, `User`, `MiniCalDay` |
| Test files | `*.test.{js,jsx,ts,tsx}` | `dateUtils.test.js` |

### Components
- Functional components with hooks only (no class components)
- Destructure props: `function EventModal({ isOpen, onClose, defaultDate })`
- Tailwind CSS with CSS variables for theming
- ErrorBoundary for error handling

### State Management (Zustand)
```javascript
export const useEventStore = create((set, get) => ({
  events: [],
  isLoading: false,
  addEvent: async (ev) => {
    set({ isLoading: true })
    try { /* async logic */ } 
    catch (error) { set({ error: error.message, isLoading: false }) }
  },
}))
```

### Error Handling
- Try/catch for all async operations
- Log errors with `console.error` and context
- Use toast notifications for user-facing errors (`useToastStore`)
- Never expose sensitive data in error messages

### Validation & Sanitization
- Always sanitize user input with `sanitizeString()` from `@/lib/validation`
- Date format: **YYYY-MM-DD**, time format: **HH:MM** (24-hour)
- Validate both client and server-side

### Testing Patterns
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../store/useEventStore', () => ({
  useEventStore: () => ({ addEvent: vi.fn(), editEvent: vi.fn() }),
}))

describe('ComponentName', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should do something', async () => {
    render(<Component />)
    await waitFor(() => {
      expect(screen.getByText('Expected')).toBeInTheDocument()
    })
  })
})
```

- Test setup: `src/setupTests.js` (global mocks)
- Test locations: `__tests__/` subdirectory or `src/__tests__/`
- Test timeout: 5 seconds (vitest.config.js)

### Theming & Colors
Dark mode via `class` on `<html>`. Tailwind color classes:
- **Backgrounds**: `main`, `light-bg`, `light-card`, `sidebar`, `sidebar-deep`, `chat`
- **Text**: `light-text`, `light-text-secondary`
- **Accents**: `accent`, `accent-light`
- **Events**: `event-pink`, `event-green`, `event-blue`, `event-amber`, `event-gray`
- Fonts: `DM Sans` (sans), `DM Serif Display` (display)

### Accessibility
- `announce()` from `@/lib/accessibility` for screen readers
- Focus trapping with `createFocusTrap()` for modals
- ARIA attributes: `role`, `aria-modal`, `aria-labelledby`, `aria-describedby`
- Keyboard navigation for all interactive elements

### API Patterns (Supabase)
- Use client from `@/lib/supabase`
- Always include `user_id` filter: `.eq('user_id', userId)`
- Real-time: `supabase.channel()` + `postgres_changes`
- Offline: `pendingSync` queue for optimistic updates

## Environment Configuration

- Variables in `.env` (see `.env.example`)
- Client-side: `import.meta.env.VITE_*`
- Runtime config: `@/lib/envConfig` with validation

## WhatsApp Bridge Server

`whatsapp-bridge/` - Node.js server with `whatsapp-web.js`, runs separately from Vite on port 3001.
