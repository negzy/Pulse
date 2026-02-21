import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import PulseForm from "@/components/PulseForm";
import Link from "next/link";

export default async function PulsePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const communities = await prisma.community.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const pulses = await prisma.weeklyPulse.findMany({
    where: { community: { userId: user.id } },
    include: { community: { select: { id: true, name: true } } },
    orderBy: { weekStart: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Weekly Pulse Update</h1>
      <p className="text-stone-400">
        Quick form for your VA/EA to log weekly metrics in under 5 minutes.
      </p>
      {communities.length === 0 ? (
        <p className="text-stone-400">
          <Link href="/dashboard/communities/new" className="text-accent hover:underline">Add a community</Link> first.
        </p>
      ) : (
        <PulseForm communities={communities} />
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Weekly recap</h2>
        <div className="space-y-4">
          {pulses.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-surface border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{p.community.name}</span>
                <span className="text-sm text-stone-500">
                  Week of {new Date(p.weekStart).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-stone-400 mb-2">
                <span>+{p.newMembers} members</span>
                <span>−{p.churnedMembers} churned</span>
                <span>{p.posts} posts</span>
                <span>{p.comments} comments</span>
              </div>
              {p.notableWins && (
                <p className="text-sm text-stone-400 mt-2"><strong className="text-stone-300">Wins:</strong> {p.notableWins}</p>
              )}
              {p.topQuestions && (
                <p className="text-sm text-stone-400"><strong className="text-stone-300">Top questions:</strong> {p.topQuestions}</p>
              )}
              {p.testNextWeek && (
                <p className="text-sm text-stone-400"><strong className="text-stone-300">Testing next:</strong> {p.testNextWeek}</p>
              )}
            </div>
          ))}
          {pulses.length === 0 && (
            <p className="text-stone-500">No weekly updates yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
