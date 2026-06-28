import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../lib/db/index";
import { executionLogs, schedules } from "../../../../../../lib/db/schema";
import { executeSchedule } from "../../../../../../lib/execution";
import { json, options, requireAccount } from "../../../../../../lib/http";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await requireAccount(request);
  const { id } = await params;
  const [row] = await getDb().select().from(schedules).where(and(eq(schedules.id, id), eq(schedules.accountId, accountId)));
  if (!row) return json({ error: "Schedule not found." }, { status: 404 });
  await executeSchedule({ ...row.schedule, nextRunAt: new Date().toISOString() }, new Date());
  const logs = await getDb().select().from(executionLogs).where(eq(executionLogs.scheduleId, id));
  return json(logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.log ?? { error: "No log was created." });
}
