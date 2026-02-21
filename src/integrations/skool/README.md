# Skool API Integration

Skool Pulse uses the **SkoolAPI.com** third-party API to connect your Skool account and (when available) sync metrics via sessions and webhooks.

- **Docs:** [docs.skoolapi.com](https://docs.skoolapi.com)
- **Dashboard (API keys):** [skoolapi.com/dashboard](https://skoolapi.com/dashboard)

## Setup

1. **Get an API key** from [Skool API Dashboard](https://skoolapi.com/dashboard) → API Keys.
2. **Add to `.env`:**
   ```env
   SKOOL_API_SECRET=your_api_secret_here
   ```
   Optional: `SKOOL_API_BASE_URL=https://api.skoolapi.com` (default).

3. **Connect a community:** Edit community → **Skool API** section → enter your Skool email and password (and optional group slug) → **Connect Skool**. Your password is not stored; we create a session and store only the session ID.

## What’s implemented

- **Sessions:** Create session (Skool email + password), get status, delete session. Session ID is stored on the community; password is never stored.
- **Connect / Disconnect:** UI on the community edit page; connect creates a session and saves `skoolSessionId` and optional `skoolGroupSlug`.
- **Sync:** “Sync now” checks session status. When SkoolAPI.com adds pull endpoints for group stats or members, sync will fetch and update `WeeklyMetric` / churn data.
- **Webhooks:** `POST /api/webhooks/skool` receives webhooks from SkoolAPI.com. When you create a webhook (e.g. events: `group_stats`), set the URL to your app’s public base + `/api/webhooks/skool`. Payload is matched to a community by `skoolGroupSlug` and applied via `applyGroupStats()`.

## Code layout

- **`client.ts`** – SkoolAPI.com HTTP client: sessions (create, get, delete), webhooks (create, list, delete).
- **`sync.ts`** – `applyGroupStats(communityId, payload)` maps webhook/API payload into `WeeklyMetric`.
- **API routes:** `api/integrations/skool/connect`, `disconnect`, `status`, `sync`; `api/webhooks/skool` for incoming webhooks.

## Webhook payload (group_stats)

When SkoolAPI sends a `group_stats` event, the payload may include:

- `group` – slug (must match community’s `skoolGroupSlug`)
- `total_members`, `new_members`, `posts`, `comments`, `active_members`
- `period_start`, `period_end` (optional)

These are written into a new `WeeklyMetric` row for that community and period.

## Auto-fill posts and comments (scrape)

Skool doesn’t expose a public API for post/comment counts. To auto-populate **posts** and **comments** (e.g. after each day):

1. **Scrape now (manual)**  
   In **Edit community** → Skool API section → use **Scrape now**. Enter your Skool email/password (or set `SKOOL_SCRAPE_EMAIL` and `SKOOL_SCRAPE_PASSWORD` in `.env`). This logs into Skool, opens the community’s Skool URL, and tries to read post/comment counts from the page, then saves a metric for today.

2. **Daily automatic**  
   Install Playwright and Chromium (`npm install playwright` then `npx playwright install chromium`), set `SKOOL_SCRAPE_EMAIL` and `SKOOL_SCRAPE_PASSWORD` in `.env`, and run daily:
   ```bash
   npm run scrape
   ```
   (e.g. cron: `0 23 * * * cd /path/to/skool-pulse && npm run scrape`.)  
   The script scrapes every community that has a **Skool URL** set and creates a `WeeklyMetric` row for today.

Scraping is best-effort (page structure may change). Prefer SkoolAPI.com webhooks for `group_stats` when available.

## Security

- Never store Skool passwords. Only the session ID is stored.
- Keep `SKOOL_API_SECRET` server-side only (env). Sessions can be invalidated from the community edit page (Disconnect).
