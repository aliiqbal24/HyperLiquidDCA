import { eq } from "drizzle-orm";
import { getDb } from "./db/index";
import { accountTokens } from "./db/schema";
import { hashToken } from "./security/crypto";

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "authorization,content-type,x-hypedca-account",
      ...(init?.headers ?? {}),
    },
  });
}

export function options(): Response {
  return new Response(null, { status: 204, headers: json({}).headers });
}

export async function requireAccount(request: Request): Promise<string> {
  const headerAccount = request.headers.get("x-hypedca-account");
  const auth = request.headers.get("authorization");
  if (!headerAccount) throw new Error("Missing x-hypedca-account header.");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing account bearer token.");
  const tokenHash = hashToken(auth.slice("Bearer ".length));
  const rows = await getDb().select().from(accountTokens).where(eq(accountTokens.accountId, headerAccount));
  if (!rows.some((row) => row.tokenHash === tokenHash)) throw new Error("Invalid account token.");
  return headerAccount;
}
