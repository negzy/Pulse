# Vercel environment variables

Add these in **Vercel → your project → Settings → Environment Variables**. Apply to **Production** (and Preview if you want).

---

## Required

| Name | Value | Notes |
|------|--------|------|
| `DATABASE_URL` | `postgresql://...` | **Required.** Get a free Postgres URL below. |

### Get a free Postgres URL (pick one)

1. **[Neon](https://neon.tech)** – Sign up → New project → copy the connection string (use the one that includes `?sslmode=require`).
2. **[Vercel Postgres](https://vercel.com/storage/postgres)** – In Vercel dashboard: Storage → Create Database → Postgres → connect to your project; it will suggest adding `POSTGRES_URL` or `DATABASE_URL`. Use that.
3. **[Supabase](https://supabase.com)** – New project → Settings → Database → Connection string (URI), copy and add `?sslmode=require` if needed.

Paste that full URL as `DATABASE_URL` (e.g. `postgresql://user:password@host/dbname?sslmode=require`). Do **not** use a `file:./dev.db` URL; that’s SQLite and won’t work on Vercel.

---

## Optional (for full app features)

| Name | Value |
|------|--------|
| `SKOOL_API_SECRET` | Your SkoolAPI.com API key (for Connect Skool / integrations). |
| `ENCRYPTION_KEY` | Optional; used to encrypt stored Skool password. If unset, `SKOOL_API_SECRET` is used. |
| `SKOOL_SCRAPE_EMAIL` | Optional; for “Scrape now” without typing credentials. |
| `SKOOL_SCRAPE_PASSWORD` | Optional; for “Scrape now” without typing credentials. |

You can leave these blank to get the app deployed; add them later when you use Skool integration.

---

## Build

The repo’s `build` script already runs:

- `prisma generate` → generate Prisma client  
- `prisma db push` → create/update Postgres tables  
- `next build` → build Next.js  

So you don’t need to change the **Build Command** in Vercel; use the default (npm run build).

---

## Local dev after this

The app now uses **Postgres** in the schema. For local development you can:

- Use the **same** Neon/Vercel Postgres DB with a separate database name (e.g. `pulse_dev`), or  
- Put a **Postgres** `DATABASE_URL` in your local `.env` (e.g. from Neon “dev” branch).  

SQLite is no longer supported by the current schema.
