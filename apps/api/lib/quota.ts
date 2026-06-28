import { and, count, eq, gte, inArray, lt } from "drizzle-orm";
import { HYPEDCA_CLOUD_PLAN, isActiveCloudPlan } from "@hypedca/core";
import { getDb } from "./db/index";
import { executionLogs } from "./db/schema";

type AccountPlanState = {
  plan: string;
  subscriptionStatus: string;
};

export type CloudQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export function requireActiveCloudPlan(account: AccountPlanState | undefined): string | undefined {
  if (!account || !isActiveCloudPlan(account.plan, account.subscriptionStatus)) {
    return "Cloud execution requires an active HypeDCA Cloud subscription.";
  }
  return undefined;
}

export async function getCloudQuota(accountId: string, now = new Date()): Promise<CloudQuota> {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const nextDayStart = new Date(dayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  const [row] = await getDb()
    .select({ value: count() })
    .from(executionLogs)
    .where(
      and(
        eq(executionLogs.accountId, accountId),
        inArray(executionLogs.status, ["filled", "submitted"]),
        gte(executionLogs.createdAt, dayStart),
        lt(executionLogs.createdAt, nextDayStart),
      ),
    );
  const used = row?.value ?? 0;
  const limit = HYPEDCA_CLOUD_PLAN.dailyCloudPurchases;
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextDayStart.toISOString(),
  };
}

export async function requireCloudQuota(accountId: string, now = new Date()): Promise<string | undefined> {
  const quota = await getCloudQuota(accountId, now);
  if (quota.remaining <= 0) {
    return `Daily cloud purchase limit reached (${quota.used}/${quota.limit}). Cloud execution resumes after ${quota.resetsAt}.`;
  }
  return undefined;
}
