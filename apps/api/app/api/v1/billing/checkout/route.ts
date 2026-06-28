import { eq } from "drizzle-orm";
import { getDb } from "../../../../../lib/db/index";
import { accounts } from "../../../../../lib/db/schema";
import { json, options, requireAccount } from "../../../../../lib/http";
import { getCloudPriceId, getStripe } from "../../../../../lib/stripe";
import { z } from "zod";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const accountId = await requireAccount(request);
  const body = z.object({ successUrl: z.string().url(), cancelUrl: z.string().url() }).parse(await request.json());
  const [account] = await getDb().select().from(accounts).where(eq(accounts.id, accountId));
  if (!account) return json({ error: "Account not found." }, { status: 404 });
  const stripe = getStripe();
  const customer = account.stripeCustomerId
    ? account.stripeCustomerId
    : (await stripe.customers.create({ metadata: { accountId }, ...(account.email ? { email: account.email } : {}) })).id;
  if (!account.stripeCustomerId) {
    await getDb().update(accounts).set({ stripeCustomerId: customer, updatedAt: new Date() }).where(eq(accounts.id, accountId));
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: getCloudPriceId(), quantity: 1 }],
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
    client_reference_id: accountId,
    metadata: { accountId },
    subscription_data: { metadata: { accountId } },
  });
  return json({ url: session.url });
}
