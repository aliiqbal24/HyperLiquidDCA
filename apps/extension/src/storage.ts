import type { DcaSchedule, ExecutionLog, HyperliquidCredential } from "@hypedca/core";

const KEYS = {
  schedules: "hypedca:schedules",
  logs: "hypedca:logs",
  credential: "hypedca:credential",
  cloudAccountId: "hypedca:cloudAccountId",
  cloudAccountToken: "hypedca:cloudAccountToken",
  recentAssets: "hypedca:recentAssets",
};

export async function getSchedules(): Promise<DcaSchedule[]> {
  const result = await chrome.storage.local.get(KEYS.schedules);
  return (result[KEYS.schedules] as DcaSchedule[] | undefined) ?? [];
}

export async function saveSchedules(schedules: DcaSchedule[]): Promise<void> {
  await chrome.storage.local.set({ [KEYS.schedules]: schedules });
}

export async function upsertSchedule(schedule: DcaSchedule): Promise<void> {
  const schedules = await getSchedules();
  const index = schedules.findIndex((item) => item.id === schedule.id);
  if (index >= 0) schedules[index] = schedule;
  else schedules.unshift(schedule);
  await saveSchedules(schedules);
  await chrome.runtime.sendMessage({ type: "HYPEDCA_SYNC_ALARMS" }).catch(() => undefined);
}

export async function updateSchedule(scheduleId: string, changes: Partial<DcaSchedule>): Promise<DcaSchedule | undefined> {
  const schedules = await getSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);
  if (!schedule) return undefined;
  const updated = { ...schedule, ...changes, updatedAt: new Date().toISOString() };
  await saveSchedules(schedules.map((item) => (item.id === scheduleId ? updated : item)));
  await chrome.runtime.sendMessage({ type: "HYPEDCA_SYNC_ALARMS" }).catch(() => undefined);
  return updated;
}

export async function removeSchedule(scheduleId: string): Promise<void> {
  const schedules = await getSchedules();
  await saveSchedules(schedules.filter((schedule) => schedule.id !== scheduleId));
  await chrome.runtime.sendMessage({ type: "HYPEDCA_SYNC_ALARMS" }).catch(() => undefined);
}

export async function getLogs(): Promise<ExecutionLog[]> {
  const result = await chrome.storage.local.get(KEYS.logs);
  return (result[KEYS.logs] as ExecutionLog[] | undefined) ?? [];
}

export async function appendLog(log: ExecutionLog): Promise<void> {
  const logs = await getLogs();
  logs.unshift(log);
  await chrome.storage.local.set({ [KEYS.logs]: logs.slice(0, 500) });
}

export async function getCredential(): Promise<HyperliquidCredential | undefined> {
  const result = await chrome.storage.local.get(KEYS.credential);
  return result[KEYS.credential] as HyperliquidCredential | undefined;
}

export async function saveCredential(credential: HyperliquidCredential): Promise<void> {
  await chrome.storage.local.set({ [KEYS.credential]: credential });
}

export async function getCloudAccountId(): Promise<string | undefined> {
  const result = await chrome.storage.local.get(KEYS.cloudAccountId);
  return result[KEYS.cloudAccountId] as string | undefined;
}

export async function saveCloudAccountId(accountId: string): Promise<void> {
  await chrome.storage.local.set({ [KEYS.cloudAccountId]: accountId });
}

export async function getCloudAccountToken(): Promise<string | undefined> {
  const result = await chrome.storage.local.get(KEYS.cloudAccountToken);
  return result[KEYS.cloudAccountToken] as string | undefined;
}

export async function saveCloudAccount(accountId: string, token: string): Promise<void> {
  await chrome.storage.local.set({ [KEYS.cloudAccountId]: accountId, [KEYS.cloudAccountToken]: token });
}

export async function getRecentAssets(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEYS.recentAssets);
  return (result[KEYS.recentAssets] as string[] | undefined) ?? [];
}

export async function rememberAsset(assetKey: string): Promise<void> {
  const recent = await getRecentAssets();
  await chrome.storage.local.set({ [KEYS.recentAssets]: [assetKey, ...recent.filter((item) => item !== assetKey)].slice(0, 8) });
}
