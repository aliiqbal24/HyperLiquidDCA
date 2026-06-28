import { describe, expect, it } from "vitest";
import { createOrderPlan } from "./orders.js";
import type { DcaSchedule, MarketSnapshot } from "./types.js";

const market: MarketSnapshot = {
  asset: "ETH",
  assetId: 1,
  midPrice: "2500",
  szDecimals: 3,
  tickSize: "0.5",
  lotSize: "0.001",
};

const schedule: DcaSchedule = {
  id: "sch_eth",
  accountId: "acct_test",
  label: "ETH long",
  marketType: "perp",
  asset: "ETH",
  side: "long",
  notionalUsd: 100,
  cadence: { kind: "daily", time: "09:00" },
  timezone: "UTC",
  startAt: "2026-06-01T00:00:00Z",
  nextRunAt: "2026-06-02T09:00:00Z",
  runCount: 0,
  status: "active",
  executorMode: "cloud",
  leverage: 2,
  marginMode: "isolated",
  risk: { maxSlippageBps: 100 },
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

describe("order planning", () => {
  it("builds an aggressive IOC buy order", () => {
    const plan = createOrderPlan(schedule, market);
    expect(plan.isBuy).toBe(true);
    expect(plan.size).toBe("0.04");
    expect(plan.limitPrice).toBe("2525");
    expect(plan.tif).toBe("Ioc");
  });

  it("builds an aggressive sell order for shorts", () => {
    const plan = createOrderPlan({ ...schedule, side: "short" }, market);
    expect(plan.isBuy).toBe(false);
    expect(plan.limitPrice).toBe("2475");
  });
});
