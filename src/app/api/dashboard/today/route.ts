import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
 * Returns today's engagement (likes, comments, posts, interactions) across all communities.
 * Used by the Today page for initial load and polling (real-time feel).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = startOfDayLocal(now);
  const dayEnd = startOfNextDayLocal(now);

  const metrics = await prisma.weeklyMetric.findMany({
    where: {
      community: { userId: user.id },
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

  return NextResponse.json({ dateLabel, totals, rows });
}
