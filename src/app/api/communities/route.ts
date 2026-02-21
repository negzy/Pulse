import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1),
  skoolUrl: z.string().url().optional().nullable().or(z.literal("")),
  timezone: z.string().default("UTC"),
  planType: z.enum(["Free", "Paid"]).default("Free"),
  hasTiers: z.boolean().default(false),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const data = bodySchema.parse({
      ...body,
      skoolUrl: body.skoolUrl === "" ? null : body.skoolUrl,
    });
    const community = await prisma.community.create({
      data: {
        userId: user.id,
        name: data.name,
        skoolUrl: data.skoolUrl ?? null,
        timezone: data.timezone,
        planType: data.planType,
        hasTiers: data.hasTiers,
      },
    });
    return NextResponse.json(community);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
