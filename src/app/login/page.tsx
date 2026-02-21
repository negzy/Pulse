"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-xl font-bold text-white mb-8">
          Skool Pulse
        </Link>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-surface border border-border">
          <h2 className="text-lg font-semibold text-white">Log in</h2>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-sm text-stone-400 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white placeholder-stone-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-stone-400 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover transition-colors"
          >
            Log in
          </button>
          <p className="text-sm text-stone-500 text-center">
            No account?{" "}
            <Link href="/register" className="text-accent hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
