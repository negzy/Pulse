import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const validation = require("../extension/features/scheduler/schedulerValidation.js");

describe("scheduler validation", () => {
  it("enforces per-community cap", () => {
    const base = [
      { id: "1", communityId: "c1", scheduledAt: "2026-02-18T10:00:00.000Z", status: "SCHEDULED" },
      { id: "2", communityId: "c1", scheduledAt: "2026-02-18T12:30:00.000Z", status: "QUEUED" },
      { id: "3", communityId: "c1", scheduledAt: "2026-02-19T09:00:00.000Z", status: "PAUSED" },
    ];
    const result = validation.validateScheduleConstraints(
      { communityId: "c1", scheduledAt: "2026-02-20T10:00:00.000Z" },
      base
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Community limit reached");
  });

  it("enforces daily cap", () => {
    const base = [
      { communityId: "c1", scheduledAt: "2026-02-18T08:00:00.000Z", status: "SCHEDULED" },
      { communityId: "c2", scheduledAt: "2026-02-18T11:00:00.000Z", status: "QUEUED" },
      { communityId: "c3", scheduledAt: "2026-02-18T17:00:00.000Z", status: "PAUSED" },
    ];
    const result = validation.validateScheduleConstraints(
      { communityId: "c4", scheduledAt: "2026-02-18T20:00:00.000Z" },
      base
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Daily limit reached");
  });

  it("enforces 2-hour buffer", () => {
    const base = [
      { communityId: "c1", scheduledAt: "2026-02-18T10:00:00.000Z", status: "SCHEDULED" },
    ];
    const result = validation.validateScheduleConstraints(
      { communityId: "c1", scheduledAt: "2026-02-18T11:00:00.000Z" },
      base
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Too close to another post");
  });
});

describe("computeNextAvailableSlot", () => {
  it("moves to next day when daily cap reached", () => {
    const base = [
      { scheduledAt: "2026-02-18T08:00:00.000Z", status: "SCHEDULED" },
      { scheduledAt: "2026-02-18T12:00:00.000Z", status: "QUEUED" },
      { scheduledAt: "2026-02-18T18:00:00.000Z", status: "PAUSED" },
    ];
    const preferred = new Date("2026-02-18T09:00:00.000Z");
    const next = validation.computeNextAvailableSlot(preferred, base);
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-19");
  });

  it("shifts to maintain 2-hour buffer", () => {
    const base = [
      { scheduledAt: "2026-02-18T10:00:00.000Z", status: "SCHEDULED" },
    ];
    const preferred = new Date("2026-02-18T10:30:00.000Z");
    const next = validation.computeNextAvailableSlot(preferred, base);
    const diffMs = next.getTime() - new Date("2026-02-18T10:00:00.000Z").getTime();
    expect(diffMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000);
  });
});

