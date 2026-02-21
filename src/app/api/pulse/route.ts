import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  communityId: z.string().cuid(),
  weekStart: z.string(),
  newMembers: z.number().min(0).default(0),
  churnedMembers: z.number().min(0).default(0),
  posts: z.number().min(0).default(0),
  comments: z.number().min(0).default(0),
  notableWins: z.string().optional().nullable(),
  topQuestions: z.string().optional().nullable(),
  testNextWeek: z.string().optional().nullable(),
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
    const pulse = await prisma.weeklyPulse.create({
      data: {
        communityId: data.communityId,
        weekStart: new Date(data.weekStart),
        newMembers: data.newMembers,
        churnedMembers: data.churnedMembers,
        posts: data.posts,
        comments: data.comments,
        notableWins: data.notableWins ?? null,
        topQuestions: data.topQuestions ?? null,
        testNextWeek: data.testNextWeek ?? null,
      },
    });
    return NextResponse.json(pulse);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
