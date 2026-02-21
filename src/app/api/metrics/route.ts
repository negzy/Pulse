import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  communityId: z.string().cuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  newMembers: z.number().min(0).default(0),
  totalMembers: z.number().min(0).default(0),
  postsCreated: z.number().min(0).default(0),
  commentsCreated: z.number().min(0).default(0),
  activeMembers: z.number().min(0).default(0),
  churnedMembers: z.number().min(0).default(0),
  startingPaidMembers: z.number().min(0).optional(),
  upgradeConversions: z.number().min(0).default(0),
  costPerJoin: z.number().min(0).optional(),
  callsBooked: z.number().min(0).default(0),
  revenue: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = bodySchema.parse(body);
    const community = await prisma.community.findFirst({
      where: { id: data.communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });
    const periodStart = new Date(data.periodStart);
    const periodEnd = new Date(data.periodEnd);
    await prisma.weeklyMetric.create({
      data: {
        communityId: data.communityId,
        periodStart,
        periodEnd,
        newMembers: data.newMembers,
        totalMembers: data.totalMembers,
        postsCreated: data.postsCreated,
        commentsCreated: data.commentsCreated,
        activeMembers: data.activeMembers,
        churnedMembers: data.churnedMembers,
        startingPaidMembers: data.startingPaidMembers ?? null,
        upgradeConversions: data.upgradeConversions,
        costPerJoin: data.costPerJoin ?? null,
        callsBooked: data.callsBooked,
        revenue: data.revenue ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
