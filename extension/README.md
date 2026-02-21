# Skool Pulse – Browser Extension

Sidebar that appears on **skool.com** so you can see engagement (posts, comments, members) from the current page and sync it to your Skool Pulse dashboard with one click.

## How to get the extension

Right now the extension is installed as an **unpacked** extension (not in the Chrome Web Store). Users can get it in one of these ways:

1. **Download from pulsewav.co**  
   The dashboard at **pulsewav.co** has an **Extension** page with a **Download extension (zip)** link. Users download the zip, unzip it, then follow **Install (Chrome)** below and choose the unzipped `extension` folder when they click “Load unpacked”.  
   To update the zip that the site serves, run from the project root: **<code>npm run extension:zip</code>**. That creates <code>public/extension.zip</code>. Deploy or copy that so the site can serve it.

2. **From the repo**  
   If the project is in a Git repo (e.g. GitHub), users can clone the repo and use the `extension` folder inside it for “Load unpacked”.

3. **Chrome Web Store (later)**  
   To offer “Add to Chrome” from the Store you’d need to:
   - Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) (one-time fee).
   - Zip only the extension files (e.g. `extension` folder contents, with `manifest.json` at the root of the zip).
   - Upload the zip in the developer dashboard and submit for review.  
   Then users could get the extension by searching for it on the Chrome Web Store or via a link you share.

## Where do I get the token?

