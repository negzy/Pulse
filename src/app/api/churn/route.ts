import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const churnReasons = [
  "too_busy",
  "not_seeing_value",
  "price",
  "didnt_use",
  "joined_for_one_thing",
  "other",
] as const;

const bodySchema = z.object({
  communityId: z.string().cuid(),
  memberIdOrName: z.string().min(1),
  status: z.enum(["active", "churned"]).default("churned"),
  startDate: z.string().optional(),
  churnDate: z.string(),
  churnReason: z.enum(churnReasons).optional().nullable(),
  notes: z.string().optional().nullable(),
  plan: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
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
    const churn = await prisma.churnEvent.create({
      data: {
        communityId: data.communityId,
        memberIdOrName: data.memberIdOrName,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        churnDate: new Date(data.churnDate),
        churnReason: data.churnReason ?? null,
        notes: data.notes ?? null,
        plan: data.plan ?? null,
        source: data.source ?? null,
      },
    });
    return NextResponse.json(churn);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
