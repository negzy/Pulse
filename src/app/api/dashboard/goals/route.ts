import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Compute current streak: consecutive days (including today) where daily totals met goal.
 * Uses latest snapshot per community per day (extension may push multiple times).
 */
async function computeStreak(
  userId: string,
  goalLikes: number,
  goalComments: number,
  goalPosts: number,
  todayStart: Date
): Promise<{ currentStreak: number; goalMetToday: boolean }> {
  if (goalLikes === 0 && goalComments === 0 && goalPosts === 0) {
    return { currentStreak: 0, goalMetToday: false };
  }

  const daysBack = 14;
  const from = new Date(todayStart);
  from.setDate(from.getDate() - daysBack);

  const metrics = await prisma.weeklyMetric.findMany({
    where: {
      community: { userId },
      periodStart: { gte: from, lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    select: {
      communityId: true,
      periodStart: true,
      postsCreated: true,
      commentsCreated: true,
      likesCount: true,
    },
  });

  // Per (day, community) keep only latest snapshot
  const byDayCommunity = new Map<string, { posts: number; comments: number; likes: number }>();
  for (const m of metrics) {
    const key = dateKey(m.periodStart) + "|" + m.communityId;
    if (!byDayCommunity.has(key)) {
      byDayCommunity.set(key, {
        posts: m.postsCreated,
        comments: m.commentsCreated,
        likes: m.likesCount,
      });
    }
  }

  // Sum by day
  const byDay = new Map<
    string,
    { posts: number; comments: number; likes: number }
  >();
  for (const [key, val] of Array.from(byDayCommunity)) {
    const day = key.split("|")[0];
    const cur = byDay.get(day) ?? { posts: 0, comments: 0, likes: 0 };
    cur.posts += val.posts;
    cur.comments += val.comments;
    cur.likes += val.likes;
    byDay.set(day, cur);
  }

  // Streak: from today backwards, count consecutive days that met goal
  let streak = 0;
  let goalMetToday = false;
  const todayStr = dateKey(todayStart);
  const todayTotals = byDay.get(todayStr);
  if (todayTotals) {
    goalMetToday =
      todayTotals.likes >= goalLikes &&
      todayTotals.comments >= goalComments &&
      todayTotals.posts >= goalPosts;
  }

  for (let i = 0; i < daysBack; i++) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const str = dateKey(d);
    const tot = byDay.get(str);
    const met =
      tot &&
      tot.likes >= goalLikes &&
      tot.comments >= goalComments &&
      tot.posts >= goalPosts;
    if (met) streak++;
    else break;
  }

  return { currentStreak: streak, goalMetToday };
}

const putSchema = z.object({
  goalLikes: z.number().min(0).default(0),
  goalComments: z.number().min(0).default(0),
  goalPosts: z.number().min(0).default(0),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = startOfDay(new Date());
  let goal = await prisma.dailyGoal.findUnique({
    where: { userId: user.id },
  });
  if (!goal) {
    goal = await prisma.dailyGoal.create({
      data: { userId: user.id },
    });
  }

  const { currentStreak, goalMetToday } = await computeStreak(
    user.id,
    goal.goalLikes,
    goal.goalComments,
    goal.goalPosts,
    todayStart
  );

  return NextResponse.json({
    goalLikes: goal.goalLikes,
    goalComments: goal.goalComments,
    goalPosts: goal.goalPosts,
    currentStreak,
    goalMetToday,
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const data = putSchema.parse(body);

  const goal = await prisma.dailyGoal.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      goalLikes: data.goalLikes,
      goalComments: data.goalComments,
      goalPosts: data.goalPosts,
    },
    update: {
      goalLikes: data.goalLikes,
      goalComments: data.goalComments,
      goalPosts: data.goalPosts,
    },
  });

  const todayStart = startOfDay(new Date());
  const { currentStreak, goalMetToday } = await computeStreak(
    user.id,
    goal.goalLikes,
    goal.goalComments,
    goal.goalPosts,
    todayStart
  );

  return NextResponse.json({
    goalLikes: goal.goalLikes,
    goalComments: goal.goalComments,
    goalPosts: goal.goalPosts,
    currentStreak,
    goalMetToday,
  });
}
