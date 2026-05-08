<p align="center">
  <img src="docs/assets/kairo-logo.png" alt="Kairo Logo" width="120" height="120" />
</p>

<h1 align="center">Kairo</h1>

<p align="center">
  <strong>AI-Powered Calendar with WhatsApp Integration</strong>
</p>

<p align="center">
  An intelligent calendar application that automatically extracts events from WhatsApp messages using AI, featuring natural language scheduling and real-time sync.
</p>

<p align="center">
  <a href="https://kairocalender.web.app">View Live Demo</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="SETUP.md">Setup Guide</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-3FCF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Llama_3.3-70B-7C3AED?style=flat-square" alt="Llama 3.3" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA" />
</p>

---

## The Problem

College students receive hundreds of WhatsApp messages daily about class schedules, exam dates, assignment deadlines, and event postponements. Important information gets buried in group chats, leading to:

- **Missed deadlines** from overlooked messages
- **Manual calendar entry** that's tedious and error-prone
- **Information scattered** across multiple group chats

## The Solution

**Kairo** automatically monitors your WhatsApp groups and extracts calendar events using AI. Simply connect WhatsApp, select your groups, and let Kairo handle the rest.

<p align="center">
  <img src="docs/assets/demo-screenshot.png" alt="Kairo Dashboard" width="800" />
</p>

## Features

### AI-Powered Event Extraction
- **WhatsApp Integration** — Connects via QR code, monitors selected groups in real-time
- **Multi-format Support** — Extracts events from text messages, images (timetables), and PDFs
- **Smart Filtering** — Uses keyword relevance scoring to identify schedule-related messages
- **Natural Language Processing** — Powered by Llama 3.3 70B via Groq API

### Natural Language Scheduling
Chat with Kairo to manage your calendar:

```
"Add lunch with Sarah at 1pm tomorrow"
"What do I have on Friday?"
"Move my meeting to 3pm"
"Cancel tomorrow's gym session"
```

### Modern Calendar Experience
- **Drag-and-Drop** — Reschedule events by dragging (15-minute snap intervals)
- **Week/Month/Day Views** — Switch between different calendar perspectives
- **Recurring Events** — Support for daily, weekly, and monthly patterns
- **Smart Awake Hours** — Grays out sleep periods (customizable)
- **Dark/Light Theme** — Automatic or manual theme switching

### Real-time Sync
- **Multi-device Support** — Changes sync instantly across all devices
- **Offline-First** — Works without internet, syncs when reconnected
- **Conflict Resolution** — Handles simultaneous edits gracefully

---

## Architecture

Kairo uses a **microservices architecture** with three main components:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KAIRO ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐  │
│  │   React     │────▶│   Supabase   │◀────│  WhatsApp Bridge    │  │
│  │   PWA       │     │   (BaaS)     │     │  (Node.js/Render)  │  │
│  │             │     │              │     │                     │  │
│  │  • Calendar │     │  • Auth      │     │  • whatsapp-web.js  │  │
│  │  • Chat UI  │     │  • Realtime  │     │  • Session Manager  │  │
│  │  • DnD      │     │  • Postgres  │     │  • Event Queue      │  │
│  └──────┬──────┘     └──────────────┘     └──────────┬──────────┘  │
│         │                                            │              │
│         │            ┌──────────────┐                │              │
│         └───────────▶│   Groq API   │◀───────────────┘              │
│                      │  (LLM/AI)    │                               │
│                      │              │                               │
│                      │  Llama 3.3   │                               │
│                      │  70B Model   │                               │
│                      └──────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS | Progressive Web App with offline support |
| **State** | Zustand + localStorage persistence | Client-side state management |
| **Backend** | Supabase (PostgreSQL + Realtime) | Authentication, database, real-time sync |
| **AI/LLM** | Groq API (Llama 3.3 70B) | Natural language processing, event extraction |
| **WhatsApp** | Node.js + whatsapp-web.js | Multi-tenant WhatsApp bridge on Render |
| **Hosting** | Firebase Hosting + Render | Frontend (Firebase), Backend (Render) |

### Key Technical Decisions

1. **Multi-tenant WhatsApp Bridge**
   - Each user gets isolated session management
   - Puppeteer runs in headless mode on Render containers
   - Sessions persist across deployments via Supabase storage

2. **Groq for LLM Inference**
   - Llama 3.3 70B provides high-quality event extraction
   - ~200ms inference time vs. 2-3s for local models
   - Cost-effective for MVP stage

3. **Offline-First Architecture**
   - Events cached in localStorage
   - Optimistic UI updates
   - Background sync when online

---

## Project Structure

```
kairo/
├── src/
│   ├── api/                 # API clients (Groq, WhatsApp)
│   ├── components/          # React components
│   │   ├── Calendar/        # Week/Month/Day views, EventBlock
│   │   ├── Chat/            # AI chat sidebar
│   │   ├── Modal/           # Event editor, Settings
│   │   └── WhatsApp/        # Connection UI, QR scanner
│   ├── contexts/            # Auth context (Supabase)
│   ├── hooks/               # Custom hooks (sync, PWA, etc.)
│   ├── lib/                 # Utilities, date helpers
│   ├── pages/               # Auth pages (Login, Signup)
│   └── store/               # Zustand stores
│
└── whatsapp-bridge/         # Separate Node.js service
    ├── sessions/            # Per-user session management
    ├── bridge-server.js     # Express API server
    └── deploy scripts       # Render deployment
```

---

## Performance & Metrics

| Metric | Value |
|--------|-------|
| Lighthouse Performance | 94/100 |
| First Contentful Paint | 1.2s |
| Time to Interactive | 1.8s |
| Bundle Size (gzipped) | 142 KB |
| Test Coverage | 78 tests passing |

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Firebase Hosting | [kairocalender.web.app](https://kairocalender.web.app) |
| WhatsApp Bridge | Render | `kairo-bridge.onrender.com` |
| Database | Supabase | Managed PostgreSQL |
| AI/LLM | Groq Cloud | API-based |

---

## Getting Started

See the complete [Setup Guide](SETUP.md) for local development instructions.

**Quick Start:**
```bash
# Clone and install
git clone https://github.com/srineshr1/kairo.git
cd kairo && npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

---

## Screenshots

<table>
  <tr>
    <td><img src="docs/assets/week-view.png" alt="Week View" /></td>
    <td><img src="docs/assets/chat-ai.png" alt="AI Chat" /></td>
  </tr>
  <tr>
    <td align="center"><em>Week View with Drag & Drop</em></td>
    <td align="center"><em>Natural Language Scheduling</em></td>
  </tr>
  <tr>
    <td><img src="docs/assets/whatsapp-sync.png" alt="WhatsApp Sync" /></td>
    <td><img src="docs/assets/dark-mode.png" alt="Dark Mode" /></td>
  </tr>
  <tr>
    <td align="center"><em>WhatsApp Integration</em></td>
    <td align="center"><em>Dark Mode</em></td>
  </tr>
</table>

---

## Future Roadmap

- [ ] Google Calendar sync (OAuth integration)
- [ ] Telegram bot integration
- [ ] Shared calendars for teams
- [ ] Voice input for event creation
- [ ] Calendar analytics dashboard

---

## License

This project is private and not open for redistribution.

---

<p align="center">
  <strong>Built with React + Supabase + Groq AI</strong>
</p>

<p align="center">
  <a href="https://kairocalender.web.app">Live Demo</a> &bull;
  <a href="SETUP.md">Setup Guide</a> &bull;
  <a href="ARCHITECTURE.md">Architecture Docs</a>
</p>
