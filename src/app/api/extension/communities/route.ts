import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin?.startsWith("chrome-extension://") ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders(null) });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * GET: List communities for the extension user (for Scheduler / all-groups tracking).
 * Auth: Bearer <extension token>.
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401, headers: corsHeaders(origin) });
  }

  const hash = hashToken(token);
  const record = await prisma.extensionToken.findFirst({
    where: { tokenHash: hash },
    select: { userId: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: corsHeaders(origin) });
  }

  const communities = await prisma.community.findMany({
    where: { userId: record.userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      skoolGroupSlug: true,
      skoolUrl: true,
    },
  });

  return NextResponse.json(
    { communities },
    { headers: corsHeaders(origin) }
  );
}
