"use client";

import { useEffect, useState } from "react";

type Row = {
  communityId: string;
  name: string;
  slug: string | null;
  posts: number;
  comments: number;
  likes: number;
  interactions: number;
};

type Data = {
  dateLabel: string;
  totals: { posts: number; comments: number; likes: number; interactions: number };
  rows: Row[];
};

const POLL_MS = 45_000;

export default function TodayEngagement({ initialData }: { initialData: Data | null }) {
  const [data, setData] = useState<Data | null>(initialData);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/dashboard/today");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    };
    const id = setInterval(fetchData, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (data === null) return null;

  const { dateLabel, totals, rows } = data;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Today</h1>
        <p className="text-stone-400 text-sm mt-1">
          {dateLabel} — engagement across all communities (updates when you sync)
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-stone-400 mb-2">No activity synced for today yet.</p>
          <p className="text-sm text-stone-500">
            Open a Skool group in your browser, use the Skool Pulse extension, and click{" "}
            <strong>Sync to Pulse</strong> to see your day&apos;s numbers here.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-6 mb-6">
            <h2 className="text-sm font-medium text-stone-400 mb-4">Totals today</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-accent">{totals.posts}</div>
                <div className="text-sm text-stone-500">Posts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{totals.comments}</div>
                <div className="text-sm text-stone-500">Comments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{totals.likes}</div>
                <div className="text-sm text-stone-500">Likes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{totals.interactions}</div>
                <div className="text-sm text-stone-500">Interactions</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Community</th>
                  <th className="px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Posts</th>
                  <th className="px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Comments</th>
                  <th className="px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Likes</th>
                  <th className="px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Interactions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.communityId} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{r.name}</span>
                      {r.slug && <span className="text-stone-500 text-sm ml-2">({r.slug})</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">{r.posts}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{r.comments}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{r.likes}</td>
                    <td className="px-4 py-3 text-right text-stone-300">{r.interactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
