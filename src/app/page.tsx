import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-white mb-2">Skool Pulse</h1>
        <p className="text-stone-400 mb-8">
          Track engagement, growth, and churn for your Skool communities in one simple dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg border border-border text-stone-300 hover:bg-surface transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
