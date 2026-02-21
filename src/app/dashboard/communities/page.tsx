import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function CommunitiesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const communities = await prisma.community.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Communities</h1>
        <Link
          href="/dashboard/communities/new"
          className="px-4 py-2 rounded-lg bg-accent text-black font-medium hover:bg-accent-hover text-sm"
        >
          Add community
        </Link>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-stone-400">Name</th>
              <th className="px-4 py-3 text-sm font-medium text-stone-400">Skool URL</th>
              <th className="px-4 py-3 text-sm font-medium text-stone-400">Plan</th>
              <th className="px-4 py-3 text-sm font-medium text-stone-400">Tiers</th>
              <th className="px-4 py-3 text-sm font-medium text-stone-400">Timezone</th>
              <th className="px-4 py-3 text-sm font-medium text-stone-400 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {communities.map((c) => (
              <tr key={c.id} className="hover:bg-surface/50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/community/${c.id}`} className="font-medium text-white hover:text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-400 text-sm">{c.skoolUrl ?? "—"}</td>
                <td className="px-4 py-3 text-stone-400 text-sm">{c.planType}</td>
                <td className="px-4 py-3 text-stone-400 text-sm">{c.hasTiers ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-stone-400 text-sm">{c.timezone}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/communities/${c.id}/edit`}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {communities.length === 0 && (
          <div className="p-8 text-center text-stone-500">
            No communities.{" "}
            <Link href="/dashboard/communities/new" className="text-accent hover:underline">Add one</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
