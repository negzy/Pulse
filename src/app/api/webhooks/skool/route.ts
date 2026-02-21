import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyGroupStats } from "@/integrations/skool/sync";

/**
 * SkoolAPI.com webhook receiver. Register this URL when creating a webhook (e.g. events: group_stats).
 * Your app base URL must be public for SkoolAPI to reach it (e.g. https://yourapp.com/api/webhooks/skool).
 *
 * Payload shape (example): { group: "slug", total_members, new_members, posts, comments, ... }
 * We match community by skoolGroupSlug === payload.group.
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as { group?: string; [key: string]: unknown };
    const groupSlug = payload.group;
    if (!groupSlug || typeof groupSlug !== "string") {
      return NextResponse.json({ error: "Missing group" }, { status: 400 });
    }

    const community = await prisma.community.findFirst({
      where: { skoolGroupSlug: groupSlug },
    });
    if (!community) {
      return NextResponse.json({ ok: false, message: "Community not found for group" }, { status: 200 });
    }

    await applyGroupStats(community.id, payload as Parameters<typeof applyGroupStats>[1]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Skool webhook error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
