# Xeno CRM — AI-Native Mini CRM for Reaching Shoppers

An AI-native marketing CRM that helps consumer brands intelligently reach their shoppers through personalized campaigns across WhatsApp, SMS, Email, and RCS.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│              (Vite + Vanilla CSS + Recharts)            │
│                     Port 5173                           │
└──────────────┬─────────────────────┬───────────────────┘
               │  REST API           │  REST API
               ▼                     ▼
┌──────────────────────┐   ┌──────────────────────────┐
│    CRM Server        │◄──┤   Channel Service        │
│   (Express.js)       │   │   (Express.js)           │
│    Port 4000         │──►│    Port 4001             │
│                      │   │                          │
│  • Customer API      │   │  • Simulates delivery    │
│  • Segment API       │   │  • Async callbacks       │
│  • Campaign API      │   │  • Retry logic           │
│  • Receipt API       │   │  • Status lifecycle      │
│  • Analytics API     │   │    (delivered → opened    │
│  • AI API (Gemini)   │   │     → read → clicked)    │
└──────────┬───────────┘   └──────────────────────────┘
           │
           ▼
┌──────────────────────┐
│    SQLite Database   │
│   (better-sqlite3)   │
└──────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Vanilla CSS + Recharts + Lucide Icons |
| Backend | Node.js + Express.js |
| Database | SQLite (via better-sqlite3) |
| AI | Google Gemini 2.0 Flash |
| Channel Service | Express.js (separate service) |

## Features

### Core CRM
- **Customer Management** — Ingest, view, search, filter, and sort customer data with order history
- **Audience Segmentation** — Rule-based segment builder with real-time audience preview
- **Campaign Creation** — 4-step wizard: Choose Audience → Channel → Craft Message → Launch
- **Communication Tracking** — Per-message delivery lifecycle (sent → delivered → opened → read → clicked)
- **Analytics Dashboard** — Delivery funnel, status distribution, campaign trends, per-campaign breakdowns

### AI-Native
- **AI Segment Builder** — Describe your audience in natural language; AI generates the rules
- **AI Message Generator** — Describe your campaign goal; AI writes channel-optimized copy
- **AI Campaign Copilot** — Input a business goal, get complete campaign recommendations (audience, channel, offer, message, impact estimate)

### Channel Service (Separate Microservice)
- Simulates message delivery with realistic probability models
- Async callback-driven status updates
- Built-in retry logic for failed callbacks
- Full lifecycle: sent → delivered/failed → opened → read → clicked

## Project Structure

```
xeno1/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Segments.jsx
│   │   │   ├── Campaigns.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Copilot.jsx
│   │   ├── lib/
│   │   │   └── api.js       # Axios client
│   │   ├── App.jsx          # Layout + routing
│   │   ├── main.jsx
│   │   └── index.css        # Design system
│   └── vite.config.js
├── server/                  # CRM backend
│   └── src/
│       ├── routes/
│       │   ├── customers.js
│       │   ├── orders.js
│       │   ├── segments.js
│       │   ├── campaigns.js
│       │   ├── receipts.js
│       │   ├── analytics.js
│       │   └── ai.js
│       ├── db.js            # SQLite adapter
│       ├── schema.js        # Table definitions
│       ├── seed.js          # Seed data
│       └── index.js         # Express app
├── channel-service/         # Stubbed channel service
│   └── src/
│       └── index.js
├── .env                     # Environment variables
└── package.json             # Root orchestrator
```

## Setup & Run

### Prerequisites
- Node.js 18+

### Install
```bash
npm run install:all
```

### Seed Database
```bash
npm run seed
```

### Start All Services
```bash
npm run dev
```

This starts:
- **CRM Server** on http://localhost:4000
- **Channel Service** on http://localhost:4001
- **Frontend** on http://localhost:5173

### Environment Variables
Create a `.env` file in the root:
```env
GEMINI_API_KEY=your_gemini_api_key
CHANNEL_SERVICE_URL=http://localhost:4001
CRM_RECEIPT_URL=http://localhost:4000/api/receipts
CRM_BASE_URL=http://localhost:4000
PORT=4000
```

## API Endpoints

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List with pagination, search, filter |
| GET | `/api/customers/:id` | Customer detail with orders |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/meta/cities` | Distinct cities for filters |

### Segments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/segments` | List all segments |
| GET | `/api/segments/:id` | Segment with matching customers |
| POST | `/api/segments` | Create segment |
| POST | `/api/segments/preview` | Preview matching count |
| DELETE | `/api/segments/:id` | Delete segment |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| GET | `/api/campaigns/:id` | Campaign with communications |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/:id/send` | Send campaign |

### Receipts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/receipts` | Callback from channel service |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard summary |
| GET | `/api/analytics/campaigns` | Campaign-level analytics |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/suggest-segment` | AI segment suggestions |
| POST | `/api/ai/generate-message` | AI message generation |
| POST | `/api/ai/campaign-recommendations` | Full campaign recommendations |

## Design Decisions & Tradeoffs

1. **SQLite over PostgreSQL** — Chose SQLite for zero-config setup. At scale, I'd use PostgreSQL with connection pooling (pgBouncer), read replicas, and proper migrations (Prisma/Knex).

2. **Synchronous DB in receipts** — The receipt callback handler processes updates synchronously. At scale, I'd use a message queue (Redis/Kafka) to decouple receipt ingestion from DB updates, and batch-process status updates.

3. **In-process channel simulation** — The channel service simulates delivery using `setTimeout`. At scale, this would be a proper message broker with persistent queues and consumer groups.

4. **Client-side routing** — Using React Router for SPA navigation. For production, I'd add SSR (Next.js) for SEO and faster initial loads.

5. **AI as enhancement, not replacement** — AI assists at three key touchpoints (segment creation, message writing, campaign planning) while keeping the marketer in control. This is deliberate — AI should augment human decision-making, not replace it.

## Scale Assumptions

- This prototype handles ~100 customers and ~10 campaigns comfortably
- For 100K+ customers: Add database indexing, pagination everywhere, and consider materialized views for analytics
- For high-volume campaigns: Queue-based processing, batch inserts, and streaming callbacks
- For real-time analytics: Move to event streaming (Kafka) + time-series DB (ClickHouse/TimescaleDB)
