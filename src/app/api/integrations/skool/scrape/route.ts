import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/encrypt";
import { scrapeSkoolGroup } from "@/integrations/skool/scraper";
import { z } from "zod";

const bodySchema = z.object({
  communityId: z.string().cuid(),
  skoolEmail: z.string().email().optional(),
  skoolPassword: z.string().optional(),
});

/**
 * Scrape Skool group page for post/comment counts and save as today's metric.
 * Uses (in order): credentials from request body, or stored from Connect (user's login), or env.
 * Requires Playwright installed (npm install playwright). May be slow (15–30s).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const { communityId, skoolEmail: bodyEmail, skoolPassword: bodyPassword } = bodySchema.parse(body);
    const community = await prisma.community.findFirst({
      where: { id: communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });
    if (!community.skoolUrl?.trim()) {
      return NextResponse.json({ error: "Community has no Skool URL set. Add the Skool URL in the form above." }, { status: 400 });
    }

    let email: string | null = bodyEmail?.trim() ?? null;
    let password: string | null = bodyPassword ?? null;

    if (!email || !password) {
      if (community.skoolEmail && community.skoolPasswordEncrypted) {
        try {
          email = community.skoolEmail;
          password = decrypt(community.skoolPasswordEncrypted);
        } catch {
          // Decryption failed (e.g. key changed)
        }
      }
    }
    if (!email || !password) {
      email = email ?? process.env.SKOOL_SCRAPE_EMAIL ?? null;
      password = password ?? process.env.SKOOL_SCRAPE_PASSWORD ?? null;
    }

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Enter your Skool email and password above to pull your community's posts and comments, or connect Skool first so we can use your saved login.",
        },
        { status: 400 }
      );
    }

    const result = await scrapeSkoolGroup(community.skoolUrl, email, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Scrape failed", posts: 0, comments: 0 },
        { status: 422 }
      );
    }

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(now);

    await prisma.weeklyMetric.create({
      data: {
        communityId,
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

    return NextResponse.json({
      ok: true,
      posts: result.posts,
      comments: result.comments,
      totalMembers: result.totalMembers,
      message: "Saved today's counts. Run daily (e.g. cron) or use “Scrape now” to auto-populate.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scrape failed" },
      { status: 500 }
    );
  }
}
