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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.community.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = await req.json();
    const data = bodySchema.parse({
      ...body,
      skoolUrl: body.skoolUrl === "" ? null : body.skoolUrl,
    });
    const community = await prisma.community.update({
      where: { id },
      data: {
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
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.community.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.community.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
