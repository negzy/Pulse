import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/integrations/skool/client";

/**
 * GET ?communityId=xxx — Return Skool connection status for the community.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const communityId = new URL(req.url).searchParams.get("communityId");
  if (!communityId) return NextResponse.json({ error: "communityId required" }, { status: 400 });

  const community = await prisma.community.findFirst({
    where: { id: communityId, userId: user.id },
    select: {
      id: true,
      skoolSessionId: true,
      skoolGroupSlug: true,
      skoolConnectedAt: true,
      skoolEmail: true,
      skoolPasswordEncrypted: true,
    },
  });
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const hasStoredCredentials = !!(community.skoolEmail && community.skoolPasswordEncrypted);

  if (!community.skoolSessionId) {
    return NextResponse.json({
      connected: false,
      sessionId: null,
      status: null,
      skoolGroupSlug: community.skoolGroupSlug,
      skoolConnectedAt: null,
      hasStoredCredentials,
    });
  }

  try {
    const session = await getSession(community.skoolSessionId);
    return NextResponse.json({
      connected: session.status === "active" || session.status === "pending",
      sessionId: community.skoolSessionId,
      status: session.status,
      skoolGroupSlug: community.skoolGroupSlug,
      skoolConnectedAt: community.skoolConnectedAt?.toISOString() ?? null,
      hasStoredCredentials,
    });
  } catch {
    return NextResponse.json({
      connected: false,
      sessionId: community.skoolSessionId,
      status: "error",
      skoolGroupSlug: community.skoolGroupSlug,
      skoolConnectedAt: community.skoolConnectedAt?.toISOString() ?? null,
      hasStoredCredentials,
    });
  }
}
