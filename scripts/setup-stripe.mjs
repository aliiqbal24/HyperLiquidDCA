import Stripe from "stripe";

const CLOUD_PLAN = {
  productName: "HypeDCA Cloud",
  priceNickname: "HypeDCA Cloud Monthly",
  lookupKey: "hypedca_cloud_monthly_9_usd",
  amountCents: 900,
  currency: "usd",
  dailyCloudPurchases: "20",
};

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Set STRIPE_SECRET_KEY in your shell before running npm run setup:stripe.");
}

const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });

const price = await findOrCreatePrice();
const webhook = process.env.HYPEDCA_API_URL ? await findOrCreateWebhook(process.env.HYPEDCA_API_URL) : undefined;

console.log("Stripe setup complete.");
console.log(`STRIPE_PRICE_CLOUD_MONTHLY=${price.id}`);
if (webhook?.secret) {
  console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
} else if (webhook?.id) {
  console.log(`Webhook endpoint already exists: ${webhook.id}`);
  console.log("Use the existing endpoint signing secret from the Stripe Dashboard, or delete and recreate the endpoint to reveal a new one.");
} else {
  console.log("Set HYPEDCA_API_URL=https://your-api-domain and rerun to create the webhook endpoint.");
}

async function findOrCreatePrice() {
  const existingPrices = await stripe.prices.list({
    active: true,
    lookup_keys: [CLOUD_PLAN.lookupKey],
    limit: 1,
    expand: ["data.product"],
  });
  if (existingPrices.data[0]) return existingPrices.data[0];

  const product = await findOrCreateProduct();
  return stripe.prices.create(
    {
      product: product.id,
      currency: CLOUD_PLAN.currency,
      unit_amount: CLOUD_PLAN.amountCents,
      recurring: { interval: "month" },
      lookup_key: CLOUD_PLAN.lookupKey,
      nickname: CLOUD_PLAN.priceNickname,
      metadata: {
        app: "hypedca",
        plan: "cloud",
        daily_cloud_purchases: CLOUD_PLAN.dailyCloudPurchases,
      },
    },
    { idempotencyKey: `hypedca-price-${CLOUD_PLAN.lookupKey}` },
  );
}

async function findOrCreateProduct() {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((product) => product.metadata.app === "hypedca" && product.metadata.plan === "cloud");
  if (existing) return existing;

  return stripe.products.create(
    {
      name: CLOUD_PLAN.productName,
      description: "$9/month for up to 20 cloud-executed recurring purchases per day.",
      metadata: {
        app: "hypedca",
        plan: "cloud",
        daily_cloud_purchases: CLOUD_PLAN.dailyCloudPurchases,
      },
    },
    { idempotencyKey: "hypedca-product-cloud" },
  );
}

async function findOrCreateWebhook(rawApiUrl) {
  const endpointUrl = `${rawApiUrl.replace(/\/+$/, "")}/api/v1/billing/webhook`;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.data.find((endpoint) => endpoint.url === endpointUrl);
  if (existing) return { id: existing.id };

  const endpoint = await stripe.webhookEndpoints.create(
    {
      url: endpointUrl,
      enabled_events: ["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"],
      metadata: { app: "hypedca" },
    },
    { idempotencyKey: `hypedca-webhook-${endpointUrl}` },
  );
  return { id: endpoint.id, secret: endpoint.secret };
}
