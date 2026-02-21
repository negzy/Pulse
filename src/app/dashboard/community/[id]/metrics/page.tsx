import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import MetricsForm from "@/components/MetricsForm";

export default async function CommunityMetricsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { id } = await params;
  const community = await prisma.community.findFirst({
    where: { id, userId: user.id },
  });
  if (!community) notFound();
  const { from, to } = await searchParams;
  const periodEnd = to ? new Date(to) : new Date();
  const periodStart = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Record metrics</h1>
      <p className="text-stone-400 mb-6">
        {community.name} · {periodStart.toISOString().slice(0, 10)} – {periodEnd.toISOString().slice(0, 10)}
      </p>
      <MetricsForm
        communityId={id}
        periodStart={periodStart.toISOString().slice(0, 10)}
        periodEnd={periodEnd.toISOString().slice(0, 10)}
        planType={community.planType}
      />
    </div>
  );
}
