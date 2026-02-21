"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  communityId: string;
  initialConnected: boolean;
  initialStatus: string | null;
  initialGroupSlug: string | null;
  initialHasStoredCredentials: boolean;
};

export default function SkoolConnect({
  communityId,
  initialConnected,
  initialStatus,
  initialGroupSlug,
  initialHasStoredCredentials,
}: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [status, setStatus] = useState(initialStatus);
  const [groupSlug, setGroupSlug] = useState(initialGroupSlug ?? "");
  const [hasStoredCredentials, setHasStoredCredentials] = useState(initialHasStoredCredentials);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/integrations/skool/status?communityId=${communityId}`);
      const data = await res.json();
      if (res.ok) {
        setConnected(data.connected);
        setStatus(data.status);
        setGroupSlug(data.skoolGroupSlug ?? "");
        setHasStoredCredentials(!!data.hasStoredCredentials);
      }
    } catch {
      setConnected(false);
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchStatus();
  }, [communityId]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/skool/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          skoolEmail: email,
          skoolPassword: password,
          skoolGroupSlug: groupSlug.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Connect failed" });
        setLoading(false);
        return;
      }
      setConnected(data.status === "active" || data.status === "pending");
      setStatus(data.status);
      setPassword("");
      setMessage({ type: "success", text: "Connected. Session: " + data.status });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Connect failed" });
    }
    setLoading(false);
  }

  async function handleDisconnect() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/skool/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error ?? "Disconnect failed" });
        setLoading(false);
        return;
      }
      setConnected(false);
      setStatus(null);
      setMessage({ type: "success", text: "Disconnected" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Disconnect failed" });
    }
    setLoading(false);
  }

  const [scrapeEmail, setScrapeEmail] = useState("");
  const [scrapePassword, setScrapePassword] = useState("");

  async function handleSync() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/skool/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? data.message ?? "Sync failed" });
        setLoading(false);
        return;
      }
      setMessage({ type: "success", text: data.message ?? "Sync OK" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Sync failed" });
    }
    setLoading(false);
  }

  async function handleScrape() {
    setMessage(null);
    setLoading(true);
    try {
      const body: { communityId: string; skoolEmail?: string; skoolPassword?: string } = { communityId };
      if (scrapeEmail.trim()) body.skoolEmail = scrapeEmail.trim();
      if (scrapePassword) body.skoolPassword = scrapePassword;
      const res = await fetch("/api/integrations/skool/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Scrape failed" });
        setLoading(false);
        return;
      }
      setMessage({
        type: "success",
        text: `Saved: ${data.posts} posts, ${data.comments} comments${data.totalMembers != null ? `, ${data.totalMembers} members` : ""}.`,
      });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Scrape failed" });
    }
    setLoading(false);
  }

  return (
    <div className="mt-8 p-6 rounded-xl bg-surface border border-border max-w-lg">
      <h2 className="text-lg font-semibold text-white mb-2">Skool API</h2>
      <p className="text-sm text-stone-500 mb-4">
        Connect via{" "}
        <a
          href="https://skoolapi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          SkoolAPI.com
        </a>
        . Add <code className="text-xs bg-background px-1 rounded">SKOOL_API_SECRET</code> to your .env.
      </p>
      {message && (
        <p
          className={`text-sm mb-4 ${message.type === "error" ? "text-red-400" : "text-green-400"}`}
        >
          {message.text}
        </p>
      )}
      {connected ? (
        <div>
          <p className="text-sm text-stone-400 mb-2">
            Status: <span className="text-white">{status}</span>
            {groupSlug && ` · Group: ${groupSlug}`}
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border text-stone-400 hover:text-white disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <div>
            <label className="block text-sm text-stone-400 mb-1">Skool email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1">Skool password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
              placeholder="Saved encrypted for Scrape now"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1">Group slug (optional)</label>
            <input
              type="text"
              value={groupSlug}
              onChange={(e) => setGroupSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
              placeholder="From skool.com/group/THIS"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Connecting…" : "Connect Skool"}
          </button>
        </form>
      )}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm font-medium text-stone-400 mb-2">Auto-fill posts & comments (your data)</p>
        <p className="text-xs text-stone-500 mb-2">
          Pull today’s post and comment counts from your Skool group using <strong className="text-stone-400">your own Skool login</strong>. Set this community’s <strong className="text-stone-400">Skool URL</strong> in the form above first. No .env or server config needed—just your email and password below, or connect Skool above and we’ll use that.
        </p>
        {hasStoredCredentials && (
          <p className="text-xs text-green-400/90 mb-2">
            We’ll use your connected Skool account. Enter different credentials below only if you want to use another account.
          </p>
        )}
        <div className="flex gap-2 mb-2">
          <input
            type="email"
            value={scrapeEmail}
            onChange={(e) => setScrapeEmail(e.target.value)}
            placeholder={hasStoredCredentials ? "Skool email (optional override)" : "Your Skool email"}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border text-white text-sm"
          />
          <input
            type="password"
            value={scrapePassword}
            onChange={(e) => setScrapePassword(e.target.value)}
            placeholder={hasStoredCredentials ? "Password (optional override)" : "Your Skool password"}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border text-white text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleScrape}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-accent text-accent font-medium hover:bg-accent-muted disabled:opacity-50"
        >
          {loading ? "…" : "Scrape now"}
        </button>
      </div>
    </div>
  );
}
