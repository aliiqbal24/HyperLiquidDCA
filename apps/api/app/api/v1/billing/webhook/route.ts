import { eq } from "drizzle-orm";
import { getDb } from "../../../../../lib/db/index";
import { accounts, stripeEvents } from "../../../../../lib/db/schema";
import { json } from "../../../../../lib/http";
import { getStripe, planForPrice } from "../../../../../lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return json({ error: "Stripe webhook is not configured." }, { status: 400 });
  const body = await request.text();
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  try {
    await getDb().insert(stripeEvents).values({ id: event.id, processed: false });
  } catch {
    return json({ ok: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (session.client_reference_id && subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await updateAccountFromSubscription(session.client_reference_id, subscription);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const accountId = subscription.metadata.accountId;
    if (accountId) await updateAccountFromSubscription(accountId, subscription);
  }

  await getDb().update(stripeEvents).set({ processed: true }).where(eq(stripeEvents.id, event.id));
  return json({ ok: true });
}

async function updateAccountFromSubscription(accountId: string, subscription: Stripe.Subscription): Promise<void> {
  const firstItem = subscription.items.data[0];
  const plan = ["active", "trialing"].includes(subscription.status) ? planForPrice(firstItem?.price.id) : "free";
  await getDb()
    .update(accounts)
    .set({
      plan,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, accountId));
}
