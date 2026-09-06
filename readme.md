# Signal Groww

Signal Groww is an AI-assisted market intelligence dashboard for tracking Indian equities, monitoring meaningful price action, and surfacing attention-worthy trading signals in near real time. The app combines a live market feed, deterministic signal scoring, WebSocket updates, and a rich dashboard for watchlists, sector context, and stock analysis.

This project is designed to run locally with minimal setup and also supports optional production integrations such as Supabase and Upstash Redis.

## Overview

The application includes:

- Watchlists for tracking multiple stocks and sectors
- Market overview with benchmark and index context
- Signal scoring based on price, volume, trend, and relative performance
- Attention feed for meaningful market events
- Stock analysis panels with AI-style explanations
- Replay mode for simulated market behavior
- WebSocket-driven market updates in the frontend
- Authentication and user profile support
- In-memory persistence fallback when external services are not configured

## Tech stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Real-time updates: WebSockets
- AI: Google Gemini API with reliable deterministic fallback
- Data layer: in-memory database by default, with Supabase-ready integration
- Cache: Upstash Redis optional, with in-memory fallback
- Market data: Yahoo Finance live feed, plus replay mode

## Project structure

- `src/` — React app and frontend components
- `backend/src/` — API routes, market manager, signal engine, cache, database, auth, AI integration
- `shared/` — shared schemas, constants, and types
- `database/` — database migrations and seed data
- `public/` — static assets
- `server.ts` — Express server and Vite middleware setup
- `vite.config.ts` — frontend dev config

## Features

### Market data and signal engine

The platform evaluates market events using a deterministic scoring model and highlights market moves that stand out relative to the broader market and sector performance. Signals can be of different classes such as:

- HIGH_ATTENTION
- IMPORTANT
- WORTH_WATCHING
- NORMAL

### Live and replay modes

The backend market manager supports:

- LIVE mode using Yahoo Finance market data
- REPLAY mode using an internal replay provider for demo or historical simulations

The app automatically starts in LIVE mode unless `MARKET_FEED_SOURCE` is explicitly set to `REPLAY`.

### AI explanations

Gemini API can generate contextual explanations when configured. If the API key is missing or quota is exceeded, the app falls back to a deterministic explanatory engine so the app remains usable.

### Authentication

The app includes a built-in auth layer and seeded demo user for local testing.

## Environment variables

Create a local environment file based on `.env.example`.

Required variables:

- `GEMINI_API_KEY` — your Google Gemini API key
- `APP_URL` — application URL used by the app runtime

Optional variables:

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` — Supabase credentials
- `UPSTASH_REDIS_REST_URL` — Redis URL for external cache
- `UPSTASH_REDIS_REST_TOKEN` — Redis token for external cache
- `MARKET_FEED_SOURCE` — set to `YAHOO_FINANCE` or `REPLAY`
- `NODE_ENV` — typically left as `development` or `production`

Example:

```bash
GEMINI_API_KEY="your_api_key_here"
APP_URL="http://localhost:3000"
MARKET_FEED_SOURCE="YAHOO_FINANCE"
```

The project is resilient by default and will fall back to an in-memory database and cache if the optional external integrations are not configured.

## Setup instructions

### 1. Install Node.js

Use Node.js 18 or newer.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the sample environment file:

```bash
copy .env.example .env.local
```

Then update the values in `.env.local` with your own API keys and app URL.

### 4. Start the app

```bash
npm run dev
```

The app will run on:

- Frontend: http://localhost:3000
- API: http://localhost:3000/api
- WebSocket market feed: ws://localhost:3000/ws/market

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run lint
```

### Script breakdown

- `npm run dev` — starts the Vite + Express development server
- `npm run build` — creates a production build
- `npm run start` — serves the built production bundle
- `npm run test` — runs the backend test suite
- `npm run lint` — runs TypeScript validation

## Demo login

The app includes a seeded local user for quick testing:

- Email: `demo@signal.local`
- Password: `demo123`

This is configured in the in-memory database and is intended for demo/local usage.

## How the app works

1. The backend starts an Express server and initializes the market manager.
2. The market manager opens a live feed or replay feed and subscribes to instruments.
3. Incoming ticks are cached and evaluated by the signal engine.
4. Meaningful changes are broadcast to the frontend over WebSockets.
5. Stock detail and analysis endpoints combine market state, chart history, and AI explanations.
6. The React front end renders watchlists, market overview, analysis cards, and detail modals.

## Optional integrations

### Supabase

If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided, the database layer can be wired to Supabase. If they are absent, the app defaults to a resilient in-memory relational implementation.

### Upstash Redis

If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are provided, cache operations use Redis. Otherwise, the app uses an in-memory cache fallback.

## Troubleshooting

### App starts but no AI explanations appear

This usually means the `GEMINI_API_KEY` is missing or still uses the placeholder value from `.env.example`. The app is designed to keep running with deterministic fallback explanations.

### Market feed is not updating

Check whether `MARKET_FEED_SOURCE` is set correctly. By default it uses `YAHOO_FINANCE` in live mode. If you want the demo replay flow, set:

```bash
MARKET_FEED_SOURCE="REPLAY"
```

### External services not connecting

This is expected if Supabase or Redis credentials are not configured. The app is designed to degrade gracefully to in-memory behavior.

## Notes

- The repo includes a seeded default user and sample watchlists for immediate local exploration.
- The app is built for local development and testing, but can be extended for deployment with a real database, Redis cache, and production-grade auth.
- No API keys are required for the market data feed itself. Gemini is only needed for higher-end AI-generated explanations.

## License

This project is provided as a local development workspace for market signal exploration and experimentation.
