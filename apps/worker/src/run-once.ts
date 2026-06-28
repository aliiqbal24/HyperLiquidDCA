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
import { loadConfig } from "./config.js";
import { decryptJson } from "./crypto.js";
import { JsonStore } from "./store.js";

const config = loadConfig();
const store = new JsonStore(config.dataFile);

const db = await store.read();
const now = new Date();

for (const schedule of [...db.schedules]) {
  if (schedule.executorMode !== "cloud" || schedule.status !== "active") continue;

  const due = getDueOccurrences(schedule, now)[0];
  if (!due) continue;
  if (db.locks.includes(due.occurrenceId)) continue;

  db.locks.push(due.occurrenceId);
  const account = db.accounts.find((item) => item.id === schedule.accountId);

  if (!account || account.plan === "free") {
    record(db.logs, schedule, "paused", "Cloud execution requires an active paid plan.");
    replaceSchedule(db.schedules, { ...schedule, status: "paused", updatedAt: now.toISOString() });
    continue;
  }

  if (!account.credential) {
    record(db.logs, schedule, "failed", "No encrypted Hyperliquid API wallet is available for this account.");
    replaceSchedule(db.schedules, { ...schedule, status: "failed", updatedAt: now.toISOString() });
    continue;
  }

  try {
    const credential = decryptJson<HyperliquidCredential>(account.credential, config.encryptionKeyBase64);
    const adapter = new HyperliquidSdkAdapter(credential);
    const market = await adapter.getMarketSnapshot(schedule.asset, schedule.marketType);
    const plan = createOrderPlan(schedule, market);
    const result = await adapter.submitOrder(plan);
    db.logs.unshift({
      id: makeId("log"),
      scheduleId: schedule.id,
      occurrenceId: occurrenceId(schedule.id, due.scheduledFor),
      status: result.status,
      message: result.message,
      ...(result.orderId ? { orderId: result.orderId } : {}),
      ...(result.filledSize ? { filledSize: result.filledSize } : {}),
      ...(result.averagePrice ? { averagePrice: result.averagePrice } : {}),
      createdAt: new Date().toISOString(),
    });
    replaceSchedule(db.schedules, advanceAfterRun(schedule));
  } catch (error) {
    record(db.logs, schedule, "failed", error instanceof Error ? error.message : "Unknown cloud execution failure.");
    replaceSchedule(db.schedules, { ...schedule, status: "failed", updatedAt: new Date().toISOString() });
  }
}

db.logs = db.logs.slice(0, 5_000);
await store.write(db);

function replaceSchedule(schedules: DcaSchedule[], schedule: DcaSchedule): void {
  const index = schedules.findIndex((item) => item.id === schedule.id);
  if (index >= 0) schedules[index] = schedule;
}

function record(logs: ExecutionLog[], schedule: DcaSchedule, status: ExecutionLog["status"], message: string): void {
  logs.unshift({
    id: makeId("log"),
    scheduleId: schedule.id,
    occurrenceId: occurrenceId(schedule.id, schedule.nextRunAt),
    status,
    message,
    createdAt: new Date().toISOString(),
  });
}
