import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { z } from "zod";

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin?.startsWith("chrome-extension://") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const bodySchema = z.object({
  groupSlug: z.string().optional(),
  communityId: z.string().cuid().optional(),
  posts: z.number().min(0).default(0),
  comments: z.number().min(0).default(0),
  likes: z.number().min(0).optional(),
  interactions: z.number().min(0).optional(),
  totalMembers: z.number().min(0).optional(),
});

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Extension pushes activity from the current Skool page.
 * Auth: Bearer <extension token>.
 * Matches community by groupSlug (from URL) or by communityId if provided.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const auth = req.headers.get("authorization");
  const raw = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!raw) {
    return NextResponse.json({ error: "Missing token" }, { status: 401, headers: corsHeaders(origin) });
  }

  const hash = hashToken(raw);
  const record = await prisma.extensionToken.findFirst({
    where: { tokenHash: hash },
    include: { user: { select: { id: true } } },
  });
  if (!record) {
    return NextResponse.json(
      { error: "Invalid token. In the dashboard go to Extension, generate a new token, and paste it in the extension options (right‑click icon → Options)." },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const data = bodySchema.parse(body);
    let communityId = data.communityId;
    if (!communityId && data.groupSlug) {
      const c = await prisma.community.findFirst({
        where: {
          userId: record.userId,
          OR: [
            { skoolGroupSlug: data.groupSlug },
            { skoolUrl: { contains: data.groupSlug } },
          ],
        },
      });
      communityId = c?.id ?? undefined;
    }
    if (!communityId) {
      return NextResponse.json(
        { error: "No community found for this group. Add a community in Pulse with this group's Skool URL or slug." },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);
    await prisma.weeklyMetric.create({
      data: {
        communityId,
        periodStart,
        periodEnd: now,
        postsCreated: data.posts,
        commentsCreated: data.comments,
        likesCount: data.likes ?? 0,
        interactionsCount: data.interactions ?? (data.likes ?? 0) + data.comments,
        totalMembers: data.totalMembers ?? undefined,
        newMembers: 0,
        activeMembers: 0,
        churnedMembers: 0,
      },
    });
    return NextResponse.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400, headers: corsHeaders(origin) });
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500, headers: corsHeaders(origin) });
  }
}
