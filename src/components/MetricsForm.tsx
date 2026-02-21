"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  communityId: string;
  periodStart: string;
  periodEnd: string;
  planType: string;
};

export default function MetricsForm({ communityId, periodStart, periodEnd, planType }: Props) {
  const router = useRouter();
  const [newMembers, setNewMembers] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [postsCreated, setPostsCreated] = useState(0);
  const [commentsCreated, setCommentsCreated] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [churnedMembers, setChurnedMembers] = useState(0);
  const [startingPaidMembers, setStartingPaidMembers] = useState<number | "">("");
  const [upgradeConversions, setUpgradeConversions] = useState(0);
  const [costPerJoin, setCostPerJoin] = useState<string>("");
  const [callsBooked, setCallsBooked] = useState(0);
  const [revenue, setRevenue] = useState<string>("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId,
        periodStart,
        periodEnd,
        newMembers,
        totalMembers,
        postsCreated,
        commentsCreated,
        activeMembers,
        churnedMembers,
        startingPaidMembers: startingPaidMembers === "" ? undefined : Number(startingPaidMembers),
        upgradeConversions,
        costPerJoin: costPerJoin === "" ? undefined : parseFloat(costPerJoin),
        callsBooked,
        revenue: revenue === "" ? undefined : parseFloat(revenue),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    router.push(`/dashboard/community/${communityId}?from=${periodStart}&to=${periodEnd}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 p-6 rounded-xl bg-surface border border-border">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">New members</label>
          <input
            type="number"
            min={0}
            value={newMembers}
            onChange={(e) => setNewMembers(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Total members (as of period end)</label>
          <input
            type="number"
            min={0}
            value={totalMembers}
            onChange={(e) => setTotalMembers(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Posts created</label>
          <input
            type="number"
            min={0}
            value={postsCreated}
            onChange={(e) => setPostsCreated(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Comments created</label>
          <input
            type="number"
            min={0}
            value={commentsCreated}
            onChange={(e) => setCommentsCreated(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Active members (1+ post or comment)</label>
          <input
            type="number"
            min={0}
            value={activeMembers}
            onChange={(e) => setActiveMembers(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Churned members</label>
          <input
            type="number"
            min={0}
            value={churnedMembers}
            onChange={(e) => setChurnedMembers(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        {planType === "Paid" && (
          <>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Starting paid members (for churn rate)</label>
              <input
                type="number"
                min={0}
                value={startingPaidMembers}
                onChange={(e) => setStartingPaidMembers(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1">Upgrade conversions (Free → Paid)</label>
              <input
                type="number"
                min={0}
                value={upgradeConversions}
                onChange={(e) => setUpgradeConversions(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm text-stone-400 mb-1">Cost per join ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={costPerJoin}
            onChange={(e) => setCostPerJoin(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Calls booked</label>
          <input
            type="number"
            min={0}
            value={callsBooked}
            onChange={(e) => setCallsBooked(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Revenue ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
        >
          Save metrics
        </button>
        <Link
          href={`/dashboard/community/${communityId}?from=${periodStart}&to=${periodEnd}`}
          className="px-4 py-2 rounded-lg border border-border text-stone-400 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
