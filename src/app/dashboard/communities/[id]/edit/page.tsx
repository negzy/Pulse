import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import CommunityForm from "@/components/CommunityForm";
import SkoolConnect from "@/components/SkoolConnect";

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const community = await prisma.community.findFirst({
    where: { id, userId: user.id },
  });
  if (!community) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Edit community</h1>
      <CommunityForm
        userId={user.id}
        community={{
          id: community.id,
          name: community.name,
          skoolUrl: community.skoolUrl,
          timezone: community.timezone,
          planType: community.planType,
          hasTiers: community.hasTiers,
        }}
      />
      <SkoolConnect
        communityId={community.id}
        initialConnected={!!community.skoolSessionId}
        initialStatus={null}
        initialGroupSlug={community.skoolGroupSlug}
        initialHasStoredCredentials={!!(community.skoolEmail && community.skoolPasswordEncrypted)}
      />
    </div>
  );
}
