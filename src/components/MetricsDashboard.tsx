"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type KPIs = {
  newMembers: number;
  totalMembers: number;
  postsCreated: number;
  commentsCreated: number;
  activeMembers: number;
  engagementRate: number;
  upgradeConversions: number;
  costPerJoin?: number;
  callsBooked: number;
  revenue?: number;
  churnedMembers: number;
  churnRate: number;
  netMemberGrowth: number;
  retentionRate: number;
  startingPaidMembers: number;
};

type Props = {
  communityId: string;
  communityName: string;
  periodStart: string;
  periodEnd: string;
  kpis: KPIs;
  hasTiers: boolean;
  planType: string;
};

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub != null && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

export function MetricsDashboard({
  communityId,
  communityName,
  periodStart,
  periodEnd,
  kpis,
  hasTiers,
  planType,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(periodStart);
  const [to, setTo] = useState(periodEnd);

  function applyDateRange() {
    const p = new URLSearchParams(searchParams.toString());
    p.set("from", from);
    p.set("to", to);
    router.push(`/dashboard/community/${communityId}?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-stone-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyDateRange}
          className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover text-sm"
        >
          Apply
        </button>
        <Link
          href={`/dashboard/community/${communityId}/metrics?from=${from}&to=${to}`}
          className="text-sm text-accent hover:underline ml-2"
        >
          Record / edit metrics
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="New members" value={kpis.newMembers} />
        <KpiCard label="Total members" value={kpis.totalMembers} />
        <KpiCard label="Posts created" value={kpis.postsCreated} />
        <KpiCard label="Comments created" value={kpis.commentsCreated} />
        <KpiCard label="Active members" value={kpis.activeMembers} sub="At least 1 post or comment" />
        <KpiCard
          label="Engagement rate"
          value={`${kpis.engagementRate.toFixed(1)}%`}
          sub="Active / total members"
        />
        {planType === "Paid" && (
          <KpiCard label="Upgrade conversions" value={kpis.upgradeConversions} sub="Free → Paid" />
        )}
        <KpiCard
          label="Cost per join"
          value={kpis.costPerJoin != null ? `$${kpis.costPerJoin.toFixed(2)}` : "—"}
        />
        <KpiCard label="Calls booked" value={kpis.callsBooked} />
        <KpiCard
          label="Revenue"
          value={kpis.revenue != null ? `$${kpis.revenue.toFixed(2)}` : "—"}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Churn</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Churned members" value={kpis.churnedMembers} />
          <KpiCard
            label="Churn rate"
            value={`${kpis.churnRate.toFixed(1)}%`}
            sub={`Churned / ${kpis.startingPaidMembers} starting paid members`}
          />
          <KpiCard label="Net member growth" value={kpis.netMemberGrowth} sub="New − Churned" />
          <KpiCard label="Retention rate" value={`${kpis.retentionRate.toFixed(1)}%`} sub="1 − churn rate" />
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Link
          href={`/dashboard/churn?community=${communityId}`}
          className="text-sm text-accent hover:underline"
        >
          View churn table →
        </Link>
        <Link
          href={`/dashboard/report?community=${communityId}&from=${from}&to=${to}`}
          className="text-sm text-accent hover:underline"
        >
          Weekly report →
        </Link>
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-stone-500">
          Member Score (based on posts/comments) and Dormant members list will appear here when member-level activity data is available (e.g. via Skool API or import).
        </p>
      </div>
    </div>
  );
}
