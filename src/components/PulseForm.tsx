"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Community = { id: string; name: string };

type Props = { communities: Community[] };

export default function PulseForm({ communities }: Props) {
  const router = useRouter();
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(lastMonday.toISOString().slice(0, 10));
  const [newMembers, setNewMembers] = useState(0);
  const [churnedMembers, setChurnedMembers] = useState(0);
  const [posts, setPosts] = useState(0);
  const [comments, setComments] = useState(0);
  const [notableWins, setNotableWins] = useState("");
  const [topQuestions, setTopQuestions] = useState("");
  const [testNextWeek, setTestNextWeek] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId,
        weekStart,
        newMembers,
        churnedMembers,
        posts,
        comments,
        notableWins: notableWins.trim() || null,
        topQuestions: topQuestions.trim() || null,
        testNextWeek: testNextWeek.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    setNewMembers(0);
    setChurnedMembers(0);
    setPosts(0);
    setComments(0);
    setNotableWins("");
    setTopQuestions("");
    setTestNextWeek("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 p-6 rounded-xl bg-surface border border-border">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Community</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Week start date</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
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
          <label className="block text-sm text-stone-400 mb-1">Churned members</label>
          <input
            type="number"
            min={0}
            value={churnedMembers}
            onChange={(e) => setChurnedMembers(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Posts</label>
          <input
            type="number"
            min={0}
            value={posts}
            onChange={(e) => setPosts(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Comments</label>
          <input
            type="number"
            min={0}
            value={comments}
            onChange={(e) => setComments(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm text-stone-400 mb-1">Notable wins</label>
        <textarea
          value={notableWins}
          onChange={(e) => setNotableWins(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white resize-none"
          placeholder="What went well this week?"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-400 mb-1">Top questions asked</label>
        <textarea
          value={topQuestions}
          onChange={(e) => setTopQuestions(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white resize-none"
          placeholder="What are members asking most?"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-400 mb-1">What we will test next week</label>
        <textarea
          value={testNextWeek}
          onChange={(e) => setTestNextWeek(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white resize-none"
          placeholder="Experiments or focus for next week"
        />
      </div>
      <button
        type="submit"
        className="w-full py-2.5 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
      >
        Save weekly pulse
      </button>
    </form>
  );
}
