import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || c === "\n" || c === "\r") {
      result.push(current.trim());
      current = "";
      if (c !== ",") break;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await req.formData();
    const communityId = formData.get("communityId") as string | null;
    const file = formData.get("file") as File | null;
    if (!communityId || !file) {
      return NextResponse.json({ error: "communityId and file required" }, { status: 400 });
    }
    const community = await prisma.community.findFirst({
      where: { id: communityId, userId: user.id },
    });
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have header and at least one row" }, { status: 400 });
    }
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const memberIdx = header.findIndex((h) => h === "member_id_or_name");
    const statusIdx = header.findIndex((h) => h === "status");
    const startIdx = header.findIndex((h) => h === "start_date");
    const churnDateIdx = header.findIndex((h) => h === "churn_date");
    const reasonIdx = header.findIndex((h) => h === "churn_reason");
    const notesIdx = header.findIndex((h) => h === "notes");
    const planIdx = header.findIndex((h) => h === "plan");
    const sourceIdx = header.findIndex((h) => h === "source");
    if (memberIdx === -1 || churnDateIdx === -1) {
      return NextResponse.json({
        error: "CSV must include member_id_or_name and churn_date columns",
      }, { status: 400 });
    }
    const reasonMap: Record<string, string> = {
      "too busy": "too_busy",
      "not seeing value": "not_seeing_value",
      "price": "price",
      "didn't use": "didnt_use",
      "didnt use": "didnt_use",
      "joined for one thing": "joined_for_one_thing",
      "other": "other",
    };
    let created = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      const memberIdOrName = cells[memberIdx]?.trim();
      if (!memberIdOrName) continue;
      const status = (cells[statusIdx]?.trim() || "churned").toLowerCase();
      const churnDateStr = cells[churnDateIdx]?.trim();
      if (!churnDateStr) continue;
      const churnDate = new Date(churnDateStr);
      if (isNaN(churnDate.getTime())) continue;
      let churnReason: string | null = (cells[reasonIdx]?.trim() || "").toLowerCase();
      churnReason = reasonMap[churnReason] || (churnReason && churnReason.length <= 30 ? churnReason : null);
      const notes = cells[notesIdx]?.trim() || null;
      const plan = cells[planIdx]?.trim() || null;
      const source = cells[sourceIdx]?.trim() || null;
      const startDateStr = cells[startIdx]?.trim();
      const startDate = startDateStr ? new Date(startDateStr) : null;
      await prisma.churnEvent.create({
        data: {
          communityId,
          memberIdOrName,
          status: status === "active" ? "active" : "churned",
          startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
          churnDate,
          churnReason,
          notes,
          plan,
          source,
        },
      });
      created++;
    }
    return NextResponse.json({ ok: true, created });
  } catch (e) {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
