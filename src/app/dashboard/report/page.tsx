import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ReportClient from "@/components/ReportClient";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { community: communityId, from, to } = await searchParams;
  const communities = await prisma.community.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const selectedId = communityId && communities.some((c) => c.id === communityId) ? communityId : communities[0]?.id;
  const periodEnd = to ? new Date(to) : new Date();
  const periodStart = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();

  let community = null;
  let metrics: { newMembers: number; totalMembers: number; postsCreated: number; commentsCreated: number; activeMembers: number; churnedMembers: number; startingPaidMembers: number | null; upgradeConversions: number; revenue: number | null }[] = [];
  let churnCount = 0;
  let latestPulse: { notableWins: string | null; topQuestions: string | null; testNextWeek: string | null; weekStart: Date } | null = null;

  if (selectedId) {
    community = await prisma.community.findFirst({
      where: { id: selectedId, userId: user.id },
    });
    if (community) {
      metrics = await prisma.weeklyMetric.findMany({
        where: {
          communityId: selectedId,
          periodStart: { gte: periodStart },
          periodEnd: { lte: periodEnd },
        },
        orderBy: { periodStart: "asc" },
      });
      churnCount = await prisma.churnEvent.count({
        where: {
          communityId: selectedId,
          status: "churned",
          churnDate: { gte: periodStart, lte: periodEnd },
        },
      });
      latestPulse = await prisma.weeklyPulse.findFirst({
        where: { communityId: selectedId },
        orderBy: { weekStart: "desc" },
        select: { notableWins: true, topQuestions: true, testNextWeek: true, weekStart: true },
      });
    }
  }

  const newMembers = metrics.reduce((s, m) => s + m.newMembers, 0);
  const totalMembers = metrics[metrics.length - 1]?.totalMembers ?? 0;
  const posts = metrics.reduce((s, m) => s + m.postsCreated, 0);
  const comments = metrics.reduce((s, m) => s + m.commentsCreated, 0);
  const active = metrics.reduce((s, m) => s + m.activeMembers, 0);
  const churned = metrics.reduce((s, m) => s + m.churnedMembers, 0) || churnCount;
  const startingPaid = metrics[metrics.length - 1]?.startingPaidMembers ?? totalMembers;
  const churnRate = startingPaid > 0 ? ((churned / startingPaid) * 100).toFixed(1) : "0";
  const retentionRate = startingPaid > 0 ? (100 - (churned / startingPaid) * 100).toFixed(1) : "100";
  const upgrades = metrics[metrics.length - 1]?.upgradeConversions ?? 0;
  const revenue = metrics[metrics.length - 1]?.revenue ?? null;

  return (
    <ReportClient
      communities={communities}
      selectedCommunityId={selectedId ?? null}
      communityName={community?.name ?? ""}
      periodStart={periodStart.toISOString().slice(0, 10)}
      periodEnd={periodEnd.toISOString().slice(0, 10)}
      summary={{
        newMembers,
        totalMembers,
        posts,
        comments,
        activeMembers: active,
        churnedMembers: churned,
        churnRate,
        retentionRate,
        upgradeConversions: upgrades,
        revenue,
      }}
      pulse={latestPulse}
    />
  );
}
