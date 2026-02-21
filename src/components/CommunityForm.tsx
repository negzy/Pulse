"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  userId: string;
  community?: {
    id: string;
    name: string;
    skoolUrl: string | null;
    timezone: string;
    planType: string;
    hasTiers: boolean;
  };
};

export default function CommunityForm({ userId, community }: Props) {
  const router = useRouter();
  const [name, setName] = useState(community?.name ?? "");
  const [skoolUrl, setSkoolUrl] = useState(community?.skoolUrl ?? "");
  const [timezone, setTimezone] = useState(community?.timezone ?? "UTC");
  const [planType, setPlanType] = useState(community?.planType ?? "Free");
  const [hasTiers, setHasTiers] = useState(community?.hasTiers ?? false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = community ? `/api/communities/${community.id}` : "/api/communities";
    const res = await fetch(url, {
      method: community ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        skoolUrl: skoolUrl.trim() || null,
        timezone,
        planType,
        hasTiers,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    const data = await res.json();
    router.push(community ? `/dashboard/community/${community.id}` : `/dashboard/community/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 p-6 rounded-xl bg-surface border border-border">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-stone-400 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          placeholder="My Skool Community"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-400 mb-1">Skool URL</label>
        <input
          type="url"
          value={skoolUrl}
          onChange={(e) => setSkoolUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          placeholder="https://www.skool.com/your-group"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-400 mb-1">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern</option>
          <option value="America/Chicago">Central</option>
          <option value="America/Denver">Mountain</option>
          <option value="America/Los_Angeles">Pacific</option>
          <option value="Europe/London">London</option>
          <option value="Europe/Paris">Paris</option>
          <option value="Asia/Tokyo">Tokyo</option>
          <option value="Australia/Sydney">Sydney</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-400 mb-1">Plan type</label>
        <select
          value={planType}
          onChange={(e) => setPlanType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
        >
          <option value="Free">Free</option>
          <option value="Paid">Paid</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hasTiers"
          checked={hasTiers}
          onChange={(e) => setHasTiers(e.target.checked)}
          className="rounded border-border bg-background text-accent focus:ring-accent"
        />
        <label htmlFor="hasTiers" className="text-sm text-stone-400">Has tiers (e.g. Free + Premium)</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
        >
          {community ? "Save changes" : "Create community"}
        </button>
        <Link
          href={community ? `/dashboard/community/${community.id}` : "/dashboard/communities"}
          className="px-4 py-2 rounded-lg border border-border text-stone-400 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
