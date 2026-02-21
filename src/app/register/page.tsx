"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
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
          <h2 className="text-lg font-semibold text-white">Sign up</h2>
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
              minLength={6}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
              placeholder="Min 6 characters"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover transition-colors"
          >
            Create account
          </button>
          <p className="text-sm text-stone-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
