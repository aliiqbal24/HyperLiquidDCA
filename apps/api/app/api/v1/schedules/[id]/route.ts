import { eq, and } from "drizzle-orm";
import { scheduleSchema, type DcaSchedule } from "@hypedca/core";
import { getDb } from "../../../../../lib/db/index";
import { schedules } from "../../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../../lib/http";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accountId = await requireAccount(request);
  const { id } = await params;
  const body = await request.json();
  const [row] = await getDb().select().from(schedules).where(and(eq(schedules.id, id), eq(schedules.accountId, accountId)));
  if (!row) return json({ error: "Schedule not found." }, { status: 404 });

  const current = row.schedule;
  const next: DcaSchedule =
    body.action === "pause"
      ? { ...current, status: "paused", updatedAt: new Date().toISOString() }
      : body.action === "resume"
        ? { ...current, status: "active", updatedAt: new Date().toISOString() }
        : body.action === "cancel"
          ? { ...current, status: "paused", updatedAt: new Date().toISOString() }
          : (scheduleSchema.parse({ ...body.schedule, accountId }) as unknown as DcaSchedule);

  if (body.action === "cancel") {
    await getDb().delete(schedules).where(and(eq(schedules.id, id), eq(schedules.accountId, accountId)));
    return json(next);
  }

  await getDb()
    .update(schedules)
    .set({ status: next.status, nextRunAt: new Date(next.nextRunAt), schedule: next, updatedAt: new Date() })
    .where(and(eq(schedules.id, id), eq(schedules.accountId, accountId)));
  return json(next);
}
