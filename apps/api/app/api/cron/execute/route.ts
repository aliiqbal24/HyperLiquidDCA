import { executeDueCloudSchedules } from "../../../../lib/execution";
import { json } from "../../../../lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  return json(await executeDueCloudSchedules());
}
