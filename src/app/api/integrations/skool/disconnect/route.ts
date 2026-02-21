import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { deleteSession } from "@/integrations/skool/client";
import { z } from "zod";

const bodySchema = z.object({ communityId: z.string().cuid() });

/**
 * Disconnect a community from Skool: delete session and clear stored session ID.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { communityId } = bodySchema.parse(body);
    const community = await prisma.community.findFirst({
      where: { id: communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    if (community.skoolSessionId) {
      try {
        await deleteSession(community.skoolSessionId);
      } catch {
        // session may already be invalid
      }
    }

    await prisma.community.update({
      where: { id: communityId },
      data: {
        skoolSessionId: null,
        skoolConnectedAt: null,
        skoolEmail: null,
        skoolPasswordEncrypted: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}
