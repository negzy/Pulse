import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createSession } from "@/integrations/skool/client";
import { encrypt } from "@/lib/encrypt";
import { z } from "zod";

const bodySchema = z.object({
  communityId: z.string().cuid(),
  skoolEmail: z.string().email(),
  skoolPassword: z.string().min(1),
  skoolGroupSlug: z.string().optional(),
});

/**
 * Connect a community to Skool: create SkoolAPI session and store session ID.
 * Also stores Skool email + encrypted password so "Scrape now" can use their account without re-entry.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { communityId, skoolEmail, skoolPassword, skoolGroupSlug } = bodySchema.parse(body);
    const community = await prisma.community.findFirst({
      where: { id: communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    const session = await createSession({ email: skoolEmail, password: skoolPassword });
    if (session.status !== "active" && session.status !== "pending") {
      return NextResponse.json(
        { error: `Skool login failed: ${session.status}` },
        { status: 400 }
      );
    }

    let skoolPasswordEncrypted: string | null = null;
    try {
      skoolPasswordEncrypted = encrypt(skoolPassword);
    } catch {
      // No encryption key; skip storing password (Scrape will need form or env)
    }

    await prisma.community.update({
      where: { id: communityId },
      data: {
        skoolSessionId: session.id,
        skoolGroupSlug: skoolGroupSlug ?? community.skoolGroupSlug,
        skoolConnectedAt: new Date(),
        skoolEmail,
        skoolPasswordEncrypted,
      },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      status: session.status,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes("SKOOL_API_SECRET")) {
      return NextResponse.json(
        { error: "Skool API is not configured (missing SKOOL_API_SECRET)" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Connect failed" },
      { status: 500 }
    );
  }
}
