/**
 * Run daily (e.g. cron at 11pm) to scrape post/comment counts from Skool and save as today's metric.
 * Requires: SKOOL_SCRAPE_EMAIL, SKOOL_SCRAPE_PASSWORD in .env, and communities with skoolUrl set.
 * Usage: npm run scrape
 */

import { PrismaClient } from "@prisma/client";
import { scrapeSkoolGroup } from "../src/integrations/skool/scraper";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SKOOL_SCRAPE_EMAIL;
  const password = process.env.SKOOL_SCRAPE_PASSWORD;
  if (!email || !password) {
    console.error("Set SKOOL_SCRAPE_EMAIL and SKOOL_SCRAPE_PASSWORD in .env");
    process.exit(1);
  }

  const communities = await prisma.community.findMany({
    where: { skoolUrl: { not: null } },
    select: { id: true, name: true, skoolUrl: true },
  });

  if (communities.length === 0) {
    console.log("No communities with Skool URL found.");
    process.exit(0);
  }

  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(now);

  for (const c of communities) {
    const url = c.skoolUrl!.trim();
    if (!url) continue;
    console.log(`Scraping ${c.name} (${url})...`);
    try {
      const result = await scrapeSkoolGroup(url, email, password);
      if (!result.ok) {
        console.error(`  Failed: ${result.error}`);
        continue;
      }
      await prisma.weeklyMetric.create({
        data: {
          communityId: c.id,
          periodStart,
          periodEnd,
          postsCreated: result.posts,
          commentsCreated: result.comments,
          totalMembers: result.totalMembers ?? undefined,
          newMembers: 0,
          activeMembers: 0,
          churnedMembers: 0,
        },
      });
      console.log(`  Saved: ${result.posts} posts, ${result.comments} comments`);
    } catch (e) {
      console.error(`  Error:`, e);
    }
  }

  console.log("Done.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
