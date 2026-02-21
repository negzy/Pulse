import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ChurnPageClient from "@/components/ChurnPageClient";

export default async function ChurnPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { community: communityId } = await searchParams;
  const communities = await prisma.community.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const selectedId = communityId && communities.some((c) => c.id === communityId) ? communityId : communities[0]?.id;
  const churnEvents = selectedId
    ? await prisma.churnEvent.findMany({
        where: { communityId: selectedId, status: "churned" },
        orderBy: { churnDate: "desc" },
        take: 200,
      })
    : [];

  return (
    <ChurnPageClient
      communities={communities}
      selectedCommunityId={selectedId ?? null}
      churnEvents={churnEvents}
    />
  );
}
