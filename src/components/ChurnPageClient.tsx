"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Community = { id: string; name: string };
type ChurnEvent = {
  id: string;
  memberIdOrName: string;
  churnDate: Date;
  churnReason: string | null;
  notes: string | null;
  plan: string | null;
  source: string | null;
};

const CHURN_REASON_LABELS: Record<string, string> = {
  too_busy: "Too busy",
  not_seeing_value: "Not seeing value",
  price: "Price",
  didnt_use: "Didn't use",
  joined_for_one_thing: "Joined for one thing",
  other: "Other",
};

type Props = {
  communities: Community[];
  selectedCommunityId: string | null;
  churnEvents: (Omit<ChurnEvent, "churnDate"> & { churnDate: Date })[];
};

const CHURN_REASONS = [
  "too_busy",
  "not_seeing_value",
  "price",
  "didnt_use",
  "joined_for_one_thing",
  "other",
] as const;

export default function ChurnPageClient({
  communities,
  selectedCommunityId,
  churnEvents,
}: Props) {
  const router = useRouter();
  const [memberName, setMemberName] = useState("");
  const [churnDate, setChurnDate] = useState(new Date().toISOString().slice(0, 10));
  const [churnReason, setChurnReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const [source, setSource] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  async function handleAddChurn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCommunityId || !memberName.trim()) return;
    const res = await fetch("/api/churn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId: selectedCommunityId,
        memberIdOrName: memberName.trim(),
        status: "churned",
        churnDate,
        churnReason: churnReason || null,
        notes: notes.trim() || null,
        plan: plan.trim() || null,
        source: source.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to add");
      return;
    }
    setMemberName("");
    setNotes("");
    setChurnReason("");
    setPlan("");
    setSource("");
    router.refresh();
  }

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportError("");
    setImportSuccess("");
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (!selectedCommunityId || !fileInput?.files?.length) {
      setImportError("Select a community and a CSV file.");
      return;
    }
    const formData = new FormData();
    formData.set("communityId", selectedCommunityId);
    formData.set("file", fileInput.files[0]);
    const res = await fetch("/api/churn/import", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImportError(data.error ?? "Import failed");
      return;
    }
    setImportSuccess(`Imported ${data.created ?? 0} churn record(s).`);
    fileInput.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Churn tracking</h1>
        <a
          href="/churn-import-template.csv"
          download
          className="text-sm text-accent hover:underline"
        >
          Download CSV template
        </a>
      </div>

      {communities.length === 0 ? (
        <p className="text-stone-400">
          <Link href="/dashboard/communities/new" className="text-accent hover:underline">Add a community</Link> first.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Community</label>
              <select
                value={selectedCommunityId ?? ""}
                onChange={(e) => router.push(`/dashboard/churn?community=${e.target.value}`)}
                className="px-3 py-2 rounded-lg bg-surface border border-border text-white"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Mark as churned</h2>
              <form onSubmit={handleAddChurn} className="space-y-3 p-4 rounded-xl bg-surface border border-border">
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Member name or ID</label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                    placeholder="John Doe or member_123"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Churn date</label>
                  <input
                    type="date"
                    value={churnDate}
                    onChange={(e) => setChurnDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Churn reason</label>
                  <select
                    value={churnReason}
                    onChange={(e) => setChurnReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                  >
                    <option value="">—</option>
                    {CHURN_REASONS.map((r) => (
                      <option key={r} value={r}>{CHURN_REASON_LABELS[r] ?? r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">Plan</label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                    >
                      <option value="">—</option>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-stone-400 mb-1">Source</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-white"
                    >
                      <option value="">—</option>
                      <option value="ads">Ads</option>
                      <option value="referral">Referral</option>
                      <option value="organic">Organic</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover"
                >
                  Add churn
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Import CSV</h2>
              <form onSubmit={handleImport} className="space-y-3 p-4 rounded-xl bg-surface border border-border">
                {importError && <p className="text-sm text-red-400">{importError}</p>}
                {importSuccess && <p className="text-sm text-green-400">{importSuccess}</p>}
                <p className="text-sm text-stone-500">
                  Use the template: member_id_or_name, status, start_date, churn_date, churn_reason, notes, plan, source
                </p>
                <input type="file" accept=".csv" required className="text-sm text-stone-400" />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg border border-border text-white hover:bg-surface"
                >
                  Import
                </button>
              </form>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Churn table</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-stone-400">Member</th>
                    <th className="px-4 py-3 text-sm font-medium text-stone-400">Churn date</th>
                    <th className="px-4 py-3 text-sm font-medium text-stone-400">Reason</th>
                    <th className="px-4 py-3 text-sm font-medium text-stone-400">Plan</th>
                    <th className="px-4 py-3 text-sm font-medium text-stone-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {churnEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 text-white">{e.memberIdOrName}</td>
                      <td className="px-4 py-3 text-stone-400 text-sm">
                        {new Date(e.churnDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-sm">
                        {e.churnReason ? (CHURN_REASON_LABELS[e.churnReason] ?? e.churnReason) : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-sm">{e.plan ?? "—"}</td>
                      <td className="px-4 py-3 text-stone-400 text-sm max-w-xs truncate">{e.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {churnEvents.length === 0 && (
                <div className="p-8 text-center text-stone-500">No churn records yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
