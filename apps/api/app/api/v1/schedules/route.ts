import { scheduleSchema, type DcaSchedule } from "@hypedca/core";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../lib/db/index";
import { accounts, schedules } from "../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../lib/http";
import { requireActiveCloudPlan } from "../../../../lib/quota";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const accountId = await requireAccount(request);
  const rows = await getDb().select().from(schedules).where(eq(schedules.accountId, accountId));
  return json(rows.map((row) => row.schedule));
}

export async function POST(request: Request) {
  const accountId = await requireAccount(request);
  const schedule = scheduleSchema.parse({ ...(await request.json()), accountId }) as DcaSchedule;
  if (schedule.executorMode !== "cloud") return json({ error: "The cloud API only accepts cloud schedules." }, { status: 400 });
  const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId));
  const planError = requireActiveCloudPlan(account);
  if (planError) return json({ error: planError }, { status: 402 });
  await getDb()
    .insert(schedules)
    .values({
      id: schedule.id,
      accountId,
      status: schedule.status,
      executorMode: schedule.executorMode,
      nextRunAt: new Date(schedule.nextRunAt),
      schedule,
    })
    .onConflictDoUpdate({
      target: schedules.id,
      set: { status: schedule.status, executorMode: schedule.executorMode, nextRunAt: new Date(schedule.nextRunAt), schedule, updatedAt: new Date() },
    });
  return json(schedule);
}
