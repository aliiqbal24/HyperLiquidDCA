import { describe, expect, it } from "vitest";
import { advanceAfterRun, computeInitialNextRun, getDueOccurrences } from "./schedule.js";
import type { DcaSchedule } from "./types.js";

const baseSchedule: DcaSchedule = {
  id: "sch_test",
  accountId: "acct_test",
  label: "BTC weekly",
  marketType: "spot",
  asset: "BTC",
  side: "buy",
  notionalUsd: 50,
  cadence: { kind: "weekly", daysOfWeek: [5], time: "09:00" },
  timezone: "America/New_York",
  startAt: "2026-06-01T00:00:00Z",
  nextRunAt: "2026-06-05T13:00:00Z",
  runCount: 0,
  status: "active",
  executorMode: "browser",
  risk: { maxSlippageBps: 100, maxRuns: 2 },
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

describe("schedule calculation", () => {
  it("computes the first weekly run in the requested timezone", () => {
    expect(
      computeInitialNextRun(
        { kind: "weekly", daysOfWeek: [5], time: "09:00" },
        "America/New_York",
        "2026-06-01T00:00:00Z",
        new Date("2026-06-02T00:00:00Z"),
      ),
    ).toBe("2026-06-05T13:00:00Z");
  });

  it("returns only the due occurrence and does not catch up multiple missed runs", () => {
    const due = getDueOccurrences(baseSchedule, new Date("2026-06-27T00:00:00Z"));
    expect(due).toHaveLength(1);
    expect(due[0]?.occurrenceId).toBe("sch_test:2026-06-05T13:00:00Z");
  });

  it("pauses when max run count is reached", () => {
    const onceRun = { ...baseSchedule, runCount: 1 };
    const updated = advanceAfterRun(onceRun, new Date("2026-06-05T13:00:00Z"));
    expect(updated.status).toBe("paused");
    expect(updated.runCount).toBe(2);
  });
});
