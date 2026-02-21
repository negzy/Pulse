"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Community = { id: string; name: string };
type Summary = {
  newMembers: number;
  totalMembers: number;
  posts: number;
  comments: number;
  activeMembers: number;
  churnedMembers: number;
  churnRate: string;
  retentionRate: string;
  upgradeConversions: number;
  revenue: number | null;
};
type Pulse = { notableWins: string | null; topQuestions: string | null; testNextWeek: string | null; weekStart: Date } | null;

type Props = {
  communities: Community[];
  selectedCommunityId: string | null;
  communityName: string;
  periodStart: string;
  periodEnd: string;
  summary: Summary;
  pulse: Pulse;
};

export default function ReportClient({
  communities,
  selectedCommunityId,
  communityName,
  periodStart,
  periodEnd,
  summary,
  pulse,
}: Props) {
  const router = useRouter();
  const [from, setFrom] = useState(periodStart);
  const [to, setTo] = useState(periodEnd);
  const [copied, setCopied] = useState(false);

  function applyRange() {
    const params = new URLSearchParams();
    if (selectedCommunityId) params.set("community", selectedCommunityId);
    params.set("from", from);
    params.set("to", to);
    router.push(`/dashboard/report?${params.toString()}`);
  }

  const reportText = [
    `# Weekly Report — ${communityName}`,
    `Period: ${periodStart} to ${periodEnd}`,
    "",
    "## Key metrics",
    `• New members: ${summary.newMembers}`,
    `• Total members: ${summary.totalMembers}`,
    `• Posts: ${summary.posts} | Comments: ${summary.comments}`,
    `• Active members (1+ post/comment): ${summary.activeMembers}`,
    `• Churned: ${summary.churnedMembers} (${summary.churnRate}% churn rate, ${summary.retentionRate}% retention)`,
    summary.upgradeConversions > 0 ? `• Upgrades (Free → Paid): ${summary.upgradeConversions}` : "",
    summary.revenue != null ? `• Revenue: $${summary.revenue.toFixed(2)}` : "",
    "",
    "## Churn summary",
    `Net growth: ${summary.newMembers - summary.churnedMembers} (new − churned).`,
    "",
    "## What worked",
    pulse?.notableWins ? pulse.notableWins : "(Add notable wins in Weekly Pulse)",
    "",
    "## Top questions",
    pulse?.topQuestions ? pulse.topQuestions : "(Add in Weekly Pulse)",
    "",
    "## Next actions",
    pulse?.testNextWeek ? pulse.testNextWeek : "(Add in Weekly Pulse)",
  ]
    .filter(Boolean)
    .join("\n");

  async function copyReport() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Weekly report</h1>
      <p className="text-stone-400">
        Copy this summary into Skool or your internal docs.
      </p>
      {communities.length === 0 ? (
        <p className="text-stone-400">
          Add a community to generate a report.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Community</label>
              <select
                value={selectedCommunityId ?? ""}
                onChange={(e) => router.push(`/dashboard/report?community=${e.target.value}&from=${from}&to=${to}`)}
                className="px-3 py-2 rounded-lg bg-surface border border-border text-white"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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
              onClick={applyRange}
              className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover text-sm"
            >
              Update
            </button>
          </div>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-stone-400">Report (copy below)</span>
              <button
                type="button"
                onClick={copyReport}
                className="px-3 py-1.5 rounded-lg bg-accent text-black text-sm font-medium hover:bg-accent-hover"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
            <pre className="p-4 text-sm text-stone-300 whitespace-pre-wrap font-sans overflow-x-auto max-h-[60vh] overflow-y-auto">
              {reportText}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
