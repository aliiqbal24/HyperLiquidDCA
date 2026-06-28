import { eq } from "drizzle-orm";
import { getDb } from "../../../../../lib/db/index";
import { accounts } from "../../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../../lib/http";
import { getStripe } from "../../../../../lib/stripe";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const accountId = await requireAccount(request);
  const body = z.object({ returnUrl: z.string().url() }).parse(await request.json());
  const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account?.stripeCustomerId) return json({ error: "No Stripe customer exists for this account yet." }, { status: 404 });
  const session = await getStripe().billingPortal.sessions.create({ customer: account.stripeCustomerId, return_url: body.returnUrl });
  return json({ url: session.url });
}
