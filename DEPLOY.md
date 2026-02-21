# Deploy Pulse to production (pulsewav.co)

Your app is ready to deploy. The **domain is not linked in code** — you link it in your hosting provider’s dashboard after deploy. Below is a simple path using **Vercel** (works well with Next.js).

---

## 1. Use Postgres in production (required for Vercel)

The app uses SQLite locally. Vercel (and most serverless hosts) need **Postgres** in production.

- Sign up for a free Postgres DB: [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), or [Supabase](https://supabase.com).
- Copy the connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`).

Then in your project:

1. In **`prisma/schema.prisma`**, change the datasource to:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Set **`DATABASE_URL`** in your host to that Postgres URL (see step 3).

3. Run migrations (you can do this from your machine before or after first deploy):

   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

   Or run the same in the Vercel build (see “Build” below).

---

## 2. Deploy to Vercel

1. Push your code to **GitHub** (or GitLab/Bitbucket).
2. Go to [vercel.com](https://vercel.com) and sign in.
3. **Add New Project** → import your repo.
4. **Environment variables** (in project settings or during import):
   - `DATABASE_URL` = your Postgres connection string.
   - Add any others you use (e.g. `SKOOL_API_SECRET`).
5. **Build**: Vercel usually detects Next.js. If you need to run Prisma in the build, set:
   - **Build Command:** `prisma generate && prisma migrate deploy && next build`  
     (or keep `next build` and run `prisma migrate deploy` once from your machine with production `DATABASE_URL`).
6. Click **Deploy**. You’ll get a URL like `your-project.vercel.app`.

---

## 3. Link your domain (pulsewav.co)

Linking is done in **Vercel**, not in the code.

1. In Vercel: open your project → **Settings** → **Domains**.
2. Under **Domains**, add: **`pulsewav.co`** (and optionally **`www.pulsewav.co`**).
3. Vercel will show the DNS records you need (e.g. A record or CNAME).
4. In the place where you manage **pulsewav.co** (e.g. Namecheap, Cloudflare, Google Domains):
   - Add the A or CNAME record Vercel gives you (pointing to Vercel).
   - Wait for DNS to update (up to 24–48 hours, often a few minutes).
5. Back in Vercel, confirm the domain shows as verified. HTTPS is automatic.

After that, **pulsewav.co** is linked to this project and will open your deployed app.

---

## 4. Extension download after deploy

- The site serves the extension zip from **`/extension.zip`** (file: **`public/extension.zip`**).
- Rebuild the zip before deploying so the download is up to date:

  ```bash
  npm run extension:zip
  ```

- Commit **`public/extension.zip`** and push, or run **`npm run extension:zip`** in your deploy pipeline so each deploy has a fresh zip.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Create Postgres DB and get `DATABASE_URL` |
| 2 | Set `provider = "postgresql"` in `prisma/schema.prisma` |
| 3 | Push repo to GitHub and import project in Vercel |
| 4 | Add `DATABASE_URL` (and other env vars) in Vercel |
| 5 | Deploy; test at `*.vercel.app` |
| 6 | In Vercel → Settings → Domains, add **pulsewav.co** |
| 7 | At your domain registrar, point pulsewav.co to Vercel (A/CNAME) |
| 8 | Run `npm run extension:zip` and commit `public/extension.zip` (or run in CI) |

Your domain is linked when step 6 and 7 are done; the app itself already uses **pulsewav.co** in the extension and UI.