1. Open **pulsewav.co** (the Pulse dashboard).
2. Log in and go to **Dashboard**.
3. Click **Extension** in the top nav.
4. In the **Extension token** block, click **Generate token** (or **Regenerate token**).
5. **Copy the token** right away (it's only shown once) and paste it into the extension **Options**.

## Install (Chrome)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension` folder.
4. Get your token from the Pulse dashboard (see **Where do I get the token?** above).
5. Right-click the Skool Pulse extension → **Options**. Enter your Pulse URL and token, then click **Save**.
6. **Start using it:** Go to **skool.com** and open one of your group pages. Click the **Skool Pulse** icon in the Chrome toolbar — the **side panel** opens (like the Meta Pixel helper). You'll see posts, comments, and members from the page. Click **Sync to Pulse** to save today's numbers to your dashboard.

## Matching your community

In Skool Pulse, the community must have the **Skool URL** or **group slug** set so the extension can match the current page. Example: if you're on `skool.com/my-group`, add a community with Skool URL `https://www.skool.com/my-group` or group slug `my-group`.

## What's automated

- **Read from page**: The extension reads the current Skool page for post count, comment count, likes, interactions, and (when visible) member count. No separate login—you're already on Skool.
- **Your activity (internal tracking)**: Likes and comments **you** give on Skool are counted in the side panel ("Your Posts", "Your Comments", "Your Likes"). Counts are stored in Chrome storage by day and persist across tabs and groups. See **Internal tracking** below if you need to debug or change this.
- **Sync to Pulse**: One click sends those numbers to your dashboard as today's metric. You can sync whenever you want (e.g. end of day).
- **Post Scheduler**: Preload posts and schedule them to publish automatically per community (see **Scheduler** below).
- **Motivation tracking**: Tracks activity across all your communities and shows comeback prompts if you go inactive (see **Comeback prompts** below).

---

## Internal tracking (Your activity)

The side panel shows **Your Posts**, **Your Comments**, **Your Likes** — these are **your** actions on Skool (not page totals). Implemented in **content.js** (like/comment/post detection) and **sidepanel.js** (display + fallback from storage).

- **Storage key**: `skoolPulse_personal_YYYY-M-D` (local date). Storage is the source of truth; content script merges in-memory with storage on each track and when answering `getStats`.
- **Comment likes on Skool**: The like control is a **div** (not a `<button>`): `TooltipWrapper` → `VotesLabelWrapper` → `VotesLabel` (number). Detection uses class substrings and `composedPath()`; both `click` and `mousedown` are listened for.
- **If "Your Likes" stays 0**: Skool may have changed their DOM. In DevTools, right‑click the comment like (the number) → Inspect, then copy the outer HTML of the clickable wrapper and share it so selectors can be updated.

---

## Scheduler

**Tagline:** "Check your community's PULSE"

The Scheduler lets you preload posts and schedule them to publish automatically at specific times.

### How it works

1. Open the **Scheduler** from extension Options (link at bottom) or right-click extension → Options → "Open Scheduler".
2. Select a community, write your post (title optional, body required), pick date/time.
3. Click **Add to queue**. The post will be scheduled and published automatically at the chosen time.
4. Use **Suggest next slot** to find the next available time that respects all limits.

### Limits (hard constraints)

- **Max 3 queued/scheduled posts per community** at any time
- **Max 3 scheduled posts per day** TOTAL across all communities
- **Minimum 2-hour buffer** between scheduled posts (global, not per-day)

If you try to schedule a post that violates these limits, you'll see a friendly error message:
- "Community limit reached: max 3 queued posts for this community."
- "Daily limit reached: max 3 scheduled posts per day."
- "Too close to another post: keep at least 2 hours between scheduled posts."

### Publishing behavior

- Uses Chrome Alarms to trigger publishing at the scheduled time.
- On trigger: Opens the Skool group page and attempts to fill the post composer with your content.
- If you're not logged into Skool, the post is marked **FAILED** with reason "AUTH_REQUIRED" and you'll be notified.
- Failed posts can be retried up to 2 times (exponential backoff: 5 min, then 30 min).
- After final failure, the post stays **FAILED** with a "Retry now" button in the Scheduler.

### Pause/resume

Use the **"Pause scheduler (global)"** checkbox in the Scheduler to temporarily disable all scheduled publishing. When paused, no alarms fire and posts stay in QUEUED/SCHEDULED status.

---

## Comeback prompts

**Tagline:** "Check your community's PULSE"

The extension tracks meaningful activity (any sync from any community) across **all your communities**. If you go inactive, you'll see encouraging prompts to get back on track.

### Motivation states

- **ACTIVE**: You've had activity today or recently.
- **AT_RISK**: You haven't completed today's tasks (no activity today). Shows a subtle banner.
- **INACTIVE**: No meaningful activity across ALL communities for 2 consecutive days. Shows the comeback modal.
- **DETENTION**: Tasks are frozen until overdue tasks are completed (if you have a goals system that sets this).

### Comeback modal

When you're INACTIVE, you'll see a modal with:
- **Primary message**: "Where did you go?"
- **Secondary message**: "What happened to us crushing our goals?"
- **Buttons**:
  - **"I'm back — show today's tasks"**: Closes the modal and focuses on your tasks.
  - **"Reschedule my tasks"**: Opens your Pulse dashboard.
  - **"Snooze (24h)"**: Suppresses the modal for 24 hours.

### Snooze behavior

- Clicking "Snooze (24h)" suppresses the comeback modal for 24 hours.
- The snooze timestamp is stored and checked before showing the modal again.
- After 24 hours, if you're still INACTIVE, the modal will appear again.

---

## All-groups tracking

Engagement tracking and goal progress are computed **globally across ALL communities** you're in. The extension syncs activity from any community, and the motivation system considers activity from all communities when determining your state (ACTIVE, AT_RISK, INACTIVE).

You can still view per-community breakdowns in your dashboard, but the extension's motivation features work across all groups.

---

## Logo / icon

Default orange square icons are generated for you. To create or refresh them:

```bash
npm run extension:icons
```

This writes `extension/icons/icon16.png` and `extension/icons/icon48.png` (orange #f97316). After that, reload the extension in `chrome://extensions`.

**Use your own logo:** Replace `extension/icons/icon16.png` (16×16 px) and `extension/icons/icon48.png` (48×48 px) with your own PNGs, then reload the extension.

---

## Side panel doesn't open when I click the icon

1. **Reload the extension:** Go to `chrome://extensions`, find Skool Pulse, and click **Reload**.
2. **Chrome version:** Side panel needs Chrome **114 or newer**. Check `chrome://settings/help`.
3. **Open the panel from the menu:** Click the **Side panel** icon in Chrome's top-right (toolbar) to open the side panel strip, then choose **Skool Pulse** from the list. After that, the extension icon may open it directly.
4. **Right‑click the icon:** Right‑click the Skool Pulse icon and see if **Open side panel** (or similar) appears; use that once.
