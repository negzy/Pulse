import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/integrations/skool/client";
import { z } from "zod";

const bodySchema = z.object({ communityId: z.string().cuid() });

/**
 * Sync from Skool: check session status. When SkoolAPI.com adds pull endpoints for
 * group stats or members, we would call them here and update WeeklyMetric / ChurnEvent.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const { communityId } = bodySchema.parse(body);
    const community = await prisma.community.findFirst({
      where: { id: communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });
    if (!community.skoolSessionId) {
      return NextResponse.json(
        { error: "Community is not connected to Skool. Connect first." },
        { status: 400 }
      );
    }

    const session = await getSession(community.skoolSessionId);
    if (session.status !== "active" && session.status !== "pending") {
      return NextResponse.json({
        ok: false,
        error: `Session status: ${session.status}. Reconnect in community settings.`,
      }, { status: 400 });
    }

    // TODO: when SkoolAPI.com exposes GET group stats or members, call it here and run applyGroupStats()
    return NextResponse.json({
      ok: true,
      status: session.status,
      message: "Session is active. Automatic metrics sync will run when SkoolAPI adds group stats endpoints or via webhooks.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
