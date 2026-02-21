"use client";

import { useState, useEffect } from "react";

export default function ExtensionTokenBlock() {
  const [hasToken, setHasToken] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchStatus() {
    const res = await fetch("/api/extension/token");
    if (res.ok) {
      const data = await res.json();
      setHasToken(data.hasToken);
      setHint(data.hint ?? null);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function generateToken() {
    setLoading(true);
    setNewToken(null);
    try {
      const res = await fetch("/api/extension/token", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.token) {
        setNewToken(data.token);
        setHasToken(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
  }

  return (
    <div className="p-6 rounded-xl bg-surface border border-border max-w-lg">
      <h2 className="text-lg font-semibold text-white mb-2">Extension token</h2>
      <p className="text-sm text-stone-500 mb-4">
        The extension uses this token to send activity to your dashboard. Paste it in the extension options (right-click icon → Options).
      </p>
      {newToken ? (
        <div>
          <p className="text-xs text-amber-400/90 mb-2">Copy now — it won’t be shown again.</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={newToken}
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-white text-sm font-mono"
            />
            <button
              type="button"
              onClick={copyToken}
              className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
            >
              Copy
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {hasToken && hint && (
            <span className="text-sm text-stone-500">Current token: {hint}</span>
          )}
          <button
            type="button"
            onClick={generateToken}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "…" : hasToken ? "Regenerate token" : "Generate token"}
          </button>
        </div>
      )}
    </div>
  );
}
