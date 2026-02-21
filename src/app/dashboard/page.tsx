import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const communities = await prisma.community.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { churnEvents: true, weeklyPulses: true } },
    },
  });

  if (communities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">No communities yet</h2>
        <p className="text-stone-400 mb-6">Add your first Skool community to start tracking metrics.</p>
        <Link
          href="/dashboard/communities/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
        >
          Add community
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Link
          href="/dashboard/communities/new"
          className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover text-sm"
        >
          Add community
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/community/${c.id}`}
            className="block p-5 rounded-xl border border-border bg-surface hover:border-stone-500 transition-colors"
          >
            <h3 className="font-semibold text-white mb-1">{c.name}</h3>
            <p className="text-sm text-stone-500 mb-3">{c.planType} {c.hasTiers ? "· Tiers" : ""}</p>
            <div className="flex gap-4 text-xs text-stone-400">
              <span>{c._count.weeklyPulses} pulse updates</span>
              <span>{c._count.churnEvents} churn events</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
