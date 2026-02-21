/**
 * Map Skool API / webhook data into Skool Pulse DB models.
 * When SkoolAPI.com adds pull endpoints for group stats or members, call them here and upsert WeeklyMetric / ChurnEvent.
 */

import { prisma } from "@/lib/db";

export type GroupStatsPayload = {
  group?: string;
  total_members?: number;
  new_members?: number;
  posts?: number;
  comments?: number;
  active_members?: number;
  period_start?: string;
  period_end?: string;
  [key: string]: unknown;
};

/**
 * Apply group_stats webhook (or future API response) to a community.
 * Creates a WeeklyMetric row for the period (Skool API data overrides manual entry for that period when aggregated).
 */
export async function applyGroupStats(
  communityId: string,
  payload: GroupStatsPayload
): Promise<void> {
  const periodEnd = payload.period_end ? new Date(payload.period_end) : new Date();
  const periodStart = payload.period_start
    ? new Date(payload.period_start)
    : new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.weeklyMetric.create({
    data: {
      communityId,
      periodStart,
      periodEnd,
      newMembers: payload.new_members ?? 0,
      totalMembers: payload.total_members ?? 0,
      postsCreated: payload.posts ?? 0,
      commentsCreated: payload.comments ?? 0,
      activeMembers: payload.active_members ?? 0,
    },
  });
}
