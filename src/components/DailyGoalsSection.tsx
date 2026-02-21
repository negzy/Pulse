"use client";

import { useEffect, useState } from "react";

const STREAK_TARGET = 7;

type Goals = {
  goalLikes: number;
  goalComments: number;
  goalPosts: number;
  currentStreak: number;
  goalMetToday: boolean;
};

export default function DailyGoalsSection() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ goalLikes: 0, goalComments: 0, goalPosts: 0 });

  const load = async () => {
    const res = await fetch("/api/dashboard/goals");
    if (!res.ok) return;
    const data = await res.json();
    setGoals(data);
    setForm({
      goalLikes: data.goalLikes ?? 0,
      goalComments: data.goalComments ?? 0,
      goalPosts: data.goalPosts ?? 0,
    });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } finally {
      setSaving(false);
    }
  };

  if (goals === null) return null;

  const hasGoal = goals.goalLikes > 0 || goals.goalComments > 0 || goals.goalPosts > 0;
  const daysToFirst = goals.currentStreak >= STREAK_TARGET ? 0 : STREAK_TARGET - goals.currentStreak;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 mb-6">
      <h2 className="text-sm font-medium text-stone-400 mb-4">Daily goal</h2>
      <p className="text-stone-500 text-sm mb-4">
        Set a target for today. Hit it for {STREAK_TARGET} days in a row to earn your first streak.
      </p>
      <form onSubmit={save} className="flex flex-wrap items-end gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Likes</span>
          <input
            type="number"
            min={0}
            value={form.goalLikes}
            onChange={(e) => setForm((f) => ({ ...f, goalLikes: parseInt(e.target.value, 10) || 0 }))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-white text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Comments</span>
          <input
            type="number"
            min={0}
            value={form.goalComments}
            onChange={(e) => setForm((f) => ({ ...f, goalComments: parseInt(e.target.value, 10) || 0 }))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-white text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-500">Posts</span>
          <input
            type="number"
            min={0}
            value={form.goalPosts}
            onChange={(e) => setForm((f) => ({ ...f, goalPosts: parseInt(e.target.value, 10) || 0 }))}
            className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-white text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save goal"}
        </button>
      </form>
      {hasGoal && (
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
          <span className="text-stone-400 text-sm">
            Streak: <strong className="text-white">{goals.currentStreak}</strong> day{goals.currentStreak !== 1 ? "s" : ""}
          </span>
          {goals.goalMetToday && (
            <span className="text-emerald-500 text-sm font-medium">Today&apos;s goal met</span>
          )}
          {goals.currentStreak >= STREAK_TARGET ? (
            <span className="text-amber-400 text-sm font-medium">First streak achieved</span>
          ) : daysToFirst > 0 ? (
            <span className="text-stone-500 text-sm">{daysToFirst} day{daysToFirst !== 1 ? "s" : ""} to first streak</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
