# Agent Guidelines for Kairo

Kairo is a calendar application with WhatsApp integration, built with React, TypeScript, and Supabase.

## Project Overview

```
src/
├── components/     # React components (Calendar/, Chat/, Modal/, etc.)
├── contexts/        # React contexts (AuthContext)
├── hooks/          # Custom hooks (useAsync, useDebounce, etc.)
├── lib/            # Utilities (dateUtils, validation, supabase, constants)
├── api/            # API clients (groqClient, whatsappClient)
├── store/          # Zustand stores (useEventStore, useChatStore)
├── pages/          # Page components (Login, Signup, etc.)
└── __tests__/      # Test files
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
- Prefer **`.tsx`** for React components, **`.ts`** for utilities/hooks/types
- Use **interface** for object shapes, **type** for unions and primitives
- Use **const** for constants, **let** only when reassignment is needed

### Imports
- React imports: `import React, { useState, useEffect } from 'react'`
- Path aliases: Use `@/*` instead of relative paths (e.g., `import { fmtDate } from '@/lib/dateUtils'`)
- Group imports order: React → libraries → local imports
- Side effect imports (like setupTests) should be at the top

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
Dark mode is enabled via `class` on the html element. Use CSS variables for theme-aware colors:
```jsx
// Light mode: use 'theme-text-primary', 'theme-bg', etc.
// Dark mode: CSS vars like 'var(--color-accent)' are defined in :root
// Custom colors in tailwind.config.js: sidebar, chat, accent, event-*
```

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
- Real-time subscriptions use Supabase channel pattern
- Handle offline with `pendingSync` queue (see `useEventStore`)

### Tailwind CSS
- Custom colors defined in `tailwind.config.js` (sidebar, chat, accent, event colors)
- Use `darkMode: 'class'` - dark mode via `class` on html element
- Mobile-first responsive design
- Custom fonts: `DM Sans` (sans), `DM Serif Display` (display)
- Event colors: `event-pink`, `event-green`, `event-blue`, `event-amber`, `event-gray`

## Environment Configuration

- Environment variables in `.env` (see `.env.example`)
- Use `import.meta.env.VITE_*` for client-side variables
- Use `@/lib/envConfig` for runtime env configuration with validation

## Pre-commit Checks

Before committing, verify:
1. Tests pass: `npm run test`
2. Build succeeds: `npm run build`
3. No TypeScript errors: `npx tsc --noEmit`
