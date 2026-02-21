/**
 * Skool scraper: log in and try to extract post/comment counts from the group page.
 * Used for auto-populating daily metrics when no API/webhook provides them.
 * Requires Playwright. Run via script (cron) or "Scrape now" when Playwright is installed.
 */

export type ScrapeResult = {
  posts: number;
  comments: number;
  totalMembers?: number;
  ok: boolean;
  error?: string;
};

const SKOOL_LOGIN = "https://www.skool.com/login";
const SKOOL_HOME = "https://www.skool.com";

/**
 * Extraction logic run inside the browser (Playwright page.evaluate).
 * Returns serializable { posts, comments, totalMembers }.
 */
function extractCountsInBrowser(): { posts: number; comments: number; totalMembers?: number } {
  const doc = typeof document !== "undefined" ? document : (null as unknown as Document);
  if (!doc?.body) return { posts: 0, comments: 0 };
  const body = doc.body.innerText ?? "";
  let posts = 0;
  let comments = 0;
  let totalMembers: number | undefined;

  const postMatch = body.match(/(\d+(?:\.\d+)?\s*k?)\s*posts?|posts?\s*[:\s]*(\d+(?:\.\d+)?\s*k?)/i) ?? body.match(/(\d+)\s*posts?/i);
  if (postMatch) {
    const raw = String(postMatch[1] ?? postMatch[2] ?? "0").trim().replace(/\s*k$/i, "000");
    posts = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")) * (raw.toLowerCase().includes("k") ? 1000 : 1));
  }
  const commentMatch = body.match(/(\d+(?:\.\d+)?\s*k?)\s*comments?|comments?\s*[:\s]*(\d+(?:\.\d+)?\s*k?)/i) ?? body.match(/(\d+)\s*comments?/i);
  if (commentMatch) {
    const raw = String(commentMatch[1] ?? commentMatch[2] ?? "0").trim().replace(/\s*k$/i, "000");
    comments = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")) * (raw.toLowerCase().includes("k") ? 1000 : 1));
  }
  const memberMatch = body.match(/(\d+(?:\.\d+)?\s*k?)\s*members?|members?\s*[:\s]*(\d+(?:\.\d+)?\s*k?)/i) ?? body.match(/(\d+)\s*members?/i);
  if (memberMatch) {
    const raw = String(memberMatch[1] ?? memberMatch[2] ?? "0").trim().replace(/\s*k$/i, "000");
    totalMembers = Math.round(parseFloat(raw.replace(/[^0-9.]/g, "")) * (raw.toLowerCase().includes("k") ? 1000 : 1));
  }
  if (posts === 0 && comments === 0) {
    const possiblePosts = doc.querySelectorAll('[class*="post"], [data-testid*="post"], article, [role="article"]');
    const possibleComments = doc.querySelectorAll('[class*="comment"], [data-testid*="comment"]');
    if (possiblePosts.length > 0) posts = possiblePosts.length;
    if (possibleComments.length > 0) comments = possibleComments.length;
  }
  return { posts, comments, totalMembers };
}

/**
 * Run the scraper for one community. Call from a script or API route that has Playwright installed.
 */
export async function scrapeSkoolGroup(
  skoolUrl: string,
  email: string,
  password: string
): Promise<ScrapeResult> {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    return {
      posts: 0,
      comments: 0,
      ok: false,
      error: "Playwright not installed. Run: npm install playwright",
    };
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Login
    await page.goto(SKOOL_LOGIN, { waitUntil: "networkidle", timeout: 30000 });
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="mail" i]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"], input[type="submit"], [type="submit"], a:has-text("Log in")').catch(() =>
      page.click('button:has-text("Log"), button:has-text("Log in")')
    );
    await page.waitForURL((url) => url.href !== SKOOL_LOGIN && url.href.startsWith(SKOOL_HOME), { timeout: 15000 }).catch(() => {});

    // Group page (normalize URL: ensure we're on the group)
    const groupUrl = skoolUrl.startsWith("http") ? skoolUrl : `https://www.skool.com/${skoolUrl.replace(/^\//, "")}`;
    await page.goto(groupUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 3000)); // allow SPA to render

    const { posts, comments, totalMembers } = await page.evaluate(extractCountsInBrowser);
    await browser.close();

    return {
      posts,
      comments,
      totalMembers,
      ok: true,
    };
  } catch (e) {
    await browser.close().catch(() => {});
    return {
      posts: 0,
      comments: 0,
      ok: false,
      error: e instanceof Error ? e.message : "Scrape failed",
    };
  }
}
