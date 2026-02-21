import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

/**
 * GET: Return existing extension token (masked) or create one.
 * POST: Regenerate token. Returns the new raw token once (user must copy it).
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const record = await prisma.extensionToken.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({
    hasToken: !!record,
    hint: record ? `…${record.tokenHash.slice(-6)}` : null,
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashToken(raw);
  await prisma.extensionToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash },
    update: { tokenHash },
  });
  return NextResponse.json({ token: raw, message: "Copy this token into the extension options. It won't be shown again." });
}
