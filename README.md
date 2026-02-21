# Skool Pulse

A simple dashboard for Skool community owners to track **engagement**, **growth**, and **churn** without spreadsheets. Built for VAs/EAs to report weekly metrics in under 5 minutes.

- **Design**: Modern fintech look — black background, orange accents, clean typography, responsive.
- **Data**: Manual input + CSV import today; structure in place for a future Skool API integration.

## Run locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

Create a `.env` file in the project root (copy from `.env.example`):

```
DATABASE_URL="file:./dev.db"
```

Then create the SQLite DB and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 3. Seed demo data (optional)

Creates a demo user and a sample community with metrics, pulse entries, and churn records:

```bash
npm run db:seed
```

**Demo login:** `demo@skoolpulse.com` / `demo1234`

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in, then use the dashboard.

## Features

- **Communities** — Create communities (name, Skool URL, timezone, plan type, tiers). Multiple communities supported.
- **Metrics dashboard** — Per-community, date-range KPIs: new members, total members, posts, comments, active members, engagement rate, upgrades, cost per join, calls booked, revenue. Churn: churned count, churn rate, net growth, retention. “Record metrics” to add data for a period.
- **Churn tracking** — Manual “Mark as churned” form and **CSV import**. Download the template from the Churn page (`/churn-import-template.csv`). Churn table: member, date, reason, notes. Churn reasons: too busy, not seeing value, price, didn’t use, joined for one thing, other.
- **Weekly Pulse** — VA-friendly form: week start, new/churned members, posts, comments, notable wins, top questions, what we’ll test next week. Saved entries appear in “Weekly recap”.
- **Weekly Report** — Auto-generated summary (KPIs, churn, what worked, next actions) for copying into Skool or internal docs. Copy-to-clipboard button.
- **Auth** — Email + password sign up and login.

## CSV import template (churn)

Columns (download from app or use `public/churn-import-template.csv`):

- `member_id_or_name` — Required.
- `status` — `active` or `churned`.
- `start_date` — Optional (YYYY-MM-DD).
- `churn_date` — Required (YYYY-MM-DD).
- `churn_reason` — Optional: too_busy, not_seeing_value, price, didnt_use, joined_for_one_thing, other.
- `notes` — Optional.
- `plan` — Optional: free, premium, vip.
- `source` — Optional: ads, referral, organic.

## Browser extension (recommended)

The **Skool Pulse extension** adds a **sidebar on skool.com** so you can see engagement (posts, comments, members) from the page you’re on and **sync to your dashboard with one click**. No extra login—it uses the Skool tab you already have open.

- **Get it**: On the live site, go to **Dashboard → Extension** and click **Download extension (zip)**. Unzip, then in Chrome go to `chrome://extensions` → Developer mode → **Load unpacked** → select the unzipped `extension` folder. Paste the dashboard URL and token from the same page.
- **Building the zip for the site**: Run **`npm run extension:zip`** to create `public/extension.zip` so the Extension page can offer the download. Run this before deploying if you want the link to work.
- **Automation**: The extension reads the current page and syncs on demand; you choose when to push (e.g. end of day). This is the most reliable “automated” path without a full Skool API.

## Skool API

Skool Pulse integrates with **[SkoolAPI.com](https://skoolapi.com)** (third-party API). Add `SKOOL_API_SECRET` to `.env` (get it from [skoolapi.com/dashboard](https://skoolapi.com/dashboard)), then in **Edit community** use the **Skool API** section to connect with your Skool email/password. Sessions and webhooks are used for connection and (when available) metrics sync. See **`src/integrations/skool/README.md`** for details.

## Tech stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Prisma** + **SQLite** (swap to Postgres by changing `provider` in `prisma/schema.prisma` and `DATABASE_URL`)

## Scripts

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start dev server           |
| `npm run build`| Production build           |
| `npm run start`| Start production server    |
| `npm run db:seed` | Seed demo data          |
| `npm run db:studio` | Open Prisma Studio    |
| `npm run extension:zip` | Build `public/extension.zip` for the Extension page download link |
