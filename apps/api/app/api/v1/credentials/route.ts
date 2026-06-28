import { credentialSchema, type HyperliquidCredential } from "@hypedca/core";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../lib/db/index";
import { credentials } from "../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../lib/http";
import { encryptJson } from "../../../../lib/security/crypto";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const accountId = await requireAccount(request);
  const credential = credentialSchema.parse(await request.json()) as HyperliquidCredential;
  const secret = encryptJson(credential);
  await getDb()
    .insert(credentials)
    .values({ accountId, secret, environment: credential.environment })
    .onConflictDoUpdate({ target: credentials.accountId, set: { secret, environment: credential.environment, updatedAt: new Date() } });
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const accountId = await requireAccount(request);
  await getDb().delete(credentials).where(eq(credentials.accountId, accountId));
  return json({ ok: true });
}
