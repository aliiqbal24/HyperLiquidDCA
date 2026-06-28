import { accounts, accountTokens } from "../../../../lib/db/schema";
import { getDb } from "../../../../lib/db/index";
import { json, options } from "../../../../lib/http";
import { hashToken, newAccountToken } from "../../../../lib/security/crypto";
import { makeId } from "@hypedca/core";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const body = z.object({ email: z.string().email().optional() }).parse(await request.json().catch(() => ({})));
  const id = makeId("acct");
  const token = newAccountToken();
  await getDb().insert(accounts).values({ id, ...(body.email ? { email: body.email } : {}) });
  await getDb().insert(accountTokens).values({ accountId: id, tokenHash: hashToken(token) });
  return json({ id, token, plan: "free", subscriptionStatus: "inactive" });
}
