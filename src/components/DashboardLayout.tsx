"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", redirect: "follow" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="ml-4 text-sm text-stone-500 hover:text-stone-300"
    >
      Log out
    </button>
  );
}

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/today", label: "Today" },
  { href: "/dashboard/communities", label: "Communities" },
  { href: "/dashboard/pulse", label: "Weekly Pulse" },
  { href: "/dashboard/churn", label: "Churn" },
  { href: "/dashboard/report", label: "Weekly Report" },
  { href: "/dashboard/extension", label: "Extension" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold text-white">
            Skool Pulse
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                    ? "bg-accent-muted text-accent"
                    : "text-stone-400 hover:text-white hover:bg-surface"
                }`}
              >
                {label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
