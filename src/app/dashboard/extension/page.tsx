import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ExtensionTokenBlock from "@/components/ExtensionTokenBlock";

export default async function ExtensionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Browser extension</h1>
      <p className="text-stone-400 mb-6">
        Install the extension in Chrome, then connect it to Pulse with your token. Everything stays simple: one download, a few steps, and you’re done.
      </p>

      {/* Step 1: Download */}
      <div className="mb-8 p-6 rounded-xl bg-surface border border-border">
        <h2 className="text-lg font-semibold text-white mb-1">1. Download the extension</h2>
        <p className="text-stone-400 text-sm mb-4">
          Get the zip file and unzip it on your computer. You’ll get a folder called <code className="bg-background px-1 rounded text-stone-300">extension</code>.
        </p>
        <a
          href="/extension.zip"
          download="pulse-extension.zip"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black hover:bg-accent/90"
        >
          Download extension (zip)
        </a>
      </div>

      {/* Step 2: Install in Chrome */}
      <div className="mb-8 p-6 rounded-xl bg-surface border border-border">
        <h2 className="text-lg font-semibold text-white mb-1">2. Install it in Chrome</h2>
        <ol className="list-decimal list-inside space-y-2 text-stone-400 text-sm mt-3">
          <li>Open Chrome and go to <code className="bg-background px-1 rounded text-stone-300">chrome://extensions</code>.</li>
          <li>Turn on <strong className="text-stone-300">Developer mode</strong> (toggle in the top right).</li>
          <li>Click <strong className="text-stone-300">Load unpacked</strong>.</li>
          <li>Select the <strong className="text-stone-300">extension</strong> folder you unzipped (the one that contains <code className="bg-background px-1 rounded">manifest.json</code>).</li>
        </ol>
      </div>

      {/* Step 3: Connect with token */}
      <div className="mb-8 p-6 rounded-xl bg-surface border border-border">
        <h2 className="text-lg font-semibold text-white mb-1">3. Connect to Pulse</h2>
        <p className="text-stone-400 text-sm mb-4">
          Get your token below, then in Chrome: right‑click the <strong className="text-stone-300">Skool Pulse</strong> icon → <strong className="text-stone-300">Options</strong>. Paste the dashboard URL and token, then Save.
        </p>
        <p className="text-stone-500 text-sm mb-4">
          Dashboard URL: <code className="bg-background px-1 rounded text-stone-400">https://pulsewav.co</code>
        </p>
        <ExtensionTokenBlock />
      </div>

      {/* Step 4: Use it */}
      <div className="p-6 rounded-xl bg-surface border border-border">
        <h2 className="text-lg font-semibold text-white mb-1">4. Use it on Skool</h2>
        <p className="text-stone-400 text-sm">
          Go to <strong className="text-stone-300">skool.com</strong> and open a group. Click the <strong className="text-stone-300">Skool Pulse</strong> icon in the toolbar — the side panel opens. Your likes, comments, and posts are tracked automatically. Click <strong className="text-stone-300">Sync to Pulse</strong> to save today’s numbers to this dashboard.
        </p>
        <p className="text-stone-500 text-sm mt-4">
          In Pulse, add your community and set its Skool URL or group slug so the extension can match the group you’re on.
        </p>
      </div>
    </div>
  );
}
