import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MetricsDashboard } from "@/components/MetricsDashboard";

export default async function CommunityDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const community = await prisma.community.findFirst({
    where: { id, userId: user.id },
  });
  if (!community) notFound();

  const { from: fromParam, to: toParam } = await searchParams;
  const now = new Date();
  const defaultEnd = new Date(now);
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const periodStart = fromParam ? new Date(fromParam) : defaultStart;
  const periodEnd = toParam ? new Date(toParam) : defaultEnd;

  const metrics = await prisma.weeklyMetric.findMany({
    where: {
      communityId: id,
      periodStart: { gte: periodStart },
      periodEnd: { lte: periodEnd },
    },
    orderBy: { periodStart: "asc" },
  });

  const churnInPeriod = await prisma.churnEvent.count({
    where: {
      communityId: id,
      status: "churned",
      churnDate: { gte: periodStart, lte: periodEnd },
    },
  });

  const latestMetric = metrics[metrics.length - 1];
  const totalMembers = latestMetric?.totalMembers ?? 0;
  const newMembersSum = metrics.reduce((s, m) => s + m.newMembers, 0);
  const postsSum = metrics.reduce((s, m) => s + m.postsCreated, 0);
  const commentsSum = metrics.reduce((s, m) => s + m.commentsCreated, 0);
  const activeSum = metrics.reduce((s, m) => s + m.activeMembers, 0);
  const churnedSum = metrics.reduce((s, m) => s + m.churnedMembers, 0) || churnInPeriod;
  const startingPaid = latestMetric?.startingPaidMembers ?? totalMembers;
  const churnRate = startingPaid > 0 ? (churnedSum / startingPaid) * 100 : 0;
  const engagementRate = totalMembers > 0 ? (activeSum / totalMembers) * 100 : 0;
  const netGrowth = newMembersSum - churnedSum;
  const retentionRate = 100 - churnRate;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-400 mb-1 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">{community.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {community.skoolSessionId && (
            <span className="text-xs text-stone-500">Skool API connected</span>
          )}
          <Link
            href={`/dashboard/communities/${community.id}/edit`}
            className="text-sm text-accent hover:underline"
          >
            Edit community
          </Link>
        </div>
      </div>
      <MetricsDashboard
        communityId={id}
        communityName={community.name}
        periodStart={periodStart.toISOString().slice(0, 10)}
        periodEnd={periodEnd.toISOString().slice(0, 10)}
        kpis={{
          newMembers: newMembersSum,
          totalMembers,
          postsCreated: postsSum,
          commentsCreated: commentsSum,
          activeMembers: activeSum,
          engagementRate,
          upgradeConversions: latestMetric?.upgradeConversions ?? 0,
          costPerJoin: latestMetric?.costPerJoin ?? undefined,
          callsBooked: latestMetric?.callsBooked ?? 0,
          revenue: latestMetric?.revenue ?? undefined,
          churnedMembers: churnedSum,
          churnRate,
          netMemberGrowth: netGrowth,
          retentionRate,
          startingPaidMembers: startingPaid,
        }}
        hasTiers={community.hasTiers}
        planType={community.planType}
      />
    </div>
  );
}
