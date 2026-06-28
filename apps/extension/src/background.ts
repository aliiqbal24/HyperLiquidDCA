import {
  advanceAfterRun,
  createOrderPlan,
  getDueOccurrences,
  HyperliquidSdkAdapter,
  makeId,
  occurrenceId,
  type DcaSchedule,
  type ExecutionLog,
} from "@hypedca/core";

const SCHEDULES_KEY = "hypedca:schedules";
const LOGS_KEY = "hypedca:logs";
const CREDENTIAL_KEY = "hypedca:credential";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
  void syncAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  void syncAlarms();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "HYPEDCA_SYNC_ALARMS") {
    void syncAlarms().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "HYPEDCA_RUN_SCHEDULE" && typeof message.scheduleId === "string") {
    void runDueBrowserSchedules(message.scheduleId).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("hypedca:")) return;
  void runDueBrowserSchedules();
});

async function syncAlarms(): Promise<void> {
  const schedules = await getSchedules();
  const existing = await chrome.alarms.getAll();
  await Promise.all(existing.filter((alarm) => alarm.name.startsWith("hypedca:")).map((alarm) => chrome.alarms.clear(alarm.name)));

  for (const schedule of schedules) {
    if (schedule.status !== "active" || schedule.executorMode !== "browser") continue;
    await chrome.alarms.create(`hypedca:${schedule.id}`, { when: new Date(schedule.nextRunAt).getTime() });
  }
}

async function runDueBrowserSchedules(forceScheduleId?: string): Promise<void> {
  const [schedules, credential] = await Promise.all([getSchedules(), getCredential()]);
  const updated: DcaSchedule[] = [];

  for (const schedule of schedules) {
    if (schedule.executorMode !== "browser") {
      updated.push(schedule);
      continue;
    }

    const due =
      forceScheduleId === schedule.id
        ? [{ scheduleId: schedule.id, scheduledFor: new Date().toISOString(), occurrenceId: `${schedule.id}:run-now:${Date.now()}` }]
        : getDueOccurrences(schedule);
    if (due.length === 0) {
      updated.push(schedule);
      continue;
    }

    if (!credential) {
      await appendLog(log(schedule, "failed", "No Hyperliquid API wallet is saved in this browser."));
      updated.push({ ...schedule, status: "failed", updatedAt: new Date().toISOString() });
      continue;
    }

    try {
      const adapter = new HyperliquidSdkAdapter(credential);
      const market = await adapter.getMarketSnapshot(schedule.asset, schedule.marketType);
      const plan = createOrderPlan(schedule, market, due[0]?.scheduledFor ?? schedule.nextRunAt);
      const result = await adapter.submitOrder(plan);
      await appendLog({
        id: makeId("log"),
        scheduleId: schedule.id,
        occurrenceId: occurrenceId(schedule.id, due[0]?.scheduledFor ?? schedule.nextRunAt),
        status: result.status,
        message: result.message,
        cloid: result.cloid ?? plan.cloid,
        ...(result.orderId ? { orderId: result.orderId } : {}),
        ...(result.filledSize ? { filledSize: result.filledSize } : {}),
        ...(result.averagePrice ? { averagePrice: result.averagePrice } : {}),
        submittedSize: plan.size,
        submittedLimitPrice: plan.limitPrice,
        createdAt: new Date().toISOString(),
      });
      updated.push(advanceAfterRun(schedule));
    } catch (error) {
      await appendLog(log(schedule, "failed", error instanceof Error ? error.message : "Unknown execution failure."));
      updated.push({ ...schedule, status: "failed", updatedAt: new Date().toISOString() });
    }
  }

  await chrome.storage.local.set({ [SCHEDULES_KEY]: updated });
  await syncAlarms();
}

async function getSchedules(): Promise<DcaSchedule[]> {
  const result = await chrome.storage.local.get(SCHEDULES_KEY);
  return (result[SCHEDULES_KEY] as DcaSchedule[] | undefined) ?? [];
}

async function getCredential() {
  const result = await chrome.storage.local.get(CREDENTIAL_KEY);
  return result[CREDENTIAL_KEY];
}

async function appendLog(entry: ExecutionLog): Promise<void> {
  const result = await chrome.storage.local.get(LOGS_KEY);
  const logs = ((result[LOGS_KEY] as ExecutionLog[] | undefined) ?? []).slice(0, 499);
  await chrome.storage.local.set({ [LOGS_KEY]: [entry, ...logs] });
}

function log(schedule: DcaSchedule, status: ExecutionLog["status"], message: string): ExecutionLog {
  return {
    id: makeId("log"),
    scheduleId: schedule.id,
    occurrenceId: occurrenceId(schedule.id, schedule.nextRunAt),
    status,
    message,
    createdAt: new Date().toISOString(),
  };
}
