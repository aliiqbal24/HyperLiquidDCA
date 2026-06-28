import { eq } from "drizzle-orm";
import { getDb } from "../../../../lib/db/index";
import { executionLogs } from "../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../lib/http";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const accountId = await requireAccount(request);
  const rows = await getDb().select().from(executionLogs).where(eq(executionLogs.accountId, accountId));
  return json(rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((row) => row.log));
}
