import { and, eq, lte } from "drizzle-orm";
import {
  advanceAfterRun,
  createOrderPlan,
  getDueOccurrences,
  HyperliquidSdkAdapter,
  makeId,
  occurrenceId,
  type DcaSchedule,
  type ExecutionLog,
  type HyperliquidCredential,
} from "@hypedca/core";
import { getDb } from "./db/index";
import { accounts, credentials, executionLocks, executionLogs, schedules } from "./db/schema";
import { requireActiveCloudPlan, requireCloudQuota } from "./quota";
import { decryptJson } from "./security/crypto";

export async function executeDueCloudSchedules(now = new Date()): Promise<{ checked: number; executed: number; failed: number }> {
  const db = getDb();
  const dueRows = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.executorMode, "cloud"), eq(schedules.status, "active"), lte(schedules.nextRunAt, now)));

  let executed = 0;
  let failed = 0;

  for (const row of dueRows) {
    const outcome = await executeSchedule(row.schedule, now);
    if (outcome === "executed") executed += 1;
    if (outcome === "failed") failed += 1;
  }

  return { checked: dueRows.length, executed, failed };
}

export async function executeSchedule(schedule: DcaSchedule, now = new Date()): Promise<"executed" | "skipped" | "failed"> {
  const db = getDb();
  const due = getDueOccurrences(schedule, now)[0] ?? {
    scheduleId: schedule.id,
    scheduledFor: now.toISOString(),
    occurrenceId: occurrenceId(schedule.id, now.toISOString()),
  };

  try {
    await db.insert(executionLocks).values({ occurrenceId: due.occurrenceId, scheduleId: schedule.id });
  } catch {
    return "skipped";
  }

  const [account] = await db.select().from(accounts).where(eq(accounts.id, schedule.accountId));
  const planError = requireActiveCloudPlan(account);
  if (planError) {
    await recordLog(schedule, "paused", planError, due.occurrenceId);
    await db.update(schedules).set({ status: "paused", schedule: { ...schedule, status: "paused" }, updatedAt: new Date() }).where(eq(schedules.id, schedule.id));
    return "failed";
  }

  const quotaError = await requireCloudQuota(schedule.accountId, now);
  if (quotaError) {
    await recordLog(schedule, "skipped", quotaError, due.occurrenceId);
    const next = advanceAfterRun(schedule, now);
    await db
      .update(schedules)
      .set({ status: next.status, nextRunAt: new Date(next.nextRunAt), schedule: next, updatedAt: new Date() })
      .where(eq(schedules.id, schedule.id));
    return "skipped";
  }

  const [credentialRow] = await db.select().from(credentials).where(eq(credentials.accountId, schedule.accountId));
  if (!credentialRow) {
    await recordLog(schedule, "failed", "No encrypted Hyperliquid API wallet is available for this account.", due.occurrenceId);
    await db.update(schedules).set({ status: "failed", schedule: { ...schedule, status: "failed" }, updatedAt: new Date() }).where(eq(schedules.id, schedule.id));
    return "failed";
  }

  try {
    const credential = decryptJson<HyperliquidCredential>(credentialRow.secret);
    const adapter = new HyperliquidSdkAdapter(credential);
    const market = await adapter.getMarketSnapshot(schedule.asset, schedule.marketType);
    const plan = createOrderPlan(schedule, market, due.scheduledFor);
    const result = await adapter.submitOrder(plan);
    const details: Partial<ExecutionLog> = {
      cloid: result.cloid ?? plan.cloid,
      submittedSize: plan.size,
      submittedLimitPrice: plan.limitPrice,
    };
    if (result.orderId) details.orderId = result.orderId;
    if (result.filledSize) details.filledSize = result.filledSize;
    if (result.averagePrice) details.averagePrice = result.averagePrice;
    await recordLog(schedule, result.status, result.message, due.occurrenceId, details);
    const next = advanceAfterRun(schedule, now);
    await db
      .update(schedules)
      .set({ status: next.status, nextRunAt: new Date(next.nextRunAt), schedule: next, updatedAt: new Date() })
      .where(eq(schedules.id, schedule.id));
    return "executed";
  } catch (error) {
    await recordLog(schedule, "failed", error instanceof Error ? error.message : "Unknown cloud execution failure.", due.occurrenceId);
    await db.update(schedules).set({ status: "failed", schedule: { ...schedule, status: "failed" }, updatedAt: new Date() }).where(eq(schedules.id, schedule.id));
    return "failed";
  }
}

async function recordLog(
  schedule: DcaSchedule,
  status: ExecutionLog["status"],
  message: string,
  occurrence: string,
  details: Partial<ExecutionLog> = {},
): Promise<ExecutionLog> {
  const log: ExecutionLog = {
    id: makeId("log"),
    scheduleId: schedule.id,
    occurrenceId: occurrence,
    status,
    message,
    ...(details.cloid ? { cloid: details.cloid } : {}),
    ...(details.orderId ? { orderId: details.orderId } : {}),
    ...(details.filledSize ? { filledSize: details.filledSize } : {}),
    ...(details.averagePrice ? { averagePrice: details.averagePrice } : {}),
    ...(details.submittedSize ? { submittedSize: details.submittedSize } : {}),
    ...(details.submittedLimitPrice ? { submittedLimitPrice: details.submittedLimitPrice } : {}),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(executionLogs).values({ id: log.id, accountId: schedule.accountId, scheduleId: schedule.id, status, log });
  return log;
}
