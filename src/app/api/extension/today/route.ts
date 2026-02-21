import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin?.startsWith("chrome-extension://") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders(null) });
}

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfNextDayLocal(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Returns today's engagement across all communities for the extension (Bearer token auth).
 * Totals are aggregated across all communities — one source of truth for "Pulse".
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const auth = req.headers.get("authorization");
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!raw) {
    return NextResponse.json({ error: "Missing token" }, { status: 401, headers: corsHeaders(origin) });
  }

  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const record = await prisma.extensionToken.findFirst({
    where: { tokenHash: hash },
    include: { user: { select: { id: true } } },
  });
  if (!record) {
    return NextResponse.json(
      { error: "Invalid token. In the dashboard go to Extension, generate a new token, and paste it in the extension options (right‑click icon → Options)." },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  const now = new Date();
  const dayStart = startOfDayLocal(now);
  const dayEnd = startOfNextDayLocal(now);

  const metrics = await prisma.weeklyMetric.findMany({
    where: {
      community: { userId: record.userId },
      periodStart: { gte: dayStart, lt: dayEnd },
    },
    include: { community: { select: { id: true, name: true, skoolGroupSlug: true, skoolUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byCommunity = new Map<
    string,
    { name: string; slug: string | null; posts: number; comments: number; likes: number; interactions: number }
  >();
  for (const m of metrics) {
    if (!byCommunity.has(m.communityId)) {
      byCommunity.set(m.communityId, {
        name: m.community.name,
        slug: m.community.skoolGroupSlug ?? m.community.skoolUrl ?? null,
        posts: m.postsCreated,
        comments: m.commentsCreated,
        likes: m.likesCount,
        interactions: m.interactionsCount,
      });
    }
  }

  const rows = Array.from(byCommunity.entries()).map(([id, r]) => ({ communityId: id, ...r }));
  const totals = rows.length
    ? rows.reduce(
        (acc, r) => ({
          posts: acc.posts + r.posts,
          comments: acc.comments + r.comments,
          likes: acc.likes + r.likes,
          interactions: acc.interactions + r.interactions,
        }),
        { posts: 0, comments: 0, likes: 0, interactions: 0 }
      )
    : { posts: 0, comments: 0, likes: 0, interactions: 0 };

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return NextResponse.json(
    { dateLabel, totals, rows },
    { headers: corsHeaders(origin) }
  );
}
